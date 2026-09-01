export interface TokenUsageByAgent {
  workflowName: string;
  agentGroup: string;
  model: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  lastUsedAt: string;
}

export interface TokenUsageSnapshot {
  totalTokens: number;
  totalCostUsd: number;
  byAgent: TokenUsageByAgent[];
}
