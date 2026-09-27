import { pgTable, serial, integer, unique } from "drizzle-orm/pg-core";
import { interviewSessionsTable } from "./interviews";
import { questionsTable } from "./questions";

export const interviewQuestionsTable = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").notNull().references(() => interviewSessionsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
}, (table) => [
  unique("interview_questions_interview_question_unique").on(table.interviewId, table.questionId),
  unique("interview_questions_interview_position_unique").on(table.interviewId, table.position),
]);
