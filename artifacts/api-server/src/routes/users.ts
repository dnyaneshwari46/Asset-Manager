import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, resolveDbUser } from "../lib/auth";
import { GetMeResponse, UpdateMeBody, UpdateMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/** GET /users/me */
router.get("/users/me", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const user = req.dbUser!;
  res.json(GetMeResponse.parse({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    targetRole: user.targetRole ?? null,
    experienceLevel: user.experienceLevel ?? null,
    createdAt: user.createdAt.toISOString(),
  }));
});

/** PATCH /users/me */
router.patch("/users/me", requireAuth, resolveDbUser, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.dbUser!;
  const [updated] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(UpdateMeResponse.parse({
    id: updated.id,
    clerkId: updated.clerkId,
    email: updated.email,
    name: updated.name,
    avatarUrl: updated.avatarUrl ?? null,
    role: updated.role,
    targetRole: updated.targetRole ?? null,
    experienceLevel: updated.experienceLevel ?? null,
    createdAt: updated.createdAt.toISOString(),
  }));
});

export default router;
