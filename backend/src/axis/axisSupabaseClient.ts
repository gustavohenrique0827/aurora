import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export const axisSupabase = createClient(env.AXIS_SUPABASE_URL, env.AXIS_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/** Tables read by the dashboard — same set already wired as real tools into the n8n Intelligence agents. */
export const AXIS_TABLES = [
  "leads",
  "clientes",
  "finance_entries",
  "contracts",
  "proposals",
  "dev_sprint_tasks",
  "dev_projects",
  "dev_issues",
] as const;

export type AxisTable = (typeof AXIS_TABLES)[number];
