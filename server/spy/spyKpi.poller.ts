import { fetchSpyKpiSnapshot } from "./spyKpi.service";
import { getDashboardSnapshot, updateSpy } from "../dashboard/dashboard.aggregator";
import { logger } from "../utils/logger";

const POLL_INTERVAL_MS = 30_000;

async function pollOnce(): Promise<void> {
  try {
    const snapshot = await fetchSpyKpiSnapshot();
    updateSpy({ status: "live", data: snapshot, lastUpdated: new Date().toISOString() });
  } catch (err) {
    logger.warn({ err }, "spyKpi.poller: failed to refresh SPY KPI snapshot");
    const previous = getDashboardSnapshot().spy;
    updateSpy({
      status: "error",
      data: previous.data,
      lastUpdated: previous.lastUpdated,
      error: err instanceof Error ? err.message : "unknown error",
    });
  }
}

export function startSpyPoller(): void {
  void pollOnce();
  setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
}
