import type { HTMLAttributes, ReactNode } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}

export function GlassPanel({ children, title, action, className = "", ...rest }: GlassPanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-jarvis-accent/15 bg-[#101114]/75 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all ${className}`}
      {...rest}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-jarvis-accent/15 bg-black/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-jarvis-accentBright" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white/80">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>

      {/* Cyber Corner Accents */}
      <div className="pointer-events-none absolute top-0 right-0 h-2 w-2 border-t border-r border-jarvis-accent/30" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-jarvis-accent/30" />
    </div>
  );
}
