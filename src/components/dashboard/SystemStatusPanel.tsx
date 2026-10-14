import type { DashboardSnapshot } from "@jarvis/shared";
import { GlassPanel } from "../common/GlassPanel";
import { DataStateBadge } from "./DataStateBadge";

const ROWS: { key: keyof DashboardSnapshot; label: string }[] = [
  { key: "n8n", label: "n8n (workflows)" },
  { key: "spy", label: "SPY (CRM/ERP)" },
  { key: "waha", label: "WhatsApp (WAHA)" },
];

/**
 * Deliberately replaces the "live activity feed" seen in generic AI-dashboard mockups: this
 * project has no real event stream (no execution log ingested, no named always-on agents
 * like "Júlia"/"Closer" actually running) — inventing one would violate DataState<T>. What
 * IS real is the health of each integration, so that's what this shows.
 */
export function SystemStatusPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <GlassPanel title="Estado das integrações">
      <ul className="space-y-2.5">
        {ROWS.map(({ key, label }) => {
          const state = snapshot[key];
          return (
            <li key={key} className="flex items-center justify-between border-b border-jarvis-border/40 pb-2.5 last:border-0 last:pb-0">
              <span className="text-xs text-white/70">{label}</span>
              <DataStateBadge status={state.status} lastUpdated={state.lastUpdated} />
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
