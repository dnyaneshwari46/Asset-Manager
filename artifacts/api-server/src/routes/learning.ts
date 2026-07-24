import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, interviewAnswersTable, interviewSessionsTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import { GetLearningRoadmapResponse, ListLearningTopicsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const CATEGORY_RESOURCES: Record<string, { title: string; url: string; duration: string }[]> = {
  python: [
    { title: "Python for Data Science – Full Course", url: "https://www.youtube.com/watch?v=LHBE6Q9XlzI", duration: "12h" },
    { title: "Python OOP Crash Course", url: "https://www.youtube.com/watch?v=JeznW_7DlB0", duration: "3h" },
  ],
  java: [
    { title: "Java Full Course for Beginners", url: "https://www.youtube.com/watch?v=GoXwIVyNvX0", duration: "8h" },
    { title: "Java Spring Boot Tutorial", url: "https://www.youtube.com/watch?v=9SGDpanrc8U", duration: "5h" },
  ],
  mern: [
    { title: "MERN Stack Full Course", url: "https://www.youtube.com/watch?v=7CqJlxBYj-M", duration: "10h" },
    { title: "React & Node.js Project", url: "https://www.youtube.com/watch?v=4sosXZsdy-s", duration: "6h" },
  ],
  ai_ml: [
    { title: "Machine Learning Course – Andrew Ng", url: "https://www.youtube.com/watch?v=PPLop4L2eGk", duration: "20h" },
    { title: "Deep Learning Specialization", url: "https://www.youtube.com/watch?v=CS4cs9xVecg", duration: "15h" },
  ],
  data_science: [
    { title: "Data Science Full Course", url: "https://www.youtube.com/watch?v=ua-CiDNNj30", duration: "10h" },
    { title: "Pandas & NumPy Tutorial", url: "https://www.youtube.com/watch?v=vmEHCJofslg", duration: "4h" },
  ],
};

router.get("/learning/roadmap", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;

  const answers = await db.select({ a: interviewAnswersTable, s: interviewSessionsTable })
    .from(interviewAnswersTable)
    .innerJoin(interviewSessionsTable, eq(interviewAnswersTable.interviewId, interviewSessionsTable.id))
    .where(eq(interviewSessionsTable.userId, userId));

  // Derive topic scores
  const topicScores: Record<string, number[]> = {};
  for (const { a, s } of answers) {
    if (!topicScores[s.category]) topicScores[s.category] = [];
    topicScores[s.category].push(a.technicalScore);
  }

  const weakTopics = Object.entries(topicScores)
    .filter(([, scores]) => scores.reduce((a, b) => a + b, 0) / scores.length < 60)
    .map(([t]) => t);
  const strongTopics = Object.entries(topicScores)
    .filter(([, scores]) => scores.reduce((a, b) => a + b, 0) / scores.length >= 75)
    .map(([t]) => t);

  const defaultWeak = weakTopics.length ? weakTopics : ["Data Structures", "Algorithms", "System Design"];

  const plan = defaultWeak.slice(0, 4).map((topic, i) => ({
    week: i + 1,
    topic,
    goal: `Master core ${topic} concepts and practice 10 problems`,
    resources: [`Watch free ${topic} tutorials on YouTube`, `Practice on LeetCode free tier`, `Read GeeksForGeeks articles`],
  }));

  const recommendedVideos = defaultWeak.flatMap(t => (CATEGORY_RESOURCES[t] ?? [])).slice(0, 6)
    .map(v => ({ ...v, topic: defaultWeak[0] }));

  if (recommendedVideos.length === 0) {
    recommendedVideos.push(
      { title: "Data Structures & Algorithms – Full Course", url: "https://www.youtube.com/watch?v=8hly31xKli0", duration: "8h", topic: "DSA" },
      { title: "System Design Interview Crash Course", url: "https://www.youtube.com/watch?v=MbjObHmDbZo", duration: "4h", topic: "System Design" },
    );
  }

  res.json(GetLearningRoadmapResponse.parse({ weakTopics: defaultWeak, strongTopics, plan, recommendedVideos }));
});

router.get("/learning/topics", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;

  const answers = await db.select({ a: interviewAnswersTable, s: interviewSessionsTable })
    .from(interviewAnswersTable)
    .innerJoin(interviewSessionsTable, eq(interviewAnswersTable.interviewId, interviewSessionsTable.id))
    .where(eq(interviewSessionsTable.userId, userId));

  const topicScores: Record<string, { scores: number[]; count: number }> = {};
  for (const { a, s } of answers) {
    if (!topicScores[s.category]) topicScores[s.category] = { scores: [], count: 0 };
    topicScores[s.category].scores.push(a.technicalScore);
    topicScores[s.category].count++;
  }

  const topics = Object.entries(topicScores).map(([topic, { scores, count }]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      topic, questionsAttempted: count, avgScore: Math.round(avg),
      strength: avg >= 75 ? "strong" : avg >= 50 ? "moderate" : "weak",
    };
  });

  // Add defaults if no data
  if (topics.length === 0) {
    topics.push(
      { topic: "Data Structures", questionsAttempted: 0, avgScore: 0, strength: "weak" },
      { topic: "Algorithms", questionsAttempted: 0, avgScore: 0, strength: "weak" },
    );
  }

  res.json(ListLearningTopicsResponse.parse(topics));
});

export default router;
