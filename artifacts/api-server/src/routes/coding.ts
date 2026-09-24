import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, codingProblemsTable, codingSubmissionsTable, activityLogTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import {
  ListCodingProblemsQueryParams, ListCodingProblemsResponse,
  GetCodingProblemParams, GetCodingProblemResponse,
  ListCodingSubmissionsResponse, SubmitCodeBody, SubmitCodeResponse,
} from "@workspace/api-zod";
import { geminiPrompt, parseGeminiJson } from "../lib/gemini";
import { submitToJudge0, JUDGE0_LANGUAGE_IDS } from "../lib/code-execution/judge0";
import { buildHarness, extractResult, valuesEqual } from "../lib/code-execution/harness";

const router: IRouter = Router();

function serializeProblem(p: typeof codingProblemsTable.$inferSelect) {
  return {
    id: p.id, title: p.title, description: p.description, difficulty: p.difficulty,
    languages: p.languages, starterCode: p.starterCode as Record<string, unknown>,
    examples: p.examples as Record<string, unknown>[],
    constraints: p.constraints ?? null, timeLimit: p.timeLimit,
  };
}

router.get("/coding-problems", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = ListCodingProblemsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = db.select().from(codingProblemsTable).$dynamic();
  if (params.data.difficulty) query = query.where(eq(codingProblemsTable.difficulty, params.data.difficulty));
  const rows = await query;
  res.json(ListCodingProblemsResponse.parse(rows.map(serializeProblem)));
});

router.get("/coding-problems/:id", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = GetCodingProblemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [problem] = await db.select().from(codingProblemsTable).where(eq(codingProblemsTable.id, params.data.id));
  if (!problem) { res.status(404).json({ error: "Problem not found" }); return; }
  res.json(GetCodingProblemResponse.parse(serializeProblem(problem)));
});

router.get("/coding-submissions", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const rows = await db.select().from(codingSubmissionsTable).where(eq(codingSubmissionsTable.userId, userId));
  res.json(ListCodingSubmissionsResponse.parse(rows.map(s => ({
    id: s.id, userId: s.userId, problemId: s.problemId, language: s.language,
    code: s.code, score: s.score, passed: s.passed,
    testsPassed: s.testsPassed, testsTotal: s.testsTotal,
    aiReview: s.aiReview, complexity: s.complexity,
    suggestions: (s.suggestions as string[]) ?? [],
    createdAt: s.createdAt.toISOString(),
  }))));
});

router.post("/coding-submissions", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const body = SubmitCodeBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const userId = req.dbUser!.id;

  const [problem] = await db.select().from(codingProblemsTable).where(eq(codingProblemsTable.id, body.data.problemId));
  if (!problem) { res.status(404).json({ error: "Problem not found" }); return; }

  const testCases = (problem.testCases as { input: string; expected: string }[]) ?? [];
  const language = body.data.language as keyof typeof JUDGE0_LANGUAGE_IDS;
  const languageId = JUDGE0_LANGUAGE_IDS[language];

  if (!languageId) {
    res.status(400).json({ error: `Unsupported language: ${body.data.language}` });
    return;
  }

  let testsPassed = 0;
  let firstError = "";

  for (const testCase of testCases) {
    try {
      const harness = buildHarness(
        problem.title,
        language,
        body.data.code,
        testCase.input,
      );

      const execution = await submitToJudge0({
        languageId,
        sourceCode: harness,
        cpuTimeLimit: 5,
        wallTimeLimit: 10,
        memoryLimit: 256000,
      });

      if (execution.status.id === 3) {
        const actual = extractResult(execution.stdout);

        if (actual !== null && valuesEqual(actual, testCase.expected)) {
          testsPassed++;
        } else if (!firstError) {
          firstError = `Expected ${testCase.expected}, but received ${actual ?? "no result"}.`;
        }
      } else if (!firstError) {
        firstError =
          execution.stderr ||
          execution.compile_output ||
          execution.message ||
          execution.status.description;
      }
    } catch (error) {
      if (!firstError) {
        firstError = error instanceof Error ? error.message : "Code execution failed.";
      }
    }
  }

  const testsTotal = testCases.length;
  const score = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;
  const passed = testsTotal > 0 && testsPassed === testsTotal;

  const reviewPrompt = `You are reviewing a coding solution after deterministic execution.

Problem: ${problem.title}
Description: ${problem.description}
Language: ${body.data.language}

Deterministic test result:
- Tests passed: ${testsPassed}/${testsTotal}
- Score: ${score}/100
- All tests passed: ${passed}
${firstError ? `- First execution error: ${firstError}` : ""}

Code:
${body.data.code}

Return ONLY valid JSON:
{
  "aiReview": "Detailed code review paragraph",
  "complexity": "Time: O(...), Space: O(...)",
  "suggestions": ["improvement 1", "improvement 2", "improvement 3"]
}`;

  const aiText = await geminiPrompt(reviewPrompt);

  const review = aiText
    ? parseGeminiJson<{
        aiReview: string;
        complexity: string;
        suggestions: string[];
      }>(aiText)
    : null;

  const result = {
    score,
    passed,
    testsPassed,
    testsTotal,
    aiReview:
      review?.aiReview ??
      (passed
        ? "All tests passed. Review the solution for readability, edge cases, and efficiency."
        : firstError ||
          "Some tests failed. Review the failing case and check edge cases."),
    complexity:
      review?.complexity ?? "Complexity analysis unavailable.",
    suggestions:
      review?.suggestions ?? [
        "Review edge cases.",
        "Check time and space complexity.",
        "Improve readability where possible.",
      ],
  };
  const [submission] = await db.insert(codingSubmissionsTable).values({
    userId, problemId: body.data.problemId, language: body.data.language,
    code: body.data.code, ...result, suggestions: result.suggestions,
  }).returning();

  await db.insert(activityLogTable).values({
    userId, type: "coding", title: "Code Submitted",
    description: `${problem.title} â€” ${body.data.language}`, score: result.score,
  });

  res.status(201).json(SubmitCodeResponse.parse({
    id: submission.id, userId: submission.userId, problemId: submission.problemId,
    language: submission.language, code: submission.code, score: submission.score,
    passed: submission.passed, testsPassed: submission.testsPassed, testsTotal: submission.testsTotal,
    aiReview: submission.aiReview, complexity: submission.complexity,
    suggestions: (submission.suggestions as string[]) ?? [],
    createdAt: submission.createdAt.toISOString(),
  }));
});

export default router;


