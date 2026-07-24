/**
 * Auth middleware — extracts the authenticated Clerk user and resolves
 * (or JIT-provisions) the local DB user record.
 */
import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/**
 * Resolves the Clerk user to a local DB user, creating one on first login.
 * Must be called after requireAuth.
 */
export async function resolveDbUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

  if (!user) {
    // JIT provision — pull name/email from Clerk session claims
    const claims = auth.sessionClaims as Record<string, unknown> | null;
    const email = (claims?.email as string) ?? `${clerkId}@unknown.com`;
    const name = (claims?.name as string) ?? (claims?.username as string) ?? "User";
    const avatarUrl = (claims?.image_url as string) ?? null;

    [user] = await db
      .insert(usersTable)
      .values({ clerkId, email, name, avatarUrl })
      .returning();
  }

  req.dbUser = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.dbUser?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
