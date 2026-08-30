import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DIRECTORS } from "@jarvis/shared";
import type { N8nWorkflowSummary } from "@jarvis/shared";
import {
  Workflow,
  Cpu,
  ArrowRight,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Minus,
  Briefcase,
  Building2,
  Microscope,
  Sparkles,
  Boxes,
} from "lucide-react";
import { GlassPanel } from "../components/common/GlassPanel";
import { DataStateBadge } from "../components/dashboard/DataStateBadge";
import { NotConnectedPanel } from "../components/dashboard/panels/NotConnectedPanel";
import { LoadingPulse } from "../components/common/LoadingPulse";
import { useDashboardData } from "../hooks/useDashboardData";

const GTECH_PREFIX = "[G-TECH AI OS]";

const AGENT_GROUP_ORDER = [
  "Diretoria Executiva",
  "Gerências",
  "Inteligência",
  "Robôs de Pesquisa",
  "Agentes Especiais",
  "Outras Automações",
] as const;
type AgentGroup = (typeof AGENT_GROUP_ORDER)[number];

const GROUP_ICON: Record<AgentGroup, typeof Briefcase> = {
  "Diretoria Executiva": Briefcase,
  Gerências: Building2,
  Inteligência: Sparkles,
  "Robôs de Pesquisa": Microscope,
  "Agentes Especiais": Cpu,
  "Outras Automações": Boxes,
};

function bareName(name: string): string {
  return name.replace(/^\[[^\]]+\]\s*/, "");
}

function classify(w: N8nWorkflowSummary): AgentGroup {
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

type ToolGroup = "Axis (CRM/ERP)" | "WhatsApp" | "n8n" | "Outras";

function classifyTool(w: N8nWorkflowSummary): ToolGroup {
  const name = bareName(w.name);
  if (/^WA Tool/i.test(name) || /whatsapp/i.test(name)) return "WhatsApp";
  if (/axis/i.test(name)) return "Axis (CRM/ERP)";
  if (/n8n/i.test(name)) return "n8n";
  return "Outras";
}

const TOOL_GROUP_ORDER: ToolGroup[] = ["Axis (CRM/ERP)", "WhatsApp", "n8n", "Outras"];

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

function ExecutionStatusDot({ w }: { w: N8nWorkflowSummary }) {
  const label = timeAgo(w.lastExecutionAt);
  if (!label) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-white/25" title="Sem execução registrada ainda">
        <Minus size={11} />
      </span>
    );
  }
  const config = {
    success: { icon: CheckCircle2, className: "text-jarvis-green" },
    error: { icon: XCircle, className: "text-jarvis-red" },
    running: { icon: Loader2, className: "text-jarvis-amber animate-spin" },
    unknown: { icon: Minus, className: "text-white/25" },
  }[w.lastExecutionStatus ?? "unknown"];
  const Icon = config.icon;
  return (
    <span
      className={`flex shrink-0 items-center gap-1 font-mono text-[9px] ${config.className}`}
      title={`Última execução: ${label}`}
    >
      <Icon size={11} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function CollapsibleGroup({
  title,
  count,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  icon?: typeof Briefcase;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-jarvis-cyan/15 bg-[#0a0f1d]/75 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 border-b border-jarvis-cyan/15 bg-black/30 px-4 py-2.5 text-left hover:bg-black/40"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-jarvis-cyanBright" />
          {Icon && <Icon size={12} className="text-white/30" />}
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white/80">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-white/30">{count}</span>
          <ChevronDown size={14} className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && <div className="p-4">{children}</div>}
      <div className="pointer-events-none absolute top-0 right-0 h-2 w-2 border-t border-r border-jarvis-cyan/30" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-jarvis-cyan/30" />
    </div>
  );
}

function WorkflowCard({ w }: { w: N8nWorkflowSummary }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3 transition-all hover:border-jarvis-cyan/40 hover:bg-black/50">
      <div className="flex min-w-0 items-start gap-2">
        <Workflow size={13} className={`mt-0.5 shrink-0 ${w.active ? "text-jarvis-cyanBright" : "text-white/30"}`} />
        <span className="break-words font-mono text-xs leading-snug text-white/85">{bareName(w.name)}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={`rounded-md px-2 py-0.5 font-mono text-[9px] font-bold ${
            w.active
              ? "border border-jarvis-green/30 bg-jarvis-green/20 text-jarvis-green"
              : "bg-white/5 text-white/30"
          }`}
        >
          {w.active ? "ATIVO" : "INATIVO"}
        </span>
        <ExecutionStatusDot w={w} />
      </div>
    </li>
  );
}

const TOOLS_GROUP_KEY = "Ferramentas Internas";
const ALL_GROUP_KEYS: string[] = [...AGENT_GROUP_ORDER, TOOLS_GROUP_KEY];

export function AutomacoesPage() {
  const { snapshot, socketConnected } = useDashboardData();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_GROUP_KEYS.map((key) => [key, true]))
  );

  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  const setAllGroups = (value: boolean) =>
    setOpenGroups(Object.fromEntries(ALL_GROUP_KEYS.map((key) => [key, value])));

  if (!socketConnected || !snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingPulse label="Sincronizando Workflows do n8n..." />
      </div>
    );
  }

  const { n8n } = snapshot;

  if (!n8n.data) {
    return (
      <div className="p-5">
        <GlassPanel title="Automações (n8n)" action={<DataStateBadge status={n8n.status} lastUpdated={n8n.lastUpdated} />}>
          <NotConnectedPanel reason={n8n.error ?? "Sem credencial de API do n8n configurada"} />
        </GlassPanel>
      </div>
    );
  }

  const agents = n8n.data.workflows.filter((w) => w.kind === "agent");
  const tools = n8n.data.workflows.filter((w) => w.kind === "tool");

  const groups = AGENT_GROUP_ORDER.map((label) => ({
    label,
    workflows: agents.filter((w) => classify(w) === label),
  })).filter((g) => g.workflows.length > 0);

  const toolGroups = TOOL_GROUP_ORDER.map((label) => ({
    label,
    workflows: tools.filter((w) => classifyTool(w) === label),
  })).filter((g) => g.workflows.length > 0);

  const agentActiveCount = agents.filter((w) => w.active).length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 font-sans">
      {/* 1. Top Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-jarvis-cyan/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold tracking-wide text-white">Automações &amp; Agentes</h1>
            <DataStateBadge status={n8n.status} lastUpdated={n8n.lastUpdated} />
          </div>
          <p className="font-mono text-xs text-white/40">
            {agents.length} agentes · {tools.length} ferramentas internas · {n8n.data.workflows.length} workflows no total
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-jarvis-green shadow-[0_0_6px_#5cffb0]" />
            <span className="font-bold text-jarvis-green">{agentActiveCount} ativos</span>
            <span className="text-white/30">•</span>
            <span className="text-white/40">{agents.length - agentActiveCount} inativos</span>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-0.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setAllGroups(true)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-white/50 hover:bg-white/10 hover:text-white/80"
            >
              <ChevronsDown size={12} />
              <span>Abrir tudo</span>
            </button>
            <button
              type="button"
              onClick={() => setAllGroups(false)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-white/50 hover:bg-white/10 hover:text-white/80"
            >
              <ChevronsUp size={12} />
              <span>Fechar tudo</span>
            </button>
          </div>

          <Link
            to="/directors/cto"
            className="flex items-center gap-1.5 rounded-full border border-jarvis-cyan/40 bg-jarvis-cyan/15 px-3.5 py-1 font-mono text-xs font-semibold text-jarvis-cyanBright hover:bg-jarvis-cyan/25 transition-all shadow-[0_0_15px_rgba(79,215,255,0.15)]"
          >
            <Cpu size={13} />
            <span>Falar com CTO AI</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* 2. Categorized Agent Groups - each one a dropdown, open/closed state lifted so "abrir/fechar tudo" can drive them all */}
      {groups.map((group) => (
        <CollapsibleGroup
          key={group.label}
          title={group.label}
          count={group.workflows.length}
          icon={GROUP_ICON[group.label]}
          open={openGroups[group.label] ?? true}
          onToggle={() => toggleGroup(group.label)}
        >
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.workflows.map((w) => (
              <WorkflowCard key={w.id} w={w} />
            ))}
          </ul>
        </CollapsibleGroup>
      ))}

      {/* 3. Internal tools - plumbing the agents above call, not agents themselves */}
      {tools.length > 0 && (
        <CollapsibleGroup
          title={TOOLS_GROUP_KEY}
          count={tools.length}
          icon={Boxes}
          open={openGroups[TOOLS_GROUP_KEY] ?? true}
          onToggle={() => toggleGroup(TOOLS_GROUP_KEY)}
        >
          <div className="flex flex-col gap-3">
            {toolGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  {group.label} ({group.workflows.length})
                </p>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {group.workflows.map((w) => (
                    <WorkflowCard key={w.id} w={w} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CollapsibleGroup>
      )}
    </div>
  );
}
