import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const codingProblemsTable = pgTable("coding_problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(), // easy | medium | hard
  languages: text("languages").array().notNull().default([]),
  starterCode: jsonb("starter_code").notNull().default({}), // { python: "...", javascript: "..." }
  examples: jsonb("examples").notNull().default([]), // [{ input, output, explanation }]
  testCases: jsonb("test_cases").notNull().default([]), // hidden [{ input, expected }]
  constraints: text("constraints"),
  timeLimit: integer("time_limit").notNull().default(30), // seconds
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const codingSubmissionsTable = pgTable("coding_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id").notNull().references(() => codingProblemsTable.id),
  language: text("language").notNull(),
  code: text("code").notNull(),
  score: integer("score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  testsPassed: integer("tests_passed").notNull().default(0),
  testsTotal: integer("tests_total").notNull().default(0),
  aiReview: text("ai_review").notNull().default(""),
  complexity: text("complexity").notNull().default(""),
  suggestions: jsonb("suggestions").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCodingProblemSchema = createInsertSchema(codingProblemsTable).omit({ id: true, createdAt: true });
export const insertCodingSubmissionSchema = createInsertSchema(codingSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertCodingProblem = z.infer<typeof insertCodingProblemSchema>;
export type InsertCodingSubmission = z.infer<typeof insertCodingSubmissionSchema>;
export type CodingProblem = typeof codingProblemsTable.$inferSelect;
export type CodingSubmission = typeof codingSubmissionsTable.$inferSelect;
