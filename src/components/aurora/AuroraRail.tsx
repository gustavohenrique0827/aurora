import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS } from "../layout/navItems";

interface AuroraRailProps {
  open: boolean;
  onToggle: () => void;
  /** Positioning classes; the default floats over the immersive Aurora stage. */
  className?: string;
  onNavigate?: () => void;
}

/** Floating navigation rail of the immersive Aurora view: icons only when closed, icons + labels when open. */
export function AuroraRail({ open, onToggle, className = "absolute bottom-5 left-5 top-24 z-30", onNavigate }: AuroraRailProps) {
  const settings = NAV_ITEMS.find((i) => i.to === "/configuracoes");
  const items = NAV_ITEMS.filter((i) => i.to !== "/configuracoes");

  const link = (item: (typeof NAV_ITEMS)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/"}
      title={item.label}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center rounded-xl border transition-colors ${
          open ? "gap-3 px-3 py-2" : "flex-col justify-center gap-0.5 px-1 py-2"
        } ${
          isActive
            ? "border-jarvis-accent/50 bg-jarvis-accent/15 text-white"
            : "border-transparent text-white/55 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={19} strokeWidth={1.75} className={isActive ? "text-jarvis-accentBright" : ""} />
          {open ? (
            <span className="truncate text-[13px] font-medium">{item.label}</span>
          ) : (
            isActive && <span className="text-[10px] font-medium leading-none">{item.label}</span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <nav
      aria-label="Navegação principal"
      className={`${className} flex flex-col rounded-3xl border border-white/10 bg-black/45 p-2 backdrop-blur-xl transition-[width] duration-200 ${
        open ? "w-56" : "w-[76px]"
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(link)}
      </div>
      <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-2">
        {settings && link(settings)}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Recolher menu" : "Expandir menu"}
          title={open ? "Recolher menu" : "Expandir menu"}
          className={`flex items-center rounded-xl py-2 text-white/45 transition-colors hover:bg-white/5 hover:text-white ${
            open ? "gap-3 px-3" : "justify-center"
          }`}
        >
          {open ? <PanelLeftClose size={19} strokeWidth={1.75} /> : <PanelLeftOpen size={19} strokeWidth={1.75} />}
          {open && <span className="text-[13px] font-medium">Recolher</span>}
        </button>
      </div>
    </nav>
  );
}
