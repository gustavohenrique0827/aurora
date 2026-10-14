import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleGroupProps {
  title: string;
  count: number;
  icon?: LucideIcon;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Shared with AutomacoesPage — same grouped-card shell used anywhere agents get bucketed by
 * category (Diretoria, Gerências, Inteligência, ...). */
export function CollapsibleGroup({ title, count, icon: Icon, open, onToggle, children }: CollapsibleGroupProps) {
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
