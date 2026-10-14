import axios from "axios";
import { env } from "../config/env";

const client = axios.create({
  baseURL: env.N8N_API_URL,
  timeout: 15_000,
  headers: { "X-N8N-API-KEY": env.N8N_API_KEY },
});

interface N8nWorkflowRaw {
  id: string;
  name: string;
  active: boolean;
}

interface N8nExecutionRaw {
  id: string;
  workflowId?: string;
  status?: string;
  finished: boolean;
  startedAt: string;
  stoppedAt: string | null;
}

// Gustavo owns the whole n8n instance and this dashboard is private to him (requireAuth) - show
// every workflow that exists, not just the ones under the "[G-TECH AI OS]" prefix. The frontend
// groups/labels them; nothing gets excluded here.
export async function fetchJarvisWorkflows(): Promise<N8nWorkflowRaw[]> {
  const workflows: N8nWorkflowRaw[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.get("/workflows", {
      params: { limit: 100, cursor },
    });
    const page = (response.data?.data ?? []) as N8nWorkflowRaw[];
    workflows.push(...page);
    cursor = response.data?.nextCursor ?? undefined;
  } while (cursor);

  return workflows;
}

/**
 * Latest execution per workflow from a few bulk pages (newest first) instead of one request per
 * workflow — ~270 sequential-ish calls made a cold serverless snapshot take >10s. A workflow with
 * no execution in the scanned window is reported as unknown (null), never guessed.
 */
export async function fetchLatestExecutionsByWorkflow(maxPages = 4): Promise<Map<string, N8nExecutionRaw>> {
  const latest = new Map<string, N8nExecutionRaw>();
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const response = await client.get("/executions", { params: { limit: 250, cursor } });
    for (const execution of (response.data?.data ?? []) as N8nExecutionRaw[]) {
      if (execution.workflowId && !latest.has(execution.workflowId)) latest.set(execution.workflowId, execution);
    }
    cursor = response.data?.nextCursor ?? undefined;
    if (!cursor) break;
  }

  return latest;
}
