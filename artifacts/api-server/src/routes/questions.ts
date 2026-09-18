import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, questionsTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import { ListQuestionsQueryParams, ListQuestionsResponse } from "@workspace/api-zod";
import { ensureRoleQuestions } from "../lib/role-question-bank";

const router: IRouter = Router();

router.get("/questions", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = ListQuestionsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (params.data.category && params.data.difficulty) {
    await ensureRoleQuestions(params.data.category, params.data.difficulty);
  }

  let query = db.select().from(questionsTable).$dynamic();

  if (params.data.category) {
    query = query.where(eq(questionsTable.category, params.data.category));
  }
  if (params.data.difficulty) {
    query = query.where(eq(questionsTable.difficulty, params.data.difficulty));
  }
  if (params.data.limit) {
    query = query.limit(params.data.limit);
  }

  const rows = await query;
  res.json(ListQuestionsResponse.parse(rows.map(q => ({
    id: q.id, category: q.category, difficulty: q.difficulty,
    text: q.text, type: q.type, sampleAnswer: q.sampleAnswer ?? null,
    tags: q.tags ?? [],
  }))));
});

export default router;
