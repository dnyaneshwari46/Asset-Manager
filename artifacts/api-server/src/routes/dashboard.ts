import { Router, type IRouter } from "express";
import { eq, avg, count, desc } from "drizzle-orm";
import { db, interviewSessionsTable, resumesTable, codingSubmissionsTable, activityLogTable, interviewAnswersTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import { GetDashboardStatsResponse, GetDashboardActivityResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/** GET /dashboard/stats */
router.get("/dashboard/stats", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;

  const [interviews, resumes, codingStats, answers] = await Promise.all([
    db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, userId)),
    db.select().from(resumesTable).where(eq(resumesTable.userId, userId)).orderBy(desc(resumesTable.updatedAt)).limit(1),
    db.select().from(codingSubmissionsTable).where(eq(codingSubmissionsTable.userId, userId)),
    db.select().from(interviewAnswersTable)
      .innerJoin(interviewSessionsTable, eq(interviewAnswersTable.interviewId, interviewSessionsTable.id))
      .where(eq(interviewSessionsTable.userId, userId)),
  ]);

  const scoredInterviews = interviews.filter(
  i => i.status === "completed" && i.technicalScore !== null
);
  const avgTech = scoredInterviews.length
    ? scoredInterviews.reduce((s, i) => s + (i.technicalScore ?? 0), 0) / scoredInterviews.length
    : null;
  const avgComm = interviews.length
    ? interviews.reduce((s, i) => s + (i.communicationScore ?? 0), 0) / interviews.filter(i => i.communicationScore !== null).length || null
    : null;
  const avgCode = codingStats.length
    ? Math.round(codingStats.reduce((s, c) => s + c.score, 0) / codingStats.length)
    : null;

  // Derive weak topics from low-scoring answers
  const topicScores: Record<string, number[]> = {};
  for (const row of answers) {
    const session = row.interview_sessions;
    const answer = row.interview_answers;
    if (!topicScores[session.category]) topicScores[session.category] = [];
    topicScores[session.category].push(answer.technicalScore);
  }
  const weakTopics = Object.entries(topicScores)
    .filter(([, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return avg < 60;
    })
    .map(([topic]) => topic);

  res.json(GetDashboardStatsResponse.parse({
    resumeScore: resumes[0]?.atsScore ?? null,
    interviewCount: interviews.filter(i => i.status === 'completed').length,
    avgTechnicalScore: avgTech && !isNaN(avgTech) ? Math.round(avgTech) : null,
    avgCommunicationScore: avgComm && !isNaN(avgComm) ? Math.round(avgComm) : null,
    avgCodingScore: avgCode ?? null,
    weakTopics,
    totalSubmissions: new Set(codingStats.map(c => c.problemId)).size,
  }));
});

/** GET /dashboard/activity */
router.get("/dashboard/activity", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const items = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.userId, userId))
    .orderBy(desc(activityLogTable.createdAt))
    .limit(20);

  res.json(GetDashboardActivityResponse.parse(
    items.map(i => ({
      id: i.id,
      type: i.type,
      title: i.title,
      description: i.description,
      score: i.score ?? null,
      createdAt: i.createdAt.toISOString(),
    }))
  ));
});

export default router;

