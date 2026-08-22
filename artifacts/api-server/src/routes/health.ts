import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Temporary debug endpoint — returns auth headers received + clerk auth state
router.get("/debug-auth", (req, res) => {
  const auth = getAuth(req);
  res.json({
    hasAuthorization: !!req.headers["authorization"],
    authorizationPrefix: req.headers["authorization"]?.substring(0, 20),
    hasCookie: !!req.headers["cookie"],
    clerkUserId: auth?.userId ?? null,
    host: req.headers["host"],
    xForwardedHost: req.headers["x-forwarded-host"],
  });
});

export default router;
