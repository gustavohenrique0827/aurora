import type { N8nSnapshot, N8nWorkflowSummary } from "@jarvis/shared";
import { fetchJarvisWorkflows, fetchLatestExecution } from "./n8nApiClient";
import { updateN8n, getDashboardSnapshot } from "../dashboard/dashboard.aggregator";
import { logger } from "../utils/logger";

const POLL_INTERVAL_MS = 20_000;

function mapExecutionStatus(status: string | undefined, finished: boolean): N8nWorkflowSummary["lastExecutionStatus"] {
  if (status === "success") return "success";
  if (status === "error" || status === "crashed" || status === "failed") return "error";
  if (!finished) return "running";
  return "unknown";
}

// Internal sub-workflows an agent calls (SPY CRUD, WhatsApp send/read, n8n introspection) are
// plumbing, not a role someone talks to - keep them out of the "agents" grouping in the UI.
function classifyKind(name: string): N8nWorkflowSummary["kind"] {
  const bare = name.replace(/^\[[^\]]+\]\s*/, "");
  if (/^(WA )?Tool\s*-/i.test(bare)) return "tool";
  return "agent";
}

async function pollOnce(): Promise<void> {
  try {
    const rawWorkflows = await fetchJarvisWorkflows();

    const workflows: N8nWorkflowSummary[] = await Promise.all(
      rawWorkflows.map(async (w) => {
        try {
          const execution = await fetchLatestExecution(w.id);
          return {
            id: w.id,
            name: w.name,
            active: w.active,
            lastExecutionStatus: execution ? mapExecutionStatus(execution.status, execution.finished) : null,
            lastExecutionAt: execution?.startedAt ?? null,
            kind: classifyKind(w.name),
          } satisfies N8nWorkflowSummary;
        } catch {
          return {
            id: w.id,
            name: w.name,
            active: w.active,
            lastExecutionStatus: null,
            lastExecutionAt: null,
            kind: classifyKind(w.name),
          } satisfies N8nWorkflowSummary;
        }
      })
    );

    const snapshot: N8nSnapshot = {
      workflows,
      activeCount: workflows.filter((w) => w.active).length,
      inactiveCount: workflows.filter((w) => !w.active).length,
    };

    updateN8n({ status: "live", data: snapshot, lastUpdated: new Date().toISOString() });
  } catch (err) {
    logger.warn({ err }, "n8nApi.poller: failed to refresh workflow snapshot");
    const previous = getDashboardSnapshot().n8n;
    updateN8n({
      status: "error",
      data: previous.data, // keep last known numbers visible, but clearly tagged as errored
      lastUpdated: previous.lastUpdated,
      error: err instanceof Error ? err.message : "unknown error",
    });
  }
}

export function startN8nPoller(): void {
  void pollOnce();
  setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
}
