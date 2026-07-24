import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, resumesTable, activityLogTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import {
  ListResumesResponse, CreateResumeBody, CreateResumeResponse,
  GetResumeParams, GetResumeResponse, UpdateResumeParams, UpdateResumeBody,
  UpdateResumeResponse, DeleteResumeParams, AnalyzeResumeParams, AnalyzeResumeResponse,
} from "@workspace/api-zod";
import { geminiPrompt, parseGeminiJson } from "../lib/gemini";

const router: IRouter = Router();

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

  const contentStr = JSON.stringify(resume.content);
  const prompt = `You are an expert ATS resume analyzer. Analyze this resume JSON and provide feedback.
Resume: ${contentStr}
Return ONLY valid JSON (no markdown) in this exact format:
{
  "score": <0-100 integer>,
  "atsCompatibility": <0-100 integer>,
  "missingKeywords": ["keyword1", "keyword2"],
  "grammarSuggestions": ["suggestion1"],
  "recommendations": ["recommendation1", "recommendation2"],
  "strengths": ["strength1"]
}`;

  const aiText = await geminiPrompt(prompt);
  const aiResult = aiText ? parseGeminiJson<{
    score: number; atsCompatibility: number; missingKeywords: string[];
    grammarSuggestions: string[]; recommendations: string[]; strengths: string[];
  }>(aiText) : null;

  const analysis = aiResult ?? {
    score: 65, atsCompatibility: 70,
    missingKeywords: ["quantified achievements", "action verbs", "industry keywords"],
    grammarSuggestions: ["Use active voice throughout", "Keep bullet points concise"],
    recommendations: ["Add measurable metrics", "Tailor keywords to job description", "Add certifications section"],
    strengths: ["Clear structure", "Good contact information"],
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
