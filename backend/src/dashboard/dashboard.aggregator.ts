import type { AxisKpiSnapshot, DashboardSnapshot, DataState, N8nSnapshot, WahaSnapshot } from "@jarvis/shared";

/**
 * In-memory store for the latest known state of each dashboard data source.
 * This is the one place the "real data or honest empty state" rule is enforced:
 * pollers can only ever set a DataState, never a bare value, so there is no code
 * path anywhere downstream that can render a fabricated number as if it were real.
 */

type Listener = (snapshot: DashboardSnapshot) => void;

const unavailable = <T>(): DataState<T> => ({ status: "unavailable", data: null, lastUpdated: null });

let snapshot: DashboardSnapshot = {
  n8n: unavailable<N8nSnapshot>(),
  axis: unavailable<AxisKpiSnapshot>(),
  waha: unavailable<WahaSnapshot>(),
};

const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener(snapshot);
}

export function onDashboardUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDashboardSnapshot(): DashboardSnapshot {
  return snapshot;
}

export function updateN8n(state: DataState<N8nSnapshot>): void {
  snapshot = { ...snapshot, n8n: state };
  notify();
}

export function updateAxis(state: DataState<AxisKpiSnapshot>): void {
  snapshot = { ...snapshot, axis: state };
  notify();
}

export function updateWaha(state: DataState<WahaSnapshot>): void {
  snapshot = { ...snapshot, waha: state };
  notify();
}
