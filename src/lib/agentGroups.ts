import { Briefcase, Building2, Cpu, Microscope, Sparkles, Boxes, type LucideIcon } from "lucide-react";
import { DIRECTORS } from "@jarvis/shared";
import type { N8nWorkflowSummary } from "@jarvis/shared";

export const GTECH_PREFIX = "[G-TECH AI OS]";

export const AGENT_GROUP_ORDER = [
  "Diretoria Executiva",
  "Gerências",
  "Inteligência",
  "Robôs de Pesquisa",
  "Agentes Especiais",
  "Outras Automações",
] as const;
export type AgentGroup = (typeof AGENT_GROUP_ORDER)[number];

export const GROUP_ICON: Record<AgentGroup, LucideIcon> = {
  "Diretoria Executiva": Briefcase,
  Gerências: Building2,
  Inteligência: Sparkles,
  "Robôs de Pesquisa": Microscope,
  "Agentes Especiais": Cpu,
  "Outras Automações": Boxes,
};

export function bareName(name: string): string {
  return name.replace(/^\[[^\]]+\]\s*/, "");
}

/** Single source of truth for grouping a G-TECH AI OS workflow by category — shared by
 * AutomacoesPage (groups live n8n workflows) and ConsumoPage (groups token-usage rows), so the
 * two views never drift into different buckets for the same agent. */
export function classify(w: Pick<N8nWorkflowSummary, "name">): AgentGroup {
  // Anything outside the G-TECH AI OS roster is a client/CRM automation, not one of Aurora's
  // own team agents - keep it visible, but clearly apart from "who you can talk to".
  if (!w.name.startsWith(GTECH_PREFIX)) return "Outras Automações";
  const name = bareName(w.name);
  if (DIRECTORS.some((d) => d.name === name)) return "Diretoria Executiva";
  if (/ger[eê]ncia/i.test(name)) return "Gerências";
  if (/rob[oô] pesquisa/i.test(name)) return "Robôs de Pesquisa";
  if (/intelligence/i.test(name)) return "Inteligência";
  return "Agentes Especiais";
}
