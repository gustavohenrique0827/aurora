import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Bell, Search, LogOut, Menu, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";
import { useJarvisStore } from "../../state/store";
import { useDashboardData } from "../../hooks/useDashboardData";
import { CommandPalette } from "./CommandPalette";
import { CameraPermissionGate } from "../vision/CameraPermissionGate";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

function getBreadcrumb(pathname: string): { parent?: string; title: string } {
  if (pathname === "/") return { title: "Central de Comando" };
  if (pathname.startsWith("/aurora") || pathname.startsWith("/vision")) return { title: "Aurora Core" };
  if (pathname.startsWith("/directors/ceo")) return { parent: "Diretoria", title: "CEO AI" };
  if (pathname.startsWith("/directors/cco")) return { parent: "Diretoria", title: "Comercial (CCO)" };
  if (pathname.startsWith("/directors/cmo")) return { parent: "Diretoria", title: "Marketing (CMO)" };
  if (pathname.startsWith("/directors/cfo")) return { parent: "Diretoria", title: "Financeiro (CFO)" };
  if (pathname.startsWith("/directors/cto")) return { parent: "Diretoria", title: "Tecnologia (CTO)" };
  if (pathname.startsWith("/directors/cpo")) return { parent: "Diretoria", title: "Produto (CPO)" };
  if (pathname.startsWith("/directors/coo")) return { parent: "Diretoria", title: "Projetos (COO)" };
  if (pathname.startsWith("/directors")) return { parent: "Diretoria", title: "Painel do Diretor" };
  if (pathname.startsWith("/crm")) return { parent: "Operações", title: "CRM & Clientes" };
  if (pathname.startsWith("/automacoes")) return { parent: "Operações", title: "Automações n8n" };
  if (pathname.startsWith("/consumo")) return { parent: "Operações", title: "Consumo de Tokens" };
  if (pathname.startsWith("/agentes")) return { parent: "Operações", title: "Roster de Agentes" };
  if (pathname.startsWith("/memoria")) return { parent: "Sistema", title: "Memória" };
  if (pathname.startsWith("/analytics")) return { parent: "Sistema", title: "Analytics" };
  if (pathname.startsWith("/configuracoes")) return { parent: "Sistema", title: "Configurações" };
  return { title: "Aurora AI OS" };
}

export function TopBar() {
  const location = useLocation();
  const [clock, setClock] = useState(() => new Date());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const setAuthenticated = useJarvisStore((s) => s.setAuthenticated);
  const apiConnected = useJarvisStore((s) => s.apiConnected);
  const toggleMobileNav = useJarvisStore((s) => s.toggleMobileNav);
  const { snapshot } = useDashboardData();

  const breadcrumb = getBreadcrumb(location.pathname);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setAuthenticated(false);
  };

  const n8n = snapshot?.n8n;
  const totalAgents = n8n?.data ? n8n.data.activeCount + n8n.data.inactiveCount : null;
  const systemLabel = !apiConnected ? "Reconectando" : n8n?.status === "error" ? "Degradado" : "Online";
  const systemColor = !apiConnected ? "bg-jarvis-red shadow-[0_0_8px_#ff5c7a]" : n8n?.status === "error" ? "bg-jarvis-amber shadow-[0_0_8px_#ffb454]" : "bg-jarvis-green shadow-[0_0_8px_#5cffb0]";

  return (
    <header className="relative z-50 flex items-center justify-between px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pb-4 sm:pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Left: Brand & Route Breadcrumb */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggleMobileNav}
          className="text-white/50 transition-colors hover:text-white/80 md:hidden"
          title="Abrir menu"
        >
          <Menu size={19} />
        </button>

        {/* Logo (same mark as the immersive Aurora view) */}
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-jarvis-accent/60 bg-black/40">
            <span className="h-3.5 w-3.5 rounded-full bg-jarvis-accent shadow-[0_0_12px_#ff7a1a]" />
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="font-display text-lg font-semibold tracking-[0.18em] text-white">AURORA</div>
            <div className="text-[10px] font-semibold tracking-[0.2em] text-jarvis-accent">AI OS</div>
          </div>
        </Link>

        {/* Dynamic Breadcrumb (Where am I?) */}
        <div className="hidden items-center gap-1.5 border-l border-white/10 pl-3.5 font-mono text-xs text-white/40 md:flex">
          {breadcrumb.parent && (
            <>
              <span className="text-white/40">{breadcrumb.parent}</span>
              <ChevronRight size={12} className="text-white/25" />
            </>
          )}
          <span className="font-semibold text-white/90">{breadcrumb.title}</span>
        </div>
      </div>

      {/* Center: Command Search Bar */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="group hidden items-center gap-3 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs text-white/45 backdrop-blur-xl transition-all hover:border-jarvis-accent/50 hover:bg-black/60 hover:text-white/80 hover:shadow-[0_0_15px_rgba(255,122,26,0.15)] lg:flex"
      >
        <Search size={13} className="text-jarvis-accent/70 transition-colors group-hover:text-jarvis-accentBright" />
        <span className="font-sans">Buscar módulo, comando, diretor...</span>
        <kbd className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/40 group-hover:text-white/70">⌘K</kbd>
      </button>

      {/* Right: Telemetry, Clock & User */}
      <div className="flex items-center gap-3">
        <CameraPermissionGate />

        {/* System & Agents Pill */}
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 font-mono text-[10px] backdrop-blur-xl xl:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${systemColor}`} />
          <span className="text-white/40">Status:</span>
          <span className="font-semibold text-white/80">{systemLabel}</span>
          <span className="h-2.5 w-[1px] bg-white/10" />
          <span className="text-white/40">Agentes:</span>
          <span className="font-semibold text-jarvis-accentBright">
            {totalAgents !== null ? `${n8n!.data!.activeCount}/${totalAgents}` : "—"}
          </span>
        </div>

        {/* Digital Clock */}
        <div className="hidden flex-col items-end leading-none sm:flex">
          <span className="font-mono text-xs font-bold text-white/80">{clock.toLocaleTimeString("pt-BR")}</span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-white/35">{DATE_FMT.format(clock)}</span>
        </div>

        <button
          type="button"
          title="Notificações"
          className="relative rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          <Bell size={15} />
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 py-1 pl-1 pr-3 backdrop-blur-xl">
          <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-jarvis-accent to-jarvis-accentBright text-[9px] font-bold text-black shadow-[0_0_8px_rgba(255,122,26,0.1)]">
            GH
          </div>
          <div className="hidden leading-tight md:block">
            <div className="text-[11px] font-semibold text-white">Gustavo H.</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sair do Sistema"
            className="ml-0.5 text-white/30 transition-colors hover:text-jarvis-red"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
