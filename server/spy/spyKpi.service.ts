import type { SpyKpiSnapshot, SpyRecentRow, SpyTableCount } from "@jarvis/shared";
import { spySupabase, SPY_TABLES, type SpyTable } from "./spySupabaseClient";
import { env } from "../config/env";

/** Real column confirmed per table (via information_schema) — used only to render a human label, never guessed. */
const LABEL_COLUMN: Record<SpyTable, string> = {
  leads: "name",
  clientes: "name",
  finance_entries: "description",
  contracts: "title",
  proposals: "titulo",
  dev_sprint_tasks: "title",
  dev_projects: "name",
  dev_issues: "title",
};

/**
 * Confirmed via direct SQL (2026-07-30): finance_entries and dev_sprint_tasks have real rows
 * whose tenant_id is NULL (not tagged), unlike every other SPY table. Since the project is
 * confirmed single-tenant, we treat NULL as "belongs to the only tenant" here — a query-level
 * workaround, not a data mutation. Revisit if SPY ever backfills tenant_id on these tables.
 */
const TABLES_WITH_NULLABLE_TENANT = new Set<SpyTable>(["finance_entries", "dev_sprint_tasks"]);

function applyTenantFilter<T>(query: T, table: SpyTable): T {
  const q = query as unknown as { eq: (col: string, val: string) => T; or: (filter: string) => T };
  if (TABLES_WITH_NULLABLE_TENANT.has(table)) {
    return q.or(`tenant_id.eq.${env.SPY_TENANT_ID},tenant_id.is.null`);
  }
  return q.eq("tenant_id", env.SPY_TENANT_ID);
}

async function countForTable(table: SpyTable): Promise<SpyTableCount> {
  const base = spySupabase.from(table).select("*", { count: "exact", head: true });
  const { count, error } = await applyTenantFilter(base, table);

  if (error) throw new Error(`${table}: ${error.message}`);
  return { table, count: count ?? 0 };
}

async function recentForTable(table: SpyTable): Promise<SpyRecentRow[]> {
  const labelColumn = LABEL_COLUMN[table];
  const base = spySupabase.from(table).select(`id, created_at, ${labelColumn}` as "*");
  const { data, error } = await applyTenantFilter(base, table)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw new Error(`${table}: ${error.message}`);

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const record = row;
    return {
      table,
      id: String(record.id),
      label: typeof record[labelColumn] === "string" ? (record[labelColumn] as string) : `(${table})`,
      createdAt: String(record.created_at),
    };
  });
}

export async function fetchSpyKpiSnapshot(): Promise<SpyKpiSnapshot> {
  const counts = await Promise.all(SPY_TABLES.map(countForTable));

  const recentPerTable = await Promise.all(SPY_TABLES.map(recentForTable));
  const recent = recentPerTable
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return { counts, recent };
}
