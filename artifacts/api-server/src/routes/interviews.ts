import { Router, type IRouter } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import { db, interviewSessionsTable, interviewAnswersTable, questionsTable, activityLogTable, resumesTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import {
  ListInterviewsResponse, CreateInterviewBody, CreateInterviewResponse,
  GetInterviewParams, GetInterviewResponse, DeleteInterviewParams,
  SubmitAnswerParams, SubmitAnswerBody, SubmitAnswerResponse, AbandonInterviewParams,
} from "@workspace/api-zod";
import { geminiPrompt, parseGeminiJson } from "../lib/gemini";
import { ensureRoleQuestions } from "../lib/role-question-bank";

const router: IRouter = Router();

const ROLE_LABELS: Record<string, string> = {
  java: "Java Developer",
  python: "Python Developer",
  mern: "Frontend / React Developer",
  fullstack: "Backend / Full Stack Engineer",
  data_analyst: "Data Analyst",
  data_science: "Data Scientist",
  ai_ml: "AI / ML Engineer",
  hr: "Behavioral / HR",
};

const ROLE_GUIDANCE: Record<string, string> = {
  java: "Core Java and fresher-friendly Spring/Hibernate themes: OOP, collections, exceptions, strings, Java 8+, JVM and memory, threading, REST, and practical project decisions.",
  python: "Practical Python themes: data structures, functions, OOP, exceptions, decorators, generators, testing, APIs, Django or Flask, and explainable project decisions.",
  mern: "JavaScript, React, HTML/CSS, browser behavior, API integration, state management, testing, accessibility, and practical debugging or project trade-offs.",
  fullstack: "REST APIs, authentication, databases and SQL, backend design, frontend/backend integration, testing, deployment, and practical debugging scenarios.",
  data_analyst: "SQL, data cleaning, spreadsheet or Power BI thinking, metrics, dashboards, communicating insights, and realistic business scenarios.",
  data_science: "Python, statistics, data preparation, feature engineering, model evaluation, experiment design, SQL, and communicating model results.",
  ai_ml: "Python, ML fundamentals, data preparation, evaluation, model trade-offs, deployment, monitoring, and responsible AI scenarios.",
  hr: "Introduction, project ownership, teamwork, conflict, strengths, learning, motivation, career goals, and clear STAR-style storytelling.",
};

function clampScore(value: unknown, fallback: number) {
  const score = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(0, Math.min(100, score));
}

function createFallbackEvaluation(question: typeof questionsTable.$inferSelect, answer: string) {
  const cleanAnswer = answer.trim();
  const words = cleanAnswer.split(/\s+/).filter(Boolean);
  const lowerAnswer = cleanAnswer.toLowerCase();
  const refusal = /^(sorry|i don't know|i do not know|not sure|can't answer|cannot answer|no idea|i will tell you later)/i.test(cleanAnswer)
    || lowerAnswer.includes("not prepared")
    || lowerAnswer.includes("not prepare");
  const questionTopics = (question.tags || [])
    .filter((tag) => !["technical", "scenario", "behavioral", "project", "reasoning"].includes(tag))
    .slice(0, 4)
    .join(", ");
  const topicText = questionTopics || question.category;

  if (refusal || words.length < 8) {
    return {
      technicalScore: 10,
      communicationScore: words.length < 4 ? 15 : 25,
      confidenceScore: 15,
      correctAnswer: `A stronger answer should address ${topicText}. Start with the main idea, connect it to the question, and give one concrete example or trade-off.`,
      feedback: `This response did not answer the question about ${topicText}. Saying that you are not prepared gives the interviewer no evidence of your understanding. A better response would state what you know, explain your approach, and be honest about the part you would verify.`,
      improvements: [
        `Review ${topicText} before the next attempt`,
        "Use a simple definition followed by a project example",
        "If unsure, explain your reasoning instead of stopping at “I don't know”",
      ],
    };
  }

  const answerTokens = new Set(lowerAnswer.split(/[^a-z0-9+#.]+/).filter((token) => token.length > 2));
  const topicMatches = (question.tags || []).filter((tag) => answerTokens.has(tag.toLowerCase())).length;
  const detailBonus = words.length >= 35 ? 15 : words.length >= 18 ? 8 : 0;
  const relevanceBonus = Math.min(30, topicMatches * 10);
  const technicalScore = Math.min(75, 25 + detailBonus + relevanceBonus);
  return {
    technicalScore,
    communicationScore: Math.min(78, words.length >= 18 ? 58 + Math.min(20, Math.floor(words.length / 10)) : 42),
    confidenceScore: Math.min(72, words.length >= 18 ? 55 : 38),
    correctAnswer: `A strong answer should cover ${topicText}, explain the decision or process clearly, and connect it to a practical example.`,
    feedback: `The evaluator was unavailable, so this answer received a conservative review. Your response had enough detail to continue, but it should connect more directly to ${topicText} and include the reasoning behind your approach.`,
    improvements: [
      `Use the key terms related to ${topicText}`,
      "Explain why you would choose that approach",
      "Add one concrete example, result, or trade-off",
    ],
  };
}

function serializeSession(s: typeof interviewSessionsTable.$inferSelect) {
  return {
    id: s.id, userId: s.userId, category: s.category, difficulty: s.difficulty,
    status: s.status, technicalScore: s.technicalScore ?? null,
    communicationScore: s.communicationScore ?? null, confidenceScore: s.confidenceScore ?? null,
    questionsAsked: s.questionsAsked, answersGiven: s.answersGiven,
    createdAt: s.createdAt.toISOString(),
  };
}

async function getAnsweredQuestionIds(interviewId: number) {
  const rows = await db.select({ questionId: interviewAnswersTable.questionId })
    .from(interviewAnswersTable)
    .where(eq(interviewAnswersTable.interviewId, interviewId));
  return rows.map((row) => row.questionId);
}

async function normalizeSession(session: typeof interviewSessionsTable.$inferSelect) {
  const answeredQuestionIds = await getAnsweredQuestionIds(session.id);
  const questionsAsked = Math.max(15, session.questionsAsked);
  const status = answeredQuestionIds.length < questionsAsked && session.status === "completed"
    ? "active"
    : session.status;

  if (questionsAsked !== session.questionsAsked || status !== session.status) {
    const [updated] = await db.update(interviewSessionsTable)
      .set({ questionsAsked, answersGiven: answeredQuestionIds.length, status })
      .where(eq(interviewSessionsTable.id, session.id))
      .returning();
    return { session: updated, answeredQuestionIds };
  }

  return { session, answeredQuestionIds };
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
  const questions = await ensureRoleQuestions(parsed.data.category, parsed.data.difficulty);

  // Count questions for this category/difficulty
  const [session] = await db.insert(interviewSessionsTable).values({
    userId, category: parsed.data.category, difficulty: parsed.data.difficulty,
    questionsAsked: Math.min(15, questions.length),
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
  const normalized = await normalizeSession(session);
  res.json(GetInterviewResponse.parse({
    ...serializeSession(normalized.session),
    answeredQuestionIds: normalized.answeredQuestionIds,
  }));
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

router.post("/interviews/:id/abandon", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const params = AbandonInterviewParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.dbUser!.id;
  const [session] = await db.select().from(interviewSessionsTable)
    .where(and(eq(interviewSessionsTable.id, params.data.id), eq(interviewSessionsTable.userId, userId)));
  if (!session) { res.status(404).json({ error: "Interview not found" }); return; }

  if (session.status === "active") {
    const [abandoned] = await db.update(interviewSessionsTable)
      .set({ status: "abandoned" })
      .where(eq(interviewSessionsTable.id, session.id))
      .returning();
    res.json(serializeSession(abandoned));
    return;
  }

  res.json(serializeSession(session));
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
  const normalized = await normalizeSession(session);
  if (normalized.session.status !== "active") {
    const message = normalized.session.status === "completed"
      ? "This interview is already completed"
      : "This interview is closed";
    res.status(409).json({ error: message }); return;
  }

  const [question] = await db.select().from(questionsTable)
    .where(and(
      eq(questionsTable.id, body.data.questionId),
      eq(questionsTable.category, normalized.session.category),
      eq(questionsTable.difficulty, normalized.session.difficulty),
    ));
  if (!question) { res.status(404).json({ error: "Question not found" }); return; }

  const [existingAnswer] = await db.select({ id: interviewAnswersTable.id })
    .from(interviewAnswersTable)
    .where(and(
      eq(interviewAnswersTable.interviewId, params.data.id),
      eq(interviewAnswersTable.questionId, body.data.questionId),
    ))
    .limit(1);
  if (existingAnswer) {
    res.status(409).json({ error: "This question has already been answered" }); return;
  }

  const [latestResume] = await db.select().from(resumesTable)
    .where(eq(resumesTable.userId, userId))
    .orderBy(desc(resumesTable.updatedAt))
    .limit(1);
  const resumeContent = (latestResume?.content || {}) as Record<string, unknown>;
  const resumeContext = JSON.stringify({
    targetRole: resumeContent.targetRole,
    skills: resumeContent.skills,
    experience: resumeContent.experience,
    summary: resumeContent.summary,
  }).slice(0, 6000);
  const jobRole = ROLE_LABELS[normalized.session.category] ?? normalized.session.category;
  const roleGuidance = ROLE_GUIDANCE[normalized.session.category] ?? "Use practical role-specific concepts, project explanations, debugging, and communication scenarios.";
  const priorAnswers = await db.select().from(interviewAnswersTable)
    .where(eq(interviewAnswersTable.interviewId, params.data.id));
  const priorQuestionIds = priorAnswers.map((item) => item.questionId);
  const priorQuestions = priorQuestionIds.length
    ? await db.select({ id: questionsTable.id, text: questionsTable.text })
      .from(questionsTable)
      .where(inArray(questionsTable.id, priorQuestionIds))
    : [];
  const priorQuestionText = new Map(priorQuestions.map((item) => [item.id, item.text]));
  const conversationContext = priorAnswers
    .slice(-5)
    .map((item, index) => `Previous ${index + 1}: Question: ${priorQuestionText.get(item.questionId) ?? "Role question"} | Answer: ${item.answer}`)
    .join("\n")
    .slice(0, 7000) || "No previous answers. This is the first response.";

  // AI evaluation via Gemini
  const prompt = `You are a supportive senior interviewer conducting a realistic ${jobRole} interview.
Use a practical mock-interview style inspired by public interview preparation patterns: begin with role fundamentals, move into hands-on or project reasoning, then use realistic workplace and communication scenarios. Diagnose the candidate's current gap and make the next focus useful instead of repeating a generic question.
Role guidance: ${roleGuidance}
The interview plan has 15 questions total: 5 technical, 5 scenario-based, and 5 behavioral questions.
Evaluate the current answer in context of the previous questions and answers. Give partial credit for correct reasoning, a sensible approach, and honest project experience. Do not demand exact textbook wording or memorized numeric values.
Your feedback must cite evidence from the candidate's actual answer. Distinguish what they got right from what is missing. Do not praise claims the candidate did not make. For a short or unclear answer, say exactly what detail would make it interview-ready.
Write feedback like a real interviewer: one specific strength, one important gap, and one concrete next action. The ideal answer should be a concise checklist of concepts and an example, not a copied textbook paragraph.
Do not repeat a question or restart from generic fundamentals. The next interviewer focus should naturally follow the candidate's current answer, claimed experience, or the gap you identify.
Candidate resume context: ${resumeContext}
Conversation so far:
${conversationContext}
Evaluate this interview answer and return ONLY valid JSON (no markdown).

Question: ${body.data.questionText?.trim() || question.text}
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
  "feedback": "Specific evidence-based feedback: one strength, one gap, and one next action",
  "improvements": ["specific improvement based on this answer", "specific improvement based on this role", "specific practice prompt"]
}`;

  const aiText = await geminiPrompt(prompt);
  const parsedEvaluation = aiText ? parseGeminiJson<{
    technicalScore: number; communicationScore: number; confidenceScore: number;
    correctAnswer: string; feedback: string; improvements: string[];
  }>(aiText) : null;
  const evaluation = parsedEvaluation
    && typeof parsedEvaluation.correctAnswer === "string"
    && typeof parsedEvaluation.feedback === "string"
    && Array.isArray(parsedEvaluation.improvements)
    ? {
      technicalScore: clampScore(parsedEvaluation.technicalScore, 50),
      communicationScore: clampScore(parsedEvaluation.communicationScore, 50),
      confidenceScore: clampScore(parsedEvaluation.confidenceScore, 50),
      correctAnswer: parsedEvaluation.correctAnswer,
      feedback: parsedEvaluation.feedback,
      improvements: parsedEvaluation.improvements.filter((item): item is string => typeof item === "string").slice(0, 4),
    }
    : null;

  const eval_ = evaluation ?? createFallbackEvaluation(question, body.data.answer);

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

  const isComplete = allAnswers.length >= Math.max(15, normalized.session.questionsAsked);
  await db.update(interviewSessionsTable).set({
    answersGiven: allAnswers.length,
    technicalScore: avgTech, communicationScore: avgComm, confidenceScore: avgConf,
    status: isComplete ? "completed" : "active",
  }).where(eq(interviewSessionsTable.id, params.data.id));

  await db.insert(activityLogTable).values({
    userId, type: "interview", title: "Answer Submitted",
    description: `${normalized.session.category} interview answer evaluated`, score: eval_.technicalScore,
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
