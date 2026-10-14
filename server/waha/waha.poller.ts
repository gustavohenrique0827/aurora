import { fetchWahaSessionStatus } from "./wahaClient";
import { getDashboardSnapshot, updateWaha } from "../dashboard/dashboard.aggregator";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const POLL_INTERVAL_MS = 20_000;

async function pollOnce(): Promise<void> {
  try {
    const status = await fetchWahaSessionStatus();
    updateWaha({
      status: "live",
      data: { session: env.WAHA_SESSION, status },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, "waha.poller: failed to refresh WAHA session status");
    const previous = getDashboardSnapshot().waha;
    updateWaha({
      status: "error",
      data: previous.data,
      lastUpdated: previous.lastUpdated,
      error: err instanceof Error ? err.message : "unknown error",
    });
  }
}

export function startWahaPoller(): void {
  void pollOnce();
  setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
}
