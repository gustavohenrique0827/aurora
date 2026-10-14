// Local dev entry only — on Vercel the app is served by api/index.js (see vercel.json).
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

app.listen(env.PORT, () => {
  logger.info(`JARVIS backend listening on port ${env.PORT}`);
});
