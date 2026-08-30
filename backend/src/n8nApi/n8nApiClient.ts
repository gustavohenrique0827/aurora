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

export async function fetchLatestExecution(workflowId: string): Promise<N8nExecutionRaw | null> {
  const response = await client.get("/executions", {
    params: { workflowId, limit: 1 },
  });
  const data = (response.data?.data ?? []) as N8nExecutionRaw[];
  return data[0] ?? null;
}
