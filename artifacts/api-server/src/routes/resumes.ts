import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, resumesTable, activityLogTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import {
  ListResumesResponse, CreateResumeBody, CreateResumeResponse,
  GetResumeParams, GetResumeResponse, UpdateResumeParams, UpdateResumeBody,
  UpdateResumeResponse, DeleteResumeParams, AnalyzeResumeParams, AnalyzeResumeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseSaveResumeReportBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const resumeName = typeof value.resumeName === "string" ? value.resumeName.trim() : "";
  const extractedText = typeof value.extractedText === "string" ? value.extractedText : "";
  const atsScore = value.atsScore;
  const issues = value.issues;
  const savedAt = value.savedAt;
  if (!resumeName || resumeName.length > 200 || extractedText.length > 500_000) return null;
  if (typeof atsScore !== "number" || !Number.isInteger(atsScore) || atsScore < 0 || atsScore > 100) return null;
  if (!Array.isArray(issues) || issues.length > 100 || issues.some((issue) => typeof issue !== "string" || issue.length > 500)) return null;
  if (savedAt !== undefined && (typeof savedAt !== "string" || Number.isNaN(Date.parse(savedAt)))) return null;
  return { resumeName, extractedText, atsScore, issues: issues as string[], savedAt: savedAt as string | undefined };
}

function serializeResume(r: typeof resumesTable.$inferSelect) {
  return {
    id: r.id, userId: r.userId, title: r.title, template: r.template,
    content: r.content as Record<string, unknown>,
    atsScore: r.atsScore ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/resumes", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const rows = await db.select().from(resumesTable).where(eq(resumesTable.userId, userId));
  res.json(ListResumesResponse.parse(rows.map(serializeResume)));
});

router.post("/resumes", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const parsed = CreateResumeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.dbUser!.id;
  const [resume] = await db.insert(resumesTable).values({ ...parsed.data, userId }).returning();
  await db.insert(activityLogTable).values({ userId, type: "resume", title: "Resume Created", description: `Created "${resume.title}"` });
  res.status(201).json(CreateResumeResponse.parse(serializeResume(resume)));
});

router.post("/resume/save", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const parsed = parseSaveResumeReportBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid ATS report payload" });
    return;
  }

  const userId = req.dbUser!.id;
  const report = {
    type: "ats-report",
    fileName: parsed.resumeName,
    extractedText: parsed.extractedText,
    issues: parsed.issues,
    savedAt: parsed.savedAt ?? new Date().toISOString(),
  };
  const [resume] = await db.insert(resumesTable).values({
    userId,
    title: parsed.resumeName,
    template: "classic",
    content: report,
    atsScore: parsed.atsScore,
  }).returning();

  await db.insert(activityLogTable).values({
    userId,
    type: "resume",
    title: "ATS Report Saved",
    description: `${parsed.resumeName} scored ${parsed.atsScore}/100`,
    score: parsed.atsScore,
  });

  res.status(201).json(serializeResume(resume));
});

router.get("/resumes/:id", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = GetResumeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.dbUser!.id;
  const [resume] = await db.select().from(resumesTable)
    .where(and(eq(resumesTable.id, params.data.id), eq(resumesTable.userId, userId)));
  if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
  res.json(GetResumeResponse.parse(serializeResume(resume)));
});

router.patch("/resumes/:id", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = UpdateResumeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateResumeBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const userId = req.dbUser!.id;
  const [resume] = await db.update(resumesTable).set(body.data)
    .where(and(eq(resumesTable.id, params.data.id), eq(resumesTable.userId, userId))).returning();
  if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
  res.json(UpdateResumeResponse.parse(serializeResume(resume)));
});

router.delete("/resumes/:id", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = DeleteResumeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.dbUser!.id;
  const [deleted] = await db.delete(resumesTable)
    .where(and(eq(resumesTable.id, params.data.id), eq(resumesTable.userId, userId))).returning();
  if (!deleted) { res.status(404).json({ error: "Resume not found" }); return; }
  res.sendStatus(204);
});

router.post("/resumes/:id/analyze", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = AnalyzeResumeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.dbUser!.id;
  const [resume] = await db.select().from(resumesTable)
    .where(and(eq(resumesTable.id, params.data.id), eq(resumesTable.userId, userId)));
  if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }

  const content = (resume.content || {}) as Record<string, any>;
  const summaryWords = String(content.summary || "").trim().split(/\s+/).filter(Boolean);
  const experience = Array.isArray(content.experience) ? content.experience : [];
  const education = Array.isArray(content.education) ? content.education : [];
  const skills = Array.isArray(content.skills) ? content.skills.filter(Boolean) : [];
  const bulletCount = experience.reduce((total: number, item: any) =>
    total + String(item?.description || "").split(/\n|[•]/).map((line: string) => line.trim()).filter(Boolean).length, 0);
  const searchableText = JSON.stringify(content).toLowerCase();
  const hasPlaceholder = /sdffghjk|lorem ipsum|your name|example\.com|test test/.test(searchableText);
  const hasEmptyFields = !content.personalDetails?.name ||
    experience.some((item: any) => !item?.jobTitle && !item?.title) ||
    education.some((item: any) => !item?.degree && !item?.title);
  let score = 0;
  const strengths: string[] = [];
  const recommendations: string[] = [];
  if (summaryWords.length > 20) { score += 20; strengths.push("Professional summary has strong detail."); }
  else recommendations.push("Expand your summary to more than 20 words.");
  if (bulletCount >= 2) { score += 20; strengths.push("Experience includes multiple achievement bullets."); }
  else recommendations.push("Add at least two experience bullet points.");
  if (skills.length >= 5) { score += 20; strengths.push("Skills section has a useful range of keywords."); }
  else recommendations.push("Add at least five relevant skills.");
  if (!hasPlaceholder && !hasEmptyFields) { score += 20; strengths.push("Resume fields are complete and free of placeholder text."); }
  else recommendations.push("Complete empty fields and replace placeholder text.");
  if (education.some((item: any) => item?.degree || item?.title || item?.institution || item?.school)) {
    score += 20; strengths.push("Education details are included.");
  } else recommendations.push("Add your education details.");
  const analysis = {
    score,
    atsCompatibility: score,
    missingKeywords: [],
    grammarSuggestions: [],
    recommendations,
    strengths,
  };

  // Save ATS score back
  await db.update(resumesTable).set({ atsScore: analysis.score })
    .where(eq(resumesTable.id, resume.id));
  await db.insert(activityLogTable).values({
    userId, type: "resume", title: "Resume Analyzed",
    description: `ATS score: ${analysis.score}/100 for "${resume.title}"`, score: analysis.score,
  });

  res.json(AnalyzeResumeResponse.parse(analysis));
});

export default router;
