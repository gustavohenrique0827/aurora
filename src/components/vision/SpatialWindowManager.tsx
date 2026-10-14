import { useState, useRef } from "react";
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  TrendingUp,
  Users,
  Wallet,
  CheckSquare,
  Workflow,
  MessageCircle,
  Sparkles,
  Presentation,
  Bot,
  ExternalLink,
  Activity,
} from "lucide-react";
import { useJarvisStore } from "../../state/store";
import { useDashboardData } from "../../hooks/useDashboardData";
import { DataStateBadge } from "../dashboard/DataStateBadge";
import type { SpatialWindow, SpatialWindowType } from "@jarvis/shared";

interface SpatialWindowManagerProps {
  /** If true, renders within the projector view canvas */
  projectorView?: boolean;
}

const TABLE_LABEL: Record<string, string> = {
  leads: "Leads",
  clientes: "Clientes",
  finance_entries: "Financeiro",
  contracts: "Contratos",
  proposals: "Propostas",
  dev_sprint_tasks: "Tarefas Sprint",
  dev_projects: "Projetos Dev",
  dev_issues: "Issues Dev",
};

function getSpyCount(counts: Array<{ table: string; count: number }> | undefined, table: string): number | null {
  if (!counts) return null;
  const match = counts.find((c) => c.table === table);
  return match ? match.count : null;
}

export function SpatialWindowManager({ projectorView = false }: SpatialWindowManagerProps) {
  const spatialWindows = useJarvisStore((s) => s.spatialWindows);
  const removeSpatialWindow = useJarvisStore((s) => s.removeSpatialWindow);
  const updateSpatialWindow = useJarvisStore((s) => s.updateSpatialWindow);
  const focusSpatialWindow = useJarvisStore((s) => s.focusSpatialWindow);
  const toggleMinimizeWindow = useJarvisStore((s) => s.toggleMinimizeWindow);
  const toggleMaximizeWindow = useJarvisStore((s) => s.toggleMaximizeWindow);

  const { snapshot, apiConnected } = useDashboardData();

  // Dragging state for mouse/touch
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDownHeader = (id: string, e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    focusSpatialWindow(id);
    const win = spatialWindows.find((w) => w.id === id);
    if (!win) return;
    setDraggingId(id);
    dragOffsetRef.current = { x: e.clientX - win.x, y: e.clientY - win.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveHeader = (id: string, e: React.PointerEvent) => {
    if (draggingId !== id) return;
    const newX = Math.max(10, e.clientX - dragOffsetRef.current.x);
    const newY = Math.max(50, e.clientY - dragOffsetRef.current.y);
    updateSpatialWindow(id, { x: newX, y: newY });
  };

  const handlePointerUpHeader = (id: string, e: React.PointerEvent) => {
    if (draggingId === id) {
      setDraggingId(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  };

  const getWindowIcon = (type: SpatialWindowType) => {
    switch (type) {
      case "vendas":
        return <TrendingUp size={14} className="text-jarvis-green" />;
      case "crm":
        return <Users size={14} className="text-jarvis-accentBright" />;
      case "financeiro":
        return <Wallet size={14} className="text-jarvis-amber" />;
      case "projetos":
        return <CheckSquare size={14} className="text-jarvis-accent" />;
      case "automacoes":
        return <Workflow size={14} className="text-purple-400" />;
      case "waha":
        return <MessageCircle size={14} className="text-green-400" />;
      case "apresentacao":
        return <Presentation size={14} className="text-jarvis-accentBright" />;
      case "demo":
        return <Sparkles size={14} className="text-yellow-300" />;
      default:
        return <Bot size={14} className="text-jarvis-accent" />;
    }
  };

  const renderWindowContent = (win: SpatialWindow) => {
    if (!snapshot) {
      return (
        <div className="flex h-32 items-center justify-center p-4 text-xs text-white/50">
          <Activity size={14} className="mr-2 animate-spin text-jarvis-accent" /> Conectando aos dados reais...
        </div>
      );
    }

    const { spy, n8n, waha } = snapshot;

    switch (win.type) {
      case "vendas": {
        const contractsCount = getSpyCount(spy.data?.counts, "contracts");
        const proposalsCount = getSpyCount(spy.data?.counts, "proposals");
        const clientesCount = getSpyCount(spy.data?.counts, "clientes");

        return (
          <div
            className="space-y-3 p-4 text-xs"
            data-gesture-label="Painel de Vendas e Contratos do SPY"
          >
            <div className="flex items-center justify-between">
              <span className="text-white/60">Status SPY</span>
              <DataStateBadge status={spy.status} lastUpdated={spy.lastUpdated} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Contratos</div>
                <div className="font-mono text-lg font-bold text-jarvis-green">
                  {contractsCount !== null ? contractsCount : "--"}
                </div>
              </div>
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Propostas</div>
                <div className="font-mono text-lg font-bold text-jarvis-accentBright">
                  {proposalsCount !== null ? proposalsCount : "--"}
                </div>
              </div>
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Clientes</div>
                <div className="font-mono text-lg font-bold text-white">
                  {clientesCount !== null ? clientesCount : "--"}
                </div>
              </div>
            </div>

            {spy.data?.recent && spy.data.recent.length > 0 && (
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">Registros Recentes</div>
                <ul className="max-h-24 space-y-1 overflow-y-auto font-mono text-[11px] text-white/70">
                  {spy.data.recent
                    .filter((r) => r.table === "contracts" || r.table === "proposals" || r.table === "clientes")
                    .slice(0, 3)
                    .map((row) => (
                      <li key={`${row.table}-${row.id}`} className="flex justify-between rounded bg-black/30 p-1.5 border border-jarvis-border/30">
                        <span className="truncate">{row.label}</span>
                        <span className="shrink-0 text-white/40">{TABLE_LABEL[row.table] ?? row.table}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

      case "crm": {
        const leadsCount = getSpyCount(spy.data?.counts, "leads");
        const clientesCount = getSpyCount(spy.data?.counts, "clientes");

        return (
          <div className="space-y-3 p-4 text-xs" data-gesture-label="Funil de Leads e CRM do SPY">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/80">Leads & Clientes</span>
              <DataStateBadge status={spy.status} lastUpdated={spy.lastUpdated} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Total Leads</div>
                <div className="font-mono text-lg font-bold text-jarvis-accentBright">
                  {leadsCount !== null ? leadsCount : "--"}
                </div>
              </div>
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Clientes Ativos</div>
                <div className="font-mono text-lg font-bold text-jarvis-green">
                  {clientesCount !== null ? clientesCount : "--"}
                </div>
              </div>
            </div>

            {spy.data?.recent && spy.data.recent.length > 0 && (
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">Últimos Cadastros</div>
                <ul className="max-h-24 space-y-1 overflow-y-auto font-mono text-[11px] text-white/70">
                  {spy.data.recent
                    .filter((r) => r.table === "leads" || r.table === "clientes")
                    .slice(0, 3)
                    .map((row) => (
                      <li key={`${row.table}-${row.id}`} className="flex justify-between rounded bg-black/30 p-1.5 border border-jarvis-border/30">
                        <span className="truncate">{row.label}</span>
                        <span className="shrink-0 text-jarvis-accentBright">{TABLE_LABEL[row.table] ?? row.table}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

      case "financeiro": {
        const financeCount = getSpyCount(spy.data?.counts, "finance_entries");
        const contractsCount = getSpyCount(spy.data?.counts, "contracts");

        return (
          <div className="space-y-3 p-4 text-xs" data-gesture-label="Painel Financeiro do SPY">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/80">Lançamentos Financeiros</span>
              <DataStateBadge status={spy.status} lastUpdated={spy.lastUpdated} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Lançamentos Registrados</div>
                <div className="font-mono text-lg font-bold text-jarvis-amber">
                  {financeCount !== null ? financeCount : "--"}
                </div>
              </div>
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Contratos Faturados</div>
                <div className="font-mono text-lg font-bold text-jarvis-green">
                  {contractsCount !== null ? contractsCount : "--"}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-black/40 p-2 font-mono text-[10px] text-white/60 border border-jarvis-border/30">
              Sincronizado com Supabase SPY • Dados reais
            </div>
          </div>
        );
      }

      case "projetos": {
        const sprintCount = getSpyCount(spy.data?.counts, "dev_sprint_tasks");
        const projectsCount = getSpyCount(spy.data?.counts, "dev_projects");
        const issuesCount = getSpyCount(spy.data?.counts, "dev_issues");

        return (
          <div className="space-y-3 p-4 text-xs" data-gesture-label="Quadro de Tarefas de Sprint e Projetos">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/80">Desenvolvimento & Sprints</span>
              <DataStateBadge status={spy.status} lastUpdated={spy.lastUpdated} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Tarefas Sprint</div>
                <div className="font-mono text-lg font-bold text-jarvis-green">
                  {sprintCount !== null ? sprintCount : "--"}
                </div>
              </div>
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Projetos</div>
                <div className="font-mono text-lg font-bold text-jarvis-accent">
                  {projectsCount !== null ? projectsCount : "--"}
                </div>
              </div>
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 p-2.5">
                <div className="text-[10px] text-white/40">Issues</div>
                <div className="font-mono text-lg font-bold text-jarvis-amber">
                  {issuesCount !== null ? issuesCount : "--"}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "automacoes": {
        return (
          <div className="space-y-3 p-4 text-xs" data-gesture-label="Workflows do n8n">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/80">Workflows n8n</span>
              <DataStateBadge status={n8n.status} lastUpdated={n8n.lastUpdated} />
            </div>

            <div className="flex gap-4">
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 px-3 py-2">
                <div className="font-mono text-lg font-bold text-jarvis-green">
                  {n8n.data ? n8n.data.activeCount : "--"}
                </div>
                <div className="text-[10px] uppercase text-white/40">Ativos</div>
              </div>
              <div className="rounded-lg border border-jarvis-border/60 bg-black/30 px-3 py-2">
                <div className="font-mono text-lg font-bold text-white/40">
                  {n8n.data ? n8n.data.inactiveCount : "--"}
                </div>
                <div className="text-[10px] uppercase text-white/40">Inativos</div>
              </div>
            </div>

            {n8n.data?.workflows && (
              <ul className="max-h-28 space-y-1 overflow-y-auto font-mono text-[10px]">
                {n8n.data.workflows.slice(0, 4).map((w) => (
                  <li key={w.id} className="flex items-center justify-between rounded bg-black/30 p-1.5 border border-jarvis-border/30 text-white/70">
                    <span className="truncate">{w.name.replace("[G-TECH AI OS] ", "")}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] ${w.active ? "bg-jarvis-green/20 text-jarvis-green" : "bg-white/10 text-white/30"}`}>
                      {w.active ? "ATIVO" : "INATIVO"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      case "waha": {
        const isWorking = waha.data?.status === "WORKING";

        return (
          <div className="space-y-3 p-4 text-xs" data-gesture-label="Status do WhatsApp WAHA">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/80">WhatsApp (WAHA)</span>
              <DataStateBadge status={waha.status} lastUpdated={waha.lastUpdated} />
            </div>

            <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isWorking ? "bg-jarvis-green shadow-[0_0_8px_#36ffb0]" : "bg-jarvis-amber"}`} />
                <span className="font-mono text-sm font-bold text-white">
                  {isWorking ? "CONECTADO & OPERANDO" : waha.data?.status ?? "OFFLINE"}
                </span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-white/40">
                Sessão: {waha.data?.session ?? "default"}
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-4 text-xs text-white/60">
            Módulo {win.title} conectado à IA Aurora.
          </div>
        );
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {spatialWindows.map((win) => {
        if (win.minimized) return null;

        const isMaximized = win.maximized;
        const style = isMaximized
          ? { left: 20, top: 60, width: "calc(100% - 40px)", height: "calc(100% - 80px)", zIndex: win.zIndex }
          : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex };

        return (
          <div
            key={win.id}
            data-gesture-window="true"
            data-gesture-label={win.title}
            onPointerDown={() => focusSpatialWindow(win.id)}
            style={style}
            className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-2xl border border-jarvis-accent/40 bg-jarvis-panel/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_15px_rgba(255,122,26,0.15)] transition-all duration-75"
          >
            {/* Holographic Window Header */}
            <div
              onPointerDown={(e) => handlePointerDownHeader(win.id, e)}
              onPointerMove={(e) => handlePointerMoveHeader(win.id, e)}
              onPointerUp={(e) => handlePointerUpHeader(win.id, e)}
              className="flex cursor-grab select-none items-center justify-between border-b border-jarvis-border/80 bg-black/40 px-3.5 py-2.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                {getWindowIcon(win.type)}
                <span className="text-xs font-bold tracking-wide text-white">{win.title}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMinimizeWindow(win.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-jarvis-border/80 bg-black/30 text-white/60 hover:bg-white/10 hover:text-white"
                  title="Minimizar"
                >
                  <Minus size={12} />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMaximizeWindow(win.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-jarvis-border/80 bg-black/30 text-white/60 hover:bg-white/10 hover:text-white"
                  title="Maximizar"
                >
                  {win.maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    removeSpatialWindow(win.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSpatialWindow(win.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-jarvis-red/40 bg-jarvis-red/20 text-red-300 hover:bg-jarvis-red hover:text-white transition-colors"
                  title="Fechar Janela"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="flex-1 overflow-y-auto">{renderWindowContent(win)}</div>

            {/* Futuristic Corner Tech Accents */}
            <div className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-jarvis-accentBright" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-jarvis-accentBright" />
          </div>
        );
      })}
    </div>
  );
}
