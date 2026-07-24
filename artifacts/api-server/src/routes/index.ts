import { Router } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import resumesRouter from "./resumes";
import interviewsRouter from "./interviews";
import questionsRouter from "./questions";
import codingRouter from "./coding";
import learningRouter from "./learning";
import adminRouter from "./admin";

const router = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(dashboardRouter);
router.use(resumesRouter);
router.use(interviewsRouter);
router.use(questionsRouter);
router.use(codingRouter);
router.use(learningRouter);
router.use(adminRouter);

export default router;
