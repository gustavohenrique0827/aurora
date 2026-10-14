import type { N8nSnapshot, N8nWorkflowSummary } from "@jarvis/shared";
import { fetchJarvisWorkflows, fetchLatestExecutionsByWorkflow } from "./n8nApiClient";

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

export async function fetchN8nSnapshot(): Promise<N8nSnapshot> {
  const [rawWorkflows, latestByWorkflow] = await Promise.all([
    fetchJarvisWorkflows(),
    // Execution history is secondary: if it fails, workflows still render with unknown status.
    fetchLatestExecutionsByWorkflow().catch(() => new Map<string, never>()),
  ]);

  const workflows: N8nWorkflowSummary[] = rawWorkflows.map((w) => {
    const execution = latestByWorkflow.get(w.id);
    return {
      id: w.id,
      name: w.name,
      active: w.active,
      lastExecutionStatus: execution ? mapExecutionStatus(execution.status, execution.finished) : null,
      lastExecutionAt: execution?.startedAt ?? null,
      kind: classifyKind(w.name),
    };
  });

  return {
    workflows,
    activeCount: workflows.filter((w) => w.active).length,
    inactiveCount: workflows.filter((w) => !w.active).length,
  };
}
