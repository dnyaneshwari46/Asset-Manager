import { pgTable, foreignKey, serial, integer, text, boolean, jsonb, timestamp, real, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const codingSubmissions = pgTable("coding_submissions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	problemId: integer("problem_id").notNull(),
	language: text().notNull(),
	code: text().notNull(),
	score: integer().default(0).notNull(),
	passed: boolean().default(false).notNull(),
	testsPassed: integer("tests_passed").default(0).notNull(),
	testsTotal: integer("tests_total").default(0).notNull(),
	aiReview: text("ai_review").default(').notNull(),
	complexity: text().default(').notNull(),
	suggestions: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "coding_submissions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.problemId],
			foreignColumns: [codingProblems.id],
			name: "coding_submissions_problem_id_coding_problems_id_fk"
		}),
]);

export const resumes = pgTable("resumes", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	template: text().default('classic').notNull(),
	content: jsonb().default({}).notNull(),
	atsScore: integer("ats_score"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "resumes_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const codingProblems = pgTable("coding_problems", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	difficulty: text().notNull(),
	languages: text().array().default([""]).notNull(),
	starterCode: jsonb("starter_code").default({}).notNull(),
	examples: jsonb().default([]).notNull(),
	testCases: jsonb("test_cases").default([]).notNull(),
	constraints: text(),
	timeLimit: integer("time_limit").default(30).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const interviewSessions = pgTable("interview_sessions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	category: text().notNull(),
	difficulty: text().notNull(),
	status: text().default('active').notNull(),
	technicalScore: real("technical_score"),
	communicationScore: real("communication_score"),
	confidenceScore: real("confidence_score"),
	questionsAsked: integer("questions_asked").default(0).notNull(),
	answersGiven: integer("answers_given").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "interview_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const interviewAnswers = pgTable("interview_answers", {
	id: serial().primaryKey().notNull(),
	interviewId: integer("interview_id").notNull(),
	questionId: integer("question_id").notNull(),
	answer: text().notNull(),
	technicalScore: integer("technical_score").default(0).notNull(),
	communicationScore: integer("communication_score").default(0).notNull(),
	confidenceScore: integer("confidence_score").default(0).notNull(),
	correctAnswer: text("correct_answer").default(').notNull(),
	feedback: text().default(').notNull(),
	improvements: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.interviewId],
			foreignColumns: [interviewSessions.id],
			name: "interview_answers_interview_id_interview_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.questionId],
			foreignColumns: [questions.id],
			name: "interview_answers_question_id_questions_id_fk"
		}),
]);

export const questions = pgTable("questions", {
	id: serial().primaryKey().notNull(),
	category: text().notNull(),
	difficulty: text().notNull(),
	text: text().notNull(),
	type: text().default('technical').notNull(),
	sampleAnswer: text("sample_answer"),
	tags: text().array().default([""]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	email: text().notNull(),
	name: text().notNull(),
	avatarUrl: text("avatar_url"),
	role: text().default('user').notNull(),
	targetRole: text("target_role"),
	experienceLevel: text("experience_level"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_clerk_id_unique").on(table.clerkId),
]);

export const activityLog = pgTable("activity_log", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	score: integer(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activity_log_user_id_users_id_fk"
		}).onDelete("cascade"),
]);
