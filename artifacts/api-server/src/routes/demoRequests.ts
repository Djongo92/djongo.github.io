import { Router, type IRouter } from "express";
import { CreateDemoRequestBody, CreateDemoRequestResponse } from "@workspace/api-zod";
import { db, demoRequestsTable } from "@workspace/db";
import { createRateLimit } from "../lib/rateLimit";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const rateLimit = createRateLimit({
  windowMs: 60_000,
  max: 5,
  message: "Too many requests. Please try again in a minute.",
});

/** Test-only: clear rate-limit state between tests. */
export function _resetRateLimit() {
  rateLimit.reset();
}

router.post("/demo-requests", rateLimit, async (req, res) => {
  // Honeypot: real users never fill this hidden field; bots often do.
  if (typeof (req.body as Record<string, unknown>)?.website === "string" && (req.body as Record<string, unknown>).website !== "") {
    // Pretend success so bots don't adapt, but store nothing.
    res.status(201).json(CreateDemoRequestResponse.parse({ ok: true }));
    return;
  }
  const parsed = CreateDemoRequestBody.safeParse(req.body);
  if (!parsed.success || !EMAIL_RE.test(parsed.data.email.trim())) {
    res.status(400).json({ message: "Enter a valid email address" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const firmName = typeof parsed.data.firmName === "string" && parsed.data.firmName.trim()
    ? parsed.data.firmName.trim()
    : null;
  try {
    await db
      .insert(demoRequestsTable)
      .values({ email, firmName })
      .onConflictDoNothing({ target: demoRequestsTable.email });
    res.status(201).json(CreateDemoRequestResponse.parse({ ok: true }));
  } catch (err) {
    req.log.error({ err }, "failed to store demo request");
    res.status(500).json({ message: "Failed to store your request" });
  }
});

export default router;
