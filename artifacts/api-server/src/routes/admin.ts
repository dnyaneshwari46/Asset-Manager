import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, interviewSessionsTable, resumesTable, codingSubmissionsTable } from "@workspace/db";
import { requireAuth, resolveDbUser, requireAdmin } from "../lib/auth";
import { AdminListUsersResponse, AdminDeleteUserParams, GetAdminAnalyticsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/users", requireAuth, resolveDbUser, requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const result = await Promise.all(users.map(async (u) => {
    const [interviews, resumes] = await Promise.all([
      db.select({ id: interviewSessionsTable.id }).from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, u.id)),
      db.select({ id: resumesTable.id }).from(resumesTable).where(eq(resumesTable.userId, u.id)),
    ]);
    return {
      id: u.id, clerkId: u.clerkId, email: u.email, name: u.name, role: u.role,
      interviewCount: interviews.length, resumeCount: resumes.length,
      createdAt: u.createdAt.toISOString(),
    };
  }));
  res.json(AdminListUsersResponse.parse(result));
});

router.delete("/admin/users/:id", requireAuth, resolveDbUser, requireAdmin, async (req, res): Promise<void> => {
  const params = AdminDeleteUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.clerkId, params.data.id)).returning();
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
  res.sendStatus(204);
});

router.get("/admin/analytics", requireAuth, resolveDbUser, requireAdmin, async (req, res): Promise<void> => {
  const [users, interviews, resumes, submissions] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(interviewSessionsTable),
    db.select().from(resumesTable),
    db.select().from(codingSubmissionsTable),
  ]);

  const completedInterviews = interviews.filter(i => i.technicalScore !== null);
  const avgScore = completedInterviews.length
    ? completedInterviews.reduce((s, i) => s + (i.technicalScore ?? 0), 0) / completedInterviews.length
    : 0;

  // Simple weekly user growth (last 8 weeks)
  const now = Date.now();
  const userGrowth = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now - (7 - i) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now - (6 - i) * 7 * 24 * 60 * 60 * 1000);
    return {
      week: `W${i + 1}`,
      users: users.filter(u => u.createdAt >= weekStart && u.createdAt < weekEnd).length,
    };
  });

  res.json(GetAdminAnalyticsResponse.parse({
    totalUsers: users.length, totalInterviews: interviews.length,
    totalResumes: resumes.length, totalSubmissions: submissions.length,
    avgInterviewScore: Math.round(avgScore),
    userGrowth,
  }));
});

export default router;
