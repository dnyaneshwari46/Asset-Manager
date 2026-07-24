import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, interviewSessionsTable, interviewAnswersTable, questionsTable, activityLogTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import {
  ListInterviewsResponse, CreateInterviewBody, CreateInterviewResponse,
  GetInterviewParams, GetInterviewResponse, DeleteInterviewParams,
  SubmitAnswerParams, SubmitAnswerBody, SubmitAnswerResponse,
} from "@workspace/api-zod";
import { geminiPrompt, parseGeminiJson } from "../lib/gemini";

const router: IRouter = Router();

function serializeSession(s: typeof interviewSessionsTable.$inferSelect) {
  return {
    id: s.id, userId: s.userId, category: s.category, difficulty: s.difficulty,
    status: s.status, technicalScore: s.technicalScore ?? null,
    communicationScore: s.communicationScore ?? null, confidenceScore: s.confidenceScore ?? null,
    questionsAsked: s.questionsAsked, answersGiven: s.answersGiven,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/interviews", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const rows = await db.select().from(interviewSessionsTable)
    .where(eq(interviewSessionsTable.userId, userId));
  res.json(ListInterviewsResponse.parse(rows.map(serializeSession)));
});

router.post("/interviews", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const parsed = CreateInterviewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.dbUser!.id;

  // Count questions for this category/difficulty
  const questions = await db.select({ id: questionsTable.id })
    .from(questionsTable)
    .where(and(eq(questionsTable.category, parsed.data.category), eq(questionsTable.difficulty, parsed.data.difficulty)));

  const [session] = await db.insert(interviewSessionsTable).values({
    userId, category: parsed.data.category, difficulty: parsed.data.difficulty,
    questionsAsked: questions.length,
  }).returning();

  await db.insert(activityLogTable).values({
    userId, type: "interview", title: "Interview Started",
    description: `${parsed.data.category} (${parsed.data.difficulty})`,
  });

  res.status(201).json(CreateInterviewResponse.parse(serializeSession(session)));
});

router.get("/interviews/:id", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = GetInterviewParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.dbUser!.id;
  const [session] = await db.select().from(interviewSessionsTable)
    .where(and(eq(interviewSessionsTable.id, params.data.id), eq(interviewSessionsTable.userId, userId)));
  if (!session) { res.status(404).json({ error: "Interview not found" }); return; }
  res.json(GetInterviewResponse.parse(serializeSession(session)));
});

router.delete("/interviews/:id", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = DeleteInterviewParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.dbUser!.id;
  const [deleted] = await db.delete(interviewSessionsTable)
    .where(and(eq(interviewSessionsTable.id, params.data.id), eq(interviewSessionsTable.userId, userId))).returning();
  if (!deleted) { res.status(404).json({ error: "Interview not found" }); return; }
  res.sendStatus(204);
});

router.post("/interviews/:id/answers", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = SubmitAnswerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = SubmitAnswerBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const userId = req.dbUser!.id;

  const [session] = await db.select().from(interviewSessionsTable)
    .where(and(eq(interviewSessionsTable.id, params.data.id), eq(interviewSessionsTable.userId, userId)));
  if (!session) { res.status(404).json({ error: "Interview not found" }); return; }

  const [question] = await db.select().from(questionsTable)
    .where(eq(questionsTable.id, body.data.questionId));
  if (!question) { res.status(404).json({ error: "Question not found" }); return; }

  // AI evaluation via Gemini
  const prompt = `You are a senior interviewer at a top tech company (Google/Amazon/Meta level).
Evaluate this interview answer and return ONLY valid JSON (no markdown).

Question: ${question.text}
Category: ${question.category}
Difficulty: ${question.difficulty}
Candidate's Answer: ${body.data.answer}
Sample Answer (reference only): ${question.sampleAnswer ?? "N/A"}

Return this exact JSON format:
{
  "technicalScore": <0-100>,
  "communicationScore": <0-100>,
  "confidenceScore": <0-100>,
  "correctAnswer": "A clear, complete ideal answer",
  "feedback": "Constructive paragraph feedback",
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"]
}`;

  const aiText = await geminiPrompt(prompt);
  const evaluation = aiText ? parseGeminiJson<{
    technicalScore: number; communicationScore: number; confidenceScore: number;
    correctAnswer: string; feedback: string; improvements: string[];
  }>(aiText) : null;

  const eval_ = evaluation ?? {
    technicalScore: 60, communicationScore: 65, confidenceScore: 60,
    correctAnswer: question.sampleAnswer ?? "A comprehensive answer addressing all aspects of the question.",
    feedback: "Your answer shows understanding of the topic. Focus on providing more specific examples and quantifiable results.",
    improvements: ["Use the STAR method (Situation, Task, Action, Result)", "Provide concrete examples", "Be more concise"],
  };

  const [answer] = await db.insert(interviewAnswersTable).values({
    interviewId: params.data.id, questionId: body.data.questionId,
    answer: body.data.answer, ...eval_,
    improvements: eval_.improvements,
  }).returning();

  // Update session scores
  const allAnswers = await db.select().from(interviewAnswersTable)
    .where(eq(interviewAnswersTable.interviewId, params.data.id));
  const avgTech = allAnswers.reduce((s, a) => s + a.technicalScore, 0) / allAnswers.length;
  const avgComm = allAnswers.reduce((s, a) => s + a.communicationScore, 0) / allAnswers.length;
  const avgConf = allAnswers.reduce((s, a) => s + a.confidenceScore, 0) / allAnswers.length;

  await db.update(interviewSessionsTable).set({
    answersGiven: allAnswers.length,
    technicalScore: avgTech, communicationScore: avgComm, confidenceScore: avgConf,
    status: "active",
  }).where(eq(interviewSessionsTable.id, params.data.id));

  await db.insert(activityLogTable).values({
    userId, type: "interview", title: "Answer Submitted",
    description: `${session.category} interview answer evaluated`, score: eval_.technicalScore,
  });

  res.status(201).json(SubmitAnswerResponse.parse({
    id: answer.id, interviewId: answer.interviewId, questionId: answer.questionId,
    answer: answer.answer, technicalScore: answer.technicalScore,
    communicationScore: answer.communicationScore, confidenceScore: answer.confidenceScore,
    correctAnswer: answer.correctAnswer, feedback: answer.feedback,
    improvements: (answer.improvements as string[]) ?? [],
  }));
});

export default router;
