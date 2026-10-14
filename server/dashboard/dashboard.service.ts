import type { DashboardSnapshot, DataState } from "@jarvis/shared";
import { fetchN8nSnapshot } from "../n8nApi/n8nApi.snapshot";
import { fetchSpyKpiSnapshot } from "../spy/spyKpi.service";
import { fetchWahaSessionStatus } from "../waha/wahaClient";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Serverless has no long-lived pollers, so each source is fetched on demand and cached briefly
 * per warm instance. A failed refresh keeps the last good data tagged "error" (never invented
 * numbers) — same "real data or honest empty state" rule as before.
 */
const TTL_MS = 20_000;

function cachedSource<T>(name: string, fetcher: () => Promise<T>): () => Promise<DataState<T>> {
  let state: DataState<T> = { status: "unavailable", data: null, lastUpdated: null };
  let fetchedAt = 0;
  let inflight: Promise<DataState<T>> | null = null;

  return async () => {
    if (Date.now() - fetchedAt < TTL_MS) return state;
    inflight ??= (async () => {
      try {
        state = { status: "live", data: await fetcher(), lastUpdated: new Date().toISOString() };
      } catch (err) {
        logger.warn({ err }, `dashboard: failed to refresh ${name}`);
        state = {
          status: "error",
          data: state.data,
          lastUpdated: state.lastUpdated,
          error: err instanceof Error ? err.message : "unknown error",
        };
      }
      fetchedAt = Date.now();
      return state;
    })().finally(() => {
      inflight = null;
    });
    return inflight;
  };
}

const n8n = cachedSource("n8n", fetchN8nSnapshot);
const spy = cachedSource("spy", fetchSpyKpiSnapshot);
const waha = cachedSource("waha", async () => ({ session: env.WAHA_SESSION, status: await fetchWahaSessionStatus() }));

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [n8nState, spyState, wahaState] = await Promise.all([n8n(), spy(), waha()]);
  return { n8n: n8nState, spy: spyState, waha: wahaState };
}
