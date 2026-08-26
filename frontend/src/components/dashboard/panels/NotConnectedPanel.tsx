interface NotConnectedPanelProps {
  reason?: string;
}

/**
 * Shared honest empty-state. This is the ONLY thing a panel renders when its
 * DataState status is "unavailable" or "error" with no previous data — never a
 * placeholder number, never a random/decorative value.
 */
export function NotConnectedPanel({ reason }: NotConnectedPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-6 text-center">
      <span className="text-xs text-white/40">Não conectado</span>
      {reason && <span className="max-w-[220px] text-[10px] text-white/25">{reason}</span>}
    </div>
  );
}
