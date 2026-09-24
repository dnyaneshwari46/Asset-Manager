import { relations } from "drizzle-orm/relations";
import { users, codingSubmissions, codingProblems, resumes, interviewSessions, interviewAnswers, questions, activityLog } from "./schema";

export const codingSubmissionsRelations = relations(codingSubmissions, ({one}) => ({
	user: one(users, {
		fields: [codingSubmissions.userId],
		references: [users.id]
	}),
	codingProblem: one(codingProblems, {
		fields: [codingSubmissions.problemId],
		references: [codingProblems.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	codingSubmissions: many(codingSubmissions),
	resumes: many(resumes),
	interviewSessions: many(interviewSessions),
	activityLogs: many(activityLog),
}));

export const codingProblemsRelations = relations(codingProblems, ({many}) => ({
	codingSubmissions: many(codingSubmissions),
}));

export const resumesRelations = relations(resumes, ({one}) => ({
	user: one(users, {
		fields: [resumes.userId],
		references: [users.id]
	}),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({one, many}) => ({
	user: one(users, {
		fields: [interviewSessions.userId],
		references: [users.id]
	}),
	interviewAnswers: many(interviewAnswers),
}));

export const interviewAnswersRelations = relations(interviewAnswers, ({one}) => ({
	interviewSession: one(interviewSessions, {
		fields: [interviewAnswers.interviewId],
		references: [interviewSessions.id]
	}),
	question: one(questions, {
		fields: [interviewAnswers.questionId],
		references: [questions.id]
	}),
}));

export const questionsRelations = relations(questions, ({many}) => ({
	interviewAnswers: many(interviewAnswers),
}));

export const activityLogRelations = relations(activityLog, ({one}) => ({
	user: one(users, {
		fields: [activityLog.userId],
		references: [users.id]
	}),
}));