export function LoadingPulse({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/40">
      <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-jarvis-cyan/60" />
      {label ?? "Carregando..."}
    </div>
  );
}
