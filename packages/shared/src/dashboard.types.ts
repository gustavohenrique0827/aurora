/**
 * Every dashboard data source is wrapped in DataState instead of being a bare value.
 * There is no code path that lets a fabricated number masquerade as real data:
 * a panel can only render "live"/"stale" data, or an honest "error"/"unavailable" state.
 */
export type DataStatus = "live" | "stale" | "error" | "unavailable";

export interface DataState<T> {
  status: DataStatus;
  data: T | null;
  lastUpdated: string | null;
  error?: string;
}

export interface N8nWorkflowSummary {
  id: string;
  name: string;
  active: boolean;
  lastExecutionStatus: "success" | "error" | "running" | "unknown" | null;
  lastExecutionAt: string | null;
}

export interface N8nSnapshot {
  workflows: N8nWorkflowSummary[];
  activeCount: number;
  inactiveCount: number;
}

export interface AxisTableCount {
  table: string;
  count: number;
}

export interface AxisRecentRow {
  table: string;
  id: string;
  label: string;
  createdAt: string;
}

export interface AxisKpiSnapshot {
  counts: AxisTableCount[];
  recent: AxisRecentRow[];
}

export interface WahaSnapshot {
  session: string;
  status: "WORKING" | "STARTING" | "SCAN_QR_CODE" | "FAILED" | "STOPPED" | "unknown";
}

export interface DashboardSnapshot {
  n8n: DataState<N8nSnapshot>;
  axis: DataState<AxisKpiSnapshot>;
  waha: DataState<WahaSnapshot>;
}
