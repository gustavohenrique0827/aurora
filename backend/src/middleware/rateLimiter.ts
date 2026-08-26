import rateLimit from "express-rate-limit";

/** Protects the n8n webhook from accidental abuse (e.g. a buggy retry loop in the UI). */
export const chatRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },
});
