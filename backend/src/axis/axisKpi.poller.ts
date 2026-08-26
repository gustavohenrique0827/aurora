import { fetchAxisKpiSnapshot } from "./axisKpi.service";
import { getDashboardSnapshot, updateAxis } from "../dashboard/dashboard.aggregator";
import { logger } from "../utils/logger";

const POLL_INTERVAL_MS = 30_000;

async function pollOnce(): Promise<void> {
  try {
    const snapshot = await fetchAxisKpiSnapshot();
    updateAxis({ status: "live", data: snapshot, lastUpdated: new Date().toISOString() });
  } catch (err) {
    logger.warn({ err }, "axisKpi.poller: failed to refresh Axis KPI snapshot");
    const previous = getDashboardSnapshot().axis;
    updateAxis({
      status: "error",
      data: previous.data,
      lastUpdated: previous.lastUpdated,
      error: err instanceof Error ? err.message : "unknown error",
    });
  }
}

export function startAxisPoller(): void {
  void pollOnce();
  setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
}
