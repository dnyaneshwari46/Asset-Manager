import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // java, python, mern, fullstack, data_analyst, data_science, ai_ml, hr
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  text: text("text").notNull(),
  type: text("type").notNull().default("technical"), // technical | behavioral | hr
  sampleAnswer: text("sample_answer"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
