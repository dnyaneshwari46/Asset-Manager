import { pgTable, text, serial, timestamp, integer, real, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { questionsTable } from "./questions";
import { resumesTable } from "./resumes";

export const interviewSessionsTable = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  resumeId: integer("resume_id").references(() => resumesTable.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  status: text("status").notNull().default("active"), // active | completed | abandoned
  technicalScore: real("technical_score"),
  communicationScore: real("communication_score"),
  confidenceScore: real("confidence_score"),
  questionsAsked: integer("questions_asked").notNull().default(0),
  answersGiven: integer("answers_given").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interviewAnswersTable = pgTable("interview_answers", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").notNull().references(() => interviewSessionsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id),
  answer: text("answer").notNull(),
  technicalScore: integer("technical_score").notNull().default(0),
  communicationScore: integer("communication_score").notNull().default(0),
  confidenceScore: integer("confidence_score").notNull().default(0),
  correctAnswer: text("correct_answer").notNull().default(""),
  feedback: text("feedback").notNull().default(""),
  improvements: jsonb("improvements").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("interview_answers_interview_question_unique").on(table.interviewId, table.questionId),
]);

export const insertInterviewSessionSchema = createInsertSchema(interviewSessionsTable).omit({ id: true, createdAt: true });
export const insertInterviewAnswerSchema = createInsertSchema(interviewAnswersTable).omit({ id: true, createdAt: true });
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InsertInterviewAnswer = z.infer<typeof insertInterviewAnswerSchema>;
export type InterviewSession = typeof interviewSessionsTable.$inferSelect;
export type InterviewAnswer = typeof interviewAnswersTable.$inferSelect;





