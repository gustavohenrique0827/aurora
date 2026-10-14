import type { TokenUsageByAgent, TokenUsageSnapshot } from "@jarvis/shared";
import { spySupabase } from "../spy/spySupabaseClient";

interface UsageRow {
  workflow_name: string;
  agent_group: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
}

/**
 * USD per 1M tokens, standard tier — confirmed 2026-09-01 at ai.google.dev/gemini-api/docs/pricing.
 * Every workflow in the fleet currently shares this one model; an unknown model falls back to $0
 * (never a guessed price) so a future model swap shows up as "custo indisponível" instead of a
 * silently wrong number.
 */
const PRICING_USD_PER_1M: Record<string, { prompt: number; completion: number }> = {
  "gemini-3.1-flash-lite": { prompt: 0.25, completion: 1.5 },
};

function costUsd(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING_USD_PER_1M[model];
  if (!pricing) return 0;
  return (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1_000_000;
}

export async function fetchTokenUsageSnapshot(): Promise<TokenUsageSnapshot> {
  // Fetched raw and aggregated here (not via a Postgres GROUP BY) because the row count is
  // small (per-call log, not per-token) and this keeps cost math in one place in JS instead of
  // duplicating the pricing table as SQL.
  const { data, error } = await spySupabase
    .from("ai_usage_log")
    .select("workflow_name, agent_group, model, prompt_tokens, completion_tokens, total_tokens, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw new Error(`ai_usage_log: ${error.message}`);

  const rows = (data ?? []) as UsageRow[];
  const byKey = new Map<string, TokenUsageByAgent>();

  for (const row of rows) {
    const key = `${row.workflow_name}::${row.model}`;
    const existing = byKey.get(key);
    const rowCost = costUsd(row.model, row.prompt_tokens, row.completion_tokens);

    if (!existing) {
      byKey.set(key, {
        workflowName: row.workflow_name,
        agentGroup: row.agent_group,
        model: row.model,
        calls: 1,
        promptTokens: row.prompt_tokens,
        completionTokens: row.completion_tokens,
        totalTokens: row.total_tokens,
        costUsd: rowCost,
        lastUsedAt: row.created_at,
      });
      continue;
    }

    existing.calls += 1;
    existing.promptTokens += row.prompt_tokens;
    existing.completionTokens += row.completion_tokens;
    existing.totalTokens += row.total_tokens;
    existing.costUsd += rowCost;
    if (row.created_at > existing.lastUsedAt) existing.lastUsedAt = row.created_at;
  }

  const byAgent = [...byKey.values()].sort((a, b) => b.costUsd - a.costUsd);

  return {
    totalTokens: byAgent.reduce((sum, a) => sum + a.totalTokens, 0),
    totalCostUsd: byAgent.reduce((sum, a) => sum + a.costUsd, 0),
    byAgent,
  };
}
