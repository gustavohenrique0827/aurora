import { NavLink } from "react-router-dom";
import { NAV_ITEMS, type NavItem } from "./navItems";
import { useJarvisStore } from "../../state/store";

export function SideNav() {
  const mobileNavOpen = useJarvisStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useJarvisStore((s) => s.setMobileNavOpen);

  const mainItems = NAV_ITEMS.slice(0, 2); // Dashboard, Aurora
  const directorItems = NAV_ITEMS.slice(2, 9); // CEO to COO
  const operationItems = NAV_ITEMS.slice(9); // CRM to Configurações

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <div className="hidden px-3 pt-2.5 pb-1 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30 lg:block">
        {title}
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          title={item.label}
          onClick={() => setMobileNavOpen(false)}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all md:justify-center lg:justify-start ${
              isActive
                ? "bg-jarvis-cyan/15 text-white font-semibold shadow-[0_0_15px_rgba(79,215,255,0.15)] border border-jarvis-cyan/30"
                : "text-white/50 hover:bg-white/5 hover:text-white/90 border border-transparent"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-jarvis-cyanBright shadow-[0_0_8px_#4fd7ff]" />
              )}
              <item.icon
                size={16}
                strokeWidth={isActive ? 2.2 : 1.75}
                className={`shrink-0 transition-colors ${
                  isActive ? "text-jarvis-cyanBright" : "text-white/40 group-hover:text-jarvis-cyan"
                }`}
              />
              <span className="truncate md:hidden lg:inline">{item.label}</span>

              {/* Floating Tooltip for Icon-only Rail (md to lg) */}
              <div className="pointer-events-none absolute left-full ml-2 hidden z-50 rounded-lg border border-jarvis-cyan/30 bg-black/90 px-2.5 py-1 text-xs font-medium text-white shadow-xl backdrop-blur-xl group-hover:md:flex group-hover:lg:hidden">
                <span className="whitespace-nowrap">{item.label}</span>
              </div>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <>
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-1.5 overflow-y-auto border-r border-jarvis-cyan/15 bg-[#050813]/95 px-3 py-3 backdrop-blur-2xl transition-transform duration-200 md:static md:z-auto md:w-16 md:translate-x-0 md:bg-transparent md:px-2 lg:w-56 lg:px-3 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSection("CORE AI", mainItems)}
        <div className="my-1 border-t border-white/5" />
        {renderSection("DIRETORIA", directorItems)}
        <div className="my-1 border-t border-white/5" />
        {renderSection("OPERAÇÕES", operationItems)}
      </nav>
    </>
  );
}
