import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export const spySupabase = createClient(env.SPY_SUPABASE_URL, (env.SPY_SUPABASE_SERVICE_ROLE_KEY ?? env.SPY_SUPABASE_ANON_KEY) as string, {
  auth: { persistSession: false },
});

/** Tables read by the dashboard — same set already wired as real tools into the n8n Intelligence agents. */
export const SPY_TABLES = [
  "leads",
  "clientes",
  "finance_entries",
  "contracts",
  "proposals",
  "dev_sprint_tasks",
  "dev_projects",
  "dev_issues",
] as const;

export type SpyTable = (typeof SPY_TABLES)[number];
