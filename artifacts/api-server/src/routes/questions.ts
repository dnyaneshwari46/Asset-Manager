import { Router, type IRouter } from "express";
import { eq, and, inArray, asc } from "drizzle-orm";
import { db, questionsTable, interviewSessionsTable, interviewAnswersTable, interviewQuestionsTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import { ListQuestionsQueryParams, ListQuestionsResponse } from "@workspace/api-zod";
import { ensureRoleQuestions } from "../lib/role-question-bank";
import { geminiPrompt, parseGeminiJson } from "../lib/gemini";

const router: IRouter = Router();

router.get("/questions", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = ListQuestionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const category = params.data.category;
  const difficulty = params.data.difficulty;
  const interviewId = params.data.interviewId;

  if (interviewId) {
    const [session] = await db
      .select({ id: interviewSessionsTable.id })
      .from(interviewSessionsTable)
      .where(and(
        eq(interviewSessionsTable.id, interviewId),
        eq(interviewSessionsTable.userId, req.dbUser!.id),
      ))
      .limit(1);

    if (!session) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    const assignedRows = await db
      .select({ question: questionsTable })
      .from(interviewQuestionsTable)
      .innerJoin(
        questionsTable,
        eq(interviewQuestionsTable.questionId, questionsTable.id),
      )
      .where(eq(interviewQuestionsTable.interviewId, interviewId))
      .orderBy(asc(interviewQuestionsTable.position));

    const limitedAssignedRows = assignedRows
      .map((row) => row.question)
      .slice(0, params.data.limit || 50);

    res.json(ListQuestionsResponse.parse(limitedAssignedRows.map((q) => ({
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      text: q.text,
      type: q.type,
      sampleAnswer: q.sampleAnswer ?? null,
      tags: q.tags ?? [],
    }))));

    return;
  }

  if (category && difficulty) {
    await ensureRoleQuestions(category, difficulty);
  }

  let query = db.select().from(questionsTable).$dynamic();

  if (category) {
    query = query.where(eq(questionsTable.category, category));
  }
  if (difficulty) {
    query = query.where(eq(questionsTable.difficulty, difficulty));
  }

  const rows = await query;

  let availableRows = rows;

  if (category && difficulty) {
    const userId = req.dbUser!.id;

    const completedSessions = await db
      .select({ id: interviewSessionsTable.id })
      .from(interviewSessionsTable)
      .where(and(
        eq(interviewSessionsTable.userId, userId),
        eq(interviewSessionsTable.category, category),
        eq(interviewSessionsTable.difficulty, difficulty),
        eq(interviewSessionsTable.status, "completed"),
      ));

    const completedAnswers = completedSessions.length
      ? await db
          .select({ questionId: interviewAnswersTable.questionId })
          .from(interviewAnswersTable)
          .where(inArray(
            interviewAnswersTable.interviewId,
            completedSessions.map((session) => session.id),
          ))
      : [];

    const usedQuestionIds = new Set(
      completedAnswers.map((answer) => answer.questionId),
    );

    availableRows = rows.filter((question) => !usedQuestionIds.has(question.id));

    if (availableRows.length < 15) {
      const existingTexts = new Set(
        rows.map((question) => question.text.trim().toLowerCase()),
      );

      const prompt = [
        `Generate 15 NEW mock interview questions.`,
        `Domain: ${category}.`,
        `Difficulty: ${difficulty}.`,
        `The questions must be strictly related to this domain.`,
        `Do not repeat or closely rephrase any existing question.`,
        `Use a balanced mix of technical, scenario, and behavioral questions.`,
        `Return ONLY valid JSON.`,
        `Each item must contain: text, type, tags, sampleAnswer.`,
        `type must be exactly "technical", "scenario", or "behavioral".`,
        `tags must be an array of strings.`,
        `sampleAnswer must be a concise model answer.`,
        `Existing questions: ${rows.map((question) => question.text).join(" | ")}`,
      ].join("\n");

      const generatedText = await geminiPrompt(prompt);
      const generated = generatedText
        ? parseGeminiJson<Array<{
            text?: string;
            type?: string;
            tags?: string[];
            sampleAnswer?: string;
          }>>(generatedText)
        : null;

      if (Array.isArray(generated)) {
        const freshQuestions = generated
          .map((item) => ({
            text: String(item.text || "").trim(),
            type: String(item.type || "").trim(),
            tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
            sampleAnswer: String(item.sampleAnswer || "").trim(),
          }))
          .filter((item) => {
            const normalizedText = item.text.toLowerCase();
            return (
              item.text.length > 10 &&
              !existingTexts.has(normalizedText) &&
              ["technical", "scenario", "behavioral"].includes(item.type)
            );
          })
          .slice(0, 15);

        if (freshQuestions.length) {
          const inserted = await db
            .insert(questionsTable)
            .values(
              freshQuestions.map((question) => ({
                category,
                difficulty,
                text: question.text,
                type: question.type,
                tags: question.tags,
                sampleAnswer: question.sampleAnswer,
              })),
            )
            .returning();

          availableRows = [
            ...availableRows,
            ...inserted,
          ];
        }
      }
    }

    // If Gemini generated enough new questions, use them.
    // If generation was unavailable, reuse the existing domain pool so
    // the interview remains usable instead of showing no questions.
    if (availableRows.length === 0) {
      availableRows = rows;
    }
  }

  const limitedRows = availableRows.slice(0, params.data.limit || 50);

  res.json(ListQuestionsResponse.parse(limitedRows.map((q) => ({
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    text: q.text,
    type: q.type,
    sampleAnswer: q.sampleAnswer ?? null,
    tags: q.tags ?? [],
  }))));
});

export default router;

