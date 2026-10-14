import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config/env";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { chatRateLimiter } from "./middleware/rateLimiter";
import { requireAuth } from "./auth/auth.middleware";
import { authRouter } from "./auth/auth.routes";
import { directorsRouter } from "./directors/directors.routes";
import { dashboardRouter } from "./dashboard/dashboard.routes";
import { tokenUsageRouter } from "./tokenUsage/tokenUsage.routes";
import { chatRouter } from "./chat/chat.routes";

export const app = express();

// Behind Vercel's proxy: needed so rate limiting and secure cookies see the real client.
app.set("trust proxy", 1);

app.use(requestLogger);
// Vercel rejects request bodies above 4.5MB anyway (image/PDF attachments ride in the body).
app.use(express.json({ limit: "4mb" }));
app.use(cookieParser());
if (env.FRONTEND_ORIGIN) {
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "jarvis-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/chat", requireAuth, chatRateLimiter, chatRouter);
app.use("/api/directors", requireAuth, chatRateLimiter, directorsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/token-usage", requireAuth, tokenUsageRouter);

app.use(errorHandler);
