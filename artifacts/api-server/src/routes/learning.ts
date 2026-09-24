import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  interviewAnswersTable,
  interviewSessionsTable,
  questionsTable,
} from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import {
  GetLearningRoadmapResponse,
  ListLearningTopicsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TOPIC_LABELS: Record<string, string> = {
  java: "Java",
  python: "Python",
  react: "React",
  javascript: "JavaScript",
  node: "Node.js",
  mern: "MERN",
  fullstack: "Full Stack",
  oop: "Object-Oriented Programming",
  collections: "Collections",
  exceptions: "Exception Handling",
  spring: "Spring",
  rest: "REST APIs",
  api: "APIs",
  backend: "Backend Development",
  performance: "Performance",
  debugging: "Debugging",
  "data-structures": "Data Structures",
  algorithms: "Algorithms",
  reasoning: "Problem Solving",
  testing: "Testing",
  "state-management": "State Management",
  ux: "UX",
  css: "CSS",
  accessibility: "Accessibility",
  architecture: "System Architecture",
  auth: "Authentication",
  security: "Security",
  sql: "SQL",
  database: "Database",
  deployment: "Deployment",
  reliability: "Reliability",
  collaboration: "Collaboration",
  communication: "Communication",
  project: "Projects",
  "trade-off": "Technical Trade-offs",
  ownership: "Ownership",
  growth: "Growth",
  generators: "Generators",
  pandas: "Pandas",
  numpy: "NumPy",
  statistics: "Statistics",
  "machine-learning": "Machine Learning",
  "deep-learning": "Deep Learning",
};

const IGNORED_TAGS = new Set([
  "scenario",
  "behavioral",
  "technical",
  "hr",
]);

const CATEGORY_RESOURCES: Record<
  string,
  { title: string; url: string; duration: string }[]
> = {
  python: [
    {
      title: "Python for Data Science – Full Course",
      url: "https://www.youtube.com/watch?v=LHBE6Q9XlzI",
      duration: "12h",
    },
    {
      title: "Python OOP Crash Course",
      url: "https://www.youtube.com/watch?v=JeznW_7DlB0",
      duration: "3h",
    },
  ],
  java: [
    {
      title: "Java Full Course for Beginners",
      url: "https://www.youtube.com/watch?v=GoXwIVyNvX0",
      duration: "8h",
    },
    {
      title: "Java Spring Boot Tutorial",
      url: "https://www.youtube.com/watch?v=9SGDpanrc8U",
      duration: "5h",
    },
  ],
  mern: [
    {
      title: "MERN Stack Full Course",
      url: "https://www.youtube.com/watch?v=7CqJlxBYj-M",
      duration: "10h",
    },
    {
      title: "React & Node.js Project",
      url: "https://www.youtube.com/watch?v=4sosXZsdy-s",
      duration: "6h",
    },
  ],
  ai_ml: [
    {
      title: "Machine Learning Course – Andrew Ng",
      url: "https://www.youtube.com/watch?v=PPLop4L2eGk",
      duration: "20h",
    },
    {
      title: "Deep Learning Specialization",
      url: "https://www.youtube.com/watch?v=CS4cs9xVecg",
      duration: "15h",
    },
  ],
  data_science: [
    {
      title: "Data Science Full Course",
      url: "https://www.youtube.com/watch?v=ua-CiDNNj30",
      duration: "10h",
    },
    {
      title: "Pandas & NumPy Tutorial",
      url: "https://www.youtube.com/watch?v=vmEHCJofslg",
      duration: "4h",
    },
  ],
};

function formatTopic(tag: string): string {
  return (
    TOPIC_LABELS[tag] ??
    tag
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function calculateTopicScores(
  answers: Array<{
    a: typeof interviewAnswersTable.$inferSelect;
    q: typeof questionsTable.$inferSelect;
  }>,
) {
  const topicScores: Record<
    string,
    { scores: number[]; count: number }
  > = {};

  for (const { a, q } of answers) {
    const tags = q.tags ?? [];

    for (const tag of tags) {
      if (IGNORED_TAGS.has(tag)) {
        continue;
      }

      if (!topicScores[tag]) {
        topicScores[tag] = {
          scores: [],
          count: 0,
        };
      }

      topicScores[tag].scores.push(a.technicalScore);
      topicScores[tag].count++;
    }
  }

  return topicScores;
}

router.get(
  "/learning/roadmap",
  requireAuth,
  resolveDbUser,
  async (req, res): Promise<void> => {
    const userId = req.dbUser!.id;

    const answers = await db
      .select({
        a: interviewAnswersTable,
        q: questionsTable,
      })
      .from(interviewAnswersTable)
      .innerJoin(
        interviewSessionsTable,
        eq(
          interviewAnswersTable.interviewId,
          interviewSessionsTable.id,
        ),
      )
      .innerJoin(
        questionsTable,
        eq(
          interviewAnswersTable.questionId,
          questionsTable.id,
        ),
      )
      .where(eq(interviewSessionsTable.userId, userId));

    const topicScores = calculateTopicScores(answers);

    const topicStats = Object.entries(topicScores)
      .map(([topic, data]) => {
        const average =
          data.scores.reduce((sum, score) => sum + score, 0) /
          data.scores.length;

        return {
          topic,
          average,
          count: data.count,
        };
      })
      .sort((a, b) => a.average - b.average);

    const weakTopics = topicStats
      .filter((item) => item.average < 60)
      .map((item) => formatTopic(item.topic));

    const strongTopics = topicStats
      .filter((item) => item.average >= 75)
      .map((item) => formatTopic(item.topic));

    const fallbackTopics = [
      "Data Structures",
      "Algorithms",
      "System Design",
    ];

    const learningTopics =
      weakTopics.length > 0
        ? weakTopics
        : topicStats.length > 0
          ? topicStats
              .slice(0, 3)
              .map((item) => formatTopic(item.topic))
          : fallbackTopics;

    const plan = learningTopics.slice(0, 4).map((topic, index) => ({
      week: index + 1,
      topic,
      goal: `Improve your ${topic} skills based on your interview performance and practice 10 focused problems.`,
      resources: [
        `Study ${topic} fundamentals and common interview concepts`,
        `Practice ${topic} interview questions`,
        `Review mistakes from your interview answers`,
      ],
    }));

    const categoryNames = new Set(
      answers.map(({ q }) => q.category),
    );

    const recommendedVideos = Array.from(categoryNames)
      .flatMap((category) => CATEGORY_RESOURCES[category] ?? [])
      .slice(0, 6)
      .map((video) => ({
        ...video,
        topic: learningTopics[0] ?? "Interview Preparation",
      }));

    if (recommendedVideos.length === 0) {
      recommendedVideos.push(
        {
          title: "Data Structures & Algorithms – Full Course",
          url: "https://www.youtube.com/watch?v=8hly31xKli0",
          duration: "8h",
          topic: learningTopics[0] ?? "Data Structures",
        },
        {
          title: "System Design Interview Crash Course",
          url: "https://www.youtube.com/watch?v=MbjObHmDbZo",
          duration: "4h",
          topic: learningTopics[1] ?? "System Design",
        },
      );
    }

    res.json(
      GetLearningRoadmapResponse.parse({
        weakTopics: learningTopics,
        strongTopics,
        plan,
        recommendedVideos,
      }),
    );
  },
);

router.get(
  "/learning/topics",
  requireAuth,
  resolveDbUser,
  async (req, res): Promise<void> => {
    const userId = req.dbUser!.id;

    const answers = await db
      .select({
        a: interviewAnswersTable,
        q: questionsTable,
      })
      .from(interviewAnswersTable)
      .innerJoin(
        interviewSessionsTable,
        eq(
          interviewAnswersTable.interviewId,
          interviewSessionsTable.id,
        ),
      )
      .innerJoin(
        questionsTable,
        eq(
          interviewAnswersTable.questionId,
          questionsTable.id,
        ),
      )
      .where(eq(interviewSessionsTable.userId, userId));

    const topicScores = calculateTopicScores(answers);

    const topics = Object.entries(topicScores)
      .map(([topic, data]) => {
        const average =
          data.scores.reduce((sum, score) => sum + score, 0) /
          data.scores.length;

        return {
          topic: formatTopic(topic),
          questionsAttempted: data.count,
          avgScore: Math.round(average),
          strength:
            average >= 75
              ? "strong"
              : average >= 50
                ? "moderate"
                : "weak",
        };
      })
      .sort((a, b) => a.avgScore - b.avgScore);

    if (topics.length === 0) {
      topics.push(
        {
          topic: "Data Structures",
          questionsAttempted: 0,
          avgScore: 0,
          strength: "weak",
        },
        {
          topic: "Algorithms",
          questionsAttempted: 0,
          avgScore: 0,
          strength: "weak",
        },
      );
    }

    res.json(ListLearningTopicsResponse.parse(topics));
  },
);

export default router;
