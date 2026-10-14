import http from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { chatRateLimiter } from "./middleware/rateLimiter";
import { requireAuth } from "./auth/auth.middleware";
import { authRouter } from "./auth/auth.routes";
import { directorsRouter } from "./directors/directors.routes";
import { dashboardRouter } from "./dashboard/dashboard.routes";
import { tokenUsageRouter } from "./tokenUsage/tokenUsage.routes";
import { createSocketServer } from "./sockets/socketServer";
import { startN8nPoller } from "./n8nApi/n8nApi.poller";
import { startSpyPoller } from "./spy/spyKpi.poller";
import { startWahaPoller } from "./waha/waha.poller";

const app = express();

app.use(requestLogger);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
if (env.FRONTEND_ORIGIN) {
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "jarvis-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/directors", requireAuth, chatRateLimiter, directorsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/token-usage", requireAuth, tokenUsageRouter);

app.use(errorHandler);

const httpServer = http.createServer(app);
createSocketServer(httpServer);

startN8nPoller();
startSpyPoller();
startWahaPoller();

httpServer.listen(env.PORT, () => {
  logger.info(`JARVIS backend listening on port ${env.PORT}`);
});
