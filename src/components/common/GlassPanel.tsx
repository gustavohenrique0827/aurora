import type { HTMLAttributes, ReactNode } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}

export function GlassPanel({ children, title, action, className = "", ...rest }: GlassPanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-jarvis-border bg-[#101114]/80 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all ${className}`}
      {...rest}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-jarvis-border bg-black/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-jarvis-accentBright" />
            <h3 className="text-xs font-semibold tracking-wide text-white/85">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>

    </div>
  );
}
