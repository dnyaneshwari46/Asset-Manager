import { and, eq } from "drizzle-orm";
import { db, questionsTable } from "@workspace/db";

type SeedQuestion = {
  type: "technical" | "scenario" | "behavioral";
  text: string;
  tags: string[];
};

const sharedGuidance = "Explain your reasoning, trade-offs, and a practical example rather than memorizing an exact value.";

const ROLE_QUESTION_BANK: Record<string, SeedQuestion[]> = {
  java: [
    { type: "technical", text: "Can you explain one object-oriented principle you used in a Java project and why it helped?", tags: ["java", "oop", "project"] },
    { type: "technical", text: "How would you choose between a List, Set, and Map for a feature you are building?", tags: ["java", "collections", "reasoning"] },
    { type: "technical", text: "What is your approach to handling exceptions in a Java service so failures are useful and safe?", tags: ["java", "exceptions", "backend"] },
    { type: "technical", text: "Walk me through how you would design a small Spring Boot REST endpoint.", tags: ["java", "spring", "rest"] },
    { type: "technical", text: "When a Java API becomes slow, what would you inspect before changing the code?", tags: ["java", "performance", "debugging"] },
    { type: "scenario", text: "A Java endpoint works locally but returns errors after deployment. How would you investigate it step by step?", tags: ["java", "deployment", "debugging", "scenario"] },
    { type: "scenario", text: "A teammate puts database calls inside a loop. How would you explain the risk and suggest a practical improvement?", tags: ["java", "sql", "performance", "scenario"] },
    { type: "scenario", text: "A production request sometimes returns null data. What evidence would you collect before fixing it?", tags: ["java", "debugging", "scenario"] },
    { type: "scenario", text: "You inherit a Java module with very few tests. What would you improve first and why?", tags: ["java", "testing", "scenario"] },
    { type: "scenario", text: "You disagree with a design choice in a code review. How would you handle the discussion?", tags: ["java", "collaboration", "scenario"] },
    { type: "behavioral", text: "Tell me about a Java project you worked on and the part you personally owned.", tags: ["java", "project", "behavioral"] },
    { type: "behavioral", text: "Describe a difficult bug you faced and how you communicated the progress.", tags: ["java", "debugging", "behavioral"] },
    { type: "behavioral", text: "Tell me about a Java concept you had to learn quickly for a project.", tags: ["java", "learning", "behavioral"] },
    { type: "behavioral", text: "How do you explain a technical Java decision to a non-technical teammate?", tags: ["java", "communication", "behavioral"] },
    { type: "behavioral", text: "What would you like to improve before your next Java interview?", tags: ["java", "growth", "behavioral"] },
  ],
  python: [
    { type: "technical", text: "Which Python data structures do you use most often, and how do you choose between them?", tags: ["python", "data-structures", "reasoning"] },
    { type: "technical", text: "Explain a Python function or class you wrote and how you made it easy to test.", tags: ["python", "oop", "testing"] },
    { type: "technical", text: "When would you use a generator instead of building a complete list in memory?", tags: ["python", "generators", "performance"] },
    { type: "technical", text: "How would you structure a small Python API so validation and error handling stay clear?", tags: ["python", "api", "backend"] },
    { type: "technical", text: "How do you investigate a Python script that is correct but unexpectedly slow?", tags: ["python", "performance", "debugging"] },
    { type: "scenario", text: "A Python service works on your laptop but fails in a deployment environment. What would you check first?", tags: ["python", "deployment", "scenario"] },
    { type: "scenario", text: "A data-processing script runs out of memory on a larger file. How would you improve it?", tags: ["python", "data", "performance", "scenario"] },
    { type: "scenario", text: "A teammate catches every exception and hides the error. How would you improve that code?", tags: ["python", "exceptions", "code-review", "scenario"] },
    { type: "scenario", text: "Your API receives incomplete input from a client. How should the service respond?", tags: ["python", "api", "validation", "scenario"] },
    { type: "scenario", text: "A Python test is flaky in CI but passes locally. How would you debug it?", tags: ["python", "testing", "ci", "scenario"] },
    { type: "behavioral", text: "Tell me about a Python project where you had to make a design choice.", tags: ["python", "project", "behavioral"] },
    { type: "behavioral", text: "Describe a time you learned a Python library or framework under time pressure.", tags: ["python", "learning", "behavioral"] },
    { type: "behavioral", text: "Tell me about a bug in your Python code and what you changed afterward.", tags: ["python", "debugging", "behavioral"] },
    { type: "behavioral", text: "How do you keep your Python code understandable when the logic becomes complex?", tags: ["python", "communication", "behavioral"] },
    { type: "behavioral", text: "What kind of Python problem would you like more practice explaining aloud?", tags: ["python", "growth", "behavioral"] },
  ],
  mern: [
    { type: "technical", text: "Walk me through a React component you built and how its state changes.", tags: ["react", "javascript", "project"] },
    { type: "technical", text: "How do you decide where state should live in a React application?", tags: ["react", "state-management", "reasoning"] },
    { type: "technical", text: "How would you handle loading, errors, and empty results in a frontend API call?", tags: ["react", "api", "ux"] },
    { type: "technical", text: "What makes a page accessible and responsive when you build it with HTML, CSS, and React?", tags: ["react", "css", "accessibility"] },
    { type: "technical", text: "How do you debug a frontend page that feels slow after a new feature is added?", tags: ["react", "performance", "debugging"] },
    { type: "scenario", text: "A React screen shows stale data after saving a form. How would you find and fix the issue?", tags: ["react", "state", "debugging", "scenario"] },
    { type: "scenario", text: "The API contract changes while you are working on the frontend. How would you keep the user experience stable?", tags: ["react", "api", "scenario"] },
    { type: "scenario", text: "A user reports that your layout works on desktop but not on mobile. What would you inspect?", tags: ["react", "responsive", "scenario"] },
    { type: "scenario", text: "A component has become difficult to maintain. What small refactor would you start with?", tags: ["react", "code-quality", "scenario"] },
    { type: "scenario", text: "A teammate prefers a different state-management approach. How would you compare the options?", tags: ["react", "collaboration", "scenario"] },
    { type: "behavioral", text: "Tell me about a frontend feature you built and the user problem it solved.", tags: ["react", "project", "behavioral"] },
    { type: "behavioral", text: "Describe a UI bug that was hard to reproduce and how you handled it.", tags: ["react", "debugging", "behavioral"] },
    { type: "behavioral", text: "How do you respond when feedback changes the design you already implemented?", tags: ["react", "collaboration", "behavioral"] },
    { type: "behavioral", text: "Tell me about a time you improved accessibility or usability.", tags: ["react", "accessibility", "behavioral"] },
    { type: "behavioral", text: "What frontend skill are you actively trying to improve?", tags: ["react", "growth", "behavioral"] },
  ],
  fullstack: [
    { type: "technical", text: "Walk me through a feature from the browser request to the database and back.", tags: ["fullstack", "architecture", "project"] },
    { type: "technical", text: "How would you design a REST endpoint with validation, useful errors, and authentication?", tags: ["fullstack", "rest", "auth"] },
    { type: "technical", text: "How do you choose what belongs in the frontend, backend, and database?", tags: ["fullstack", "architecture", "reasoning"] },
    { type: "technical", text: "What database query or data-modeling decision have you made in a project?", tags: ["fullstack", "sql", "database"] },
    { type: "technical", text: "How would you investigate a feature that is slow across both the frontend and backend?", tags: ["fullstack", "performance", "debugging"] },
    { type: "scenario", text: "A user submits a form twice because the response is slow. How would you prevent duplicate work?", tags: ["fullstack", "api", "reliability", "scenario"] },
    { type: "scenario", text: "An authenticated route works for one user but exposes another user's data. How would you debug and prevent it?", tags: ["fullstack", "auth", "security", "scenario"] },
    { type: "scenario", text: "A database change may break an older client. How would you release it safely?", tags: ["fullstack", "database", "deployment", "scenario"] },
    { type: "scenario", text: "The frontend and backend teams disagree about where validation belongs. How would you resolve it?", tags: ["fullstack", "collaboration", "scenario"] },
    { type: "scenario", text: "A production request fails only for large inputs. What would you measure first?", tags: ["fullstack", "debugging", "scenario"] },
    { type: "behavioral", text: "Tell me about a full-stack feature where you understood both the user and the system.", tags: ["fullstack", "project", "behavioral"] },
    { type: "behavioral", text: "Describe a trade-off you made between shipping quickly and building for the future.", tags: ["fullstack", "trade-off", "behavioral"] },
    { type: "behavioral", text: "Tell me about a time you owned a problem across team boundaries.", tags: ["fullstack", "ownership", "behavioral"] },
    { type: "behavioral", text: "How do you explain a backend failure to a customer-facing teammate?", tags: ["fullstack", "communication", "behavioral"] },
    { type: "behavioral", text: "Which full-stack area do you want to strengthen next?", tags: ["fullstack", "growth", "behavioral"] },
  ],
  data_analyst: [
    { type: "technical", text: "How would you use SQL to find a useful trend in a business dataset?", tags: ["data-analyst", "sql", "analysis"] },
    { type: "technical", text: "How do you check data quality before presenting a dashboard?", tags: ["data-analyst", "data-cleaning", "quality"] },
    { type: "technical", text: "How would you choose a chart for a comparison, trend, or distribution?", tags: ["data-analyst", "visualization", "reasoning"] },
    { type: "technical", text: "Tell me how you would explain an analysis result to someone who does not work with data.", tags: ["data-analyst", "communication", "insights"] },
    { type: "technical", text: "What would you inspect if two reports show different numbers for the same metric?", tags: ["data-analyst", "debugging", "metrics"] },
    { type: "scenario", text: "A stakeholder asks for a dashboard but cannot define success. What questions would you ask first?", tags: ["data-analyst", "dashboard", "scenario"] },
    { type: "scenario", text: "Your dataset has missing and duplicate rows close to a deadline. How would you proceed?", tags: ["data-analyst", "data-cleaning", "scenario"] },
    { type: "scenario", text: "A chart suggests a business problem, but the sample is small. How would you communicate that?", tags: ["data-analyst", "statistics", "scenario"] },
    { type: "scenario", text: "A manager wants one number, but the data has several valid interpretations. What would you do?", tags: ["data-analyst", "metrics", "scenario"] },
    { type: "scenario", text: "A teammate questions your SQL result. How would you make the analysis easy to verify?", tags: ["data-analyst", "sql", "collaboration", "scenario"] },
    { type: "behavioral", text: "Tell me about an analysis or dashboard that changed someone's decision.", tags: ["data-analyst", "project", "behavioral"] },
    { type: "behavioral", text: "Describe a time your analysis was challenged and how you responded.", tags: ["data-analyst", "communication", "behavioral"] },
    { type: "behavioral", text: "How do you decide which details to include when presenting insights?", tags: ["data-analyst", "storytelling", "behavioral"] },
    { type: "behavioral", text: "Tell me about a time you found a problem in the data rather than the business process.", tags: ["data-analyst", "quality", "behavioral"] },
    { type: "behavioral", text: "Which data tool or analysis skill are you working on next?", tags: ["data-analyst", "growth", "behavioral"] },
  ],
  data_science: [
    { type: "technical", text: "How would you turn a business question into a data-science problem?", tags: ["data-science", "problem-framing", "reasoning"] },
    { type: "technical", text: "What steps do you take before training a model on a new dataset?", tags: ["data-science", "data-preparation", "ml"] },
    { type: "technical", text: "How do you choose an evaluation metric for a model?", tags: ["data-science", "evaluation", "reasoning"] },
    { type: "technical", text: "Explain one model or statistical idea you used in a project without relying on formulas alone.", tags: ["data-science", "statistics", "project"] },
    { type: "technical", text: "How would you check whether a model is useful after it is deployed?", tags: ["data-science", "monitoring", "ml"] },
    { type: "scenario", text: "Your model scores well offline but performs poorly for users. What would you investigate?", tags: ["data-science", "modeling", "debugging", "scenario"] },
    { type: "scenario", text: "A feature contains information from after the prediction time. How would you detect and fix the issue?", tags: ["data-science", "leakage", "scenario"] },
    { type: "scenario", text: "A stakeholder wants a complex model but cannot explain the business need. How would you guide the decision?", tags: ["data-science", "communication", "scenario"] },
    { type: "scenario", text: "The dataset is too small for the original plan. What practical alternatives would you discuss?", tags: ["data-science", "data", "scenario"] },
    { type: "scenario", text: "Your experiment result is inconclusive. How would you communicate the next step?", tags: ["data-science", "experimentation", "scenario"] },
    { type: "behavioral", text: "Tell me about a data-science project and how you measured whether it helped.", tags: ["data-science", "project", "behavioral"] },
    { type: "behavioral", text: "Describe a time your analysis contradicted your first assumption.", tags: ["data-science", "learning", "behavioral"] },
    { type: "behavioral", text: "How do you explain model limitations to a non-technical audience?", tags: ["data-science", "communication", "behavioral"] },
    { type: "behavioral", text: "Tell me about a time you worked with messy or incomplete data.", tags: ["data-science", "data", "behavioral"] },
    { type: "behavioral", text: "Which data-science concept do you want to become more confident explaining?", tags: ["data-science", "growth", "behavioral"] },
  ],
  ai_ml: [
    { type: "technical", text: "How would you explain the difference between training, validation, and test data in a project?", tags: ["ai-ml", "ml", "evaluation"] },
    { type: "technical", text: "How do you decide whether a problem needs machine learning at all?", tags: ["ai-ml", "problem-framing", "reasoning"] },
    { type: "technical", text: "What would you consider when preparing data for a machine-learning model?", tags: ["ai-ml", "data-preparation", "ml"] },
    { type: "technical", text: "How would you compare two models when one is more accurate but harder to explain?", tags: ["ai-ml", "trade-off", "evaluation"] },
    { type: "technical", text: "What should a team monitor after an ML model goes into production?", tags: ["ai-ml", "deployment", "monitoring"] },
    { type: "scenario", text: "An ML model performs differently for two user groups. How would you investigate before changing it?", tags: ["ai-ml", "responsible-ai", "scenario"] },
    { type: "scenario", text: "A model's input data changes over time. How would you detect and respond to that drift?", tags: ["ai-ml", "monitoring", "scenario"] },
    { type: "scenario", text: "A product team wants an AI feature but has no clear success measure. What would you ask?", tags: ["ai-ml", "product", "scenario"] },
    { type: "scenario", text: "Your model is too slow for the product experience. What trade-offs would you consider?", tags: ["ai-ml", "performance", "scenario"] },
    { type: "scenario", text: "A user asks why an AI system made a decision. How would you make the response understandable?", tags: ["ai-ml", "explainability", "scenario"] },
    { type: "behavioral", text: "Tell me about an AI or ML project where you owned a meaningful decision.", tags: ["ai-ml", "project", "behavioral"] },
    { type: "behavioral", text: "Describe a time a model or experiment did not work as expected.", tags: ["ai-ml", "learning", "behavioral"] },
    { type: "behavioral", text: "How do you keep current with AI topics without losing focus on practical delivery?", tags: ["ai-ml", "learning", "behavioral"] },
    { type: "behavioral", text: "Tell me about a time you had to explain an AI limitation to a stakeholder.", tags: ["ai-ml", "communication", "behavioral"] },
    { type: "behavioral", text: "Which AI/ML skill do you want to strengthen through your next project?", tags: ["ai-ml", "growth", "behavioral"] },
  ],
  hr: [
    { type: "technical", text: "Tell me about a project you are proud of and how you would explain its impact.", tags: ["hr", "project", "communication"] },
    { type: "technical", text: "How do you usually learn a new tool or technology when a project needs it?", tags: ["hr", "learning", "reasoning"] },
    { type: "technical", text: "How do you organize your work when several tasks have the same deadline?", tags: ["hr", "planning", "reasoning"] },
    { type: "technical", text: "What does good quality mean in the work you want to do?", tags: ["hr", "quality", "communication"] },
    { type: "technical", text: "How do you prepare before explaining your work to an interviewer or manager?", tags: ["hr", "preparation", "communication"] },
    { type: "scenario", text: "Tell me what you would do if you made a mistake just before a deadline.", tags: ["hr", "ownership", "scenario"] },
    { type: "scenario", text: "A teammate is not contributing to a shared task. How would you handle it?", tags: ["hr", "teamwork", "scenario"] },
    { type: "scenario", text: "You receive feedback that your explanation is unclear. What would you change?", tags: ["hr", "communication", "scenario"] },
    { type: "scenario", text: "You are given a task with unclear requirements. What would you do first?", tags: ["hr", "ambiguity", "scenario"] },
    { type: "scenario", text: "You disagree with your manager's approach. How would you raise the concern?", tags: ["hr", "collaboration", "scenario"] },
    { type: "behavioral", text: "Tell me about yourself and the kind of role you are preparing for.", tags: ["hr", "introduction", "behavioral"] },
    { type: "behavioral", text: "Why are you interested in this role and this kind of work?", tags: ["hr", "motivation", "behavioral"] },
    { type: "behavioral", text: "What is one strength and one area you are actively improving?", tags: ["hr", "strengths", "behavioral"] },
    { type: "behavioral", text: "Tell me about a time you handled disagreement or failure.", tags: ["hr", "conflict", "behavioral"] },
    { type: "behavioral", text: "Where would you like your skills to grow over the next few years?", tags: ["hr", "goals", "behavioral"] },
  ],
};

export async function ensureRoleQuestions(category: string, difficulty: string) {
  const existing = await db.select().from(questionsTable)
    .where(and(eq(questionsTable.category, category), eq(questionsTable.difficulty, difficulty)));
  const seedQuestions = ROLE_QUESTION_BANK[category] ?? ROLE_QUESTION_BANK.fullstack;
  const existingTexts = new Set(existing.map((question) => question.text));
  const missing = seedQuestions.filter((question) => !existingTexts.has(question.text));

  if (missing.length) {
    await db.insert(questionsTable).values(missing.map((question) => ({
      category,
      difficulty,
      type: question.type,
      text: question.text,
      sampleAnswer: sharedGuidance,
      tags: question.tags,
    })));
  }

  return db.select().from(questionsTable)
    .where(and(eq(questionsTable.category, category), eq(questionsTable.difficulty, difficulty)));
}