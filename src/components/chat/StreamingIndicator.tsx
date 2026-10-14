import { Markdown } from "../../lib/markdown";

interface StreamingIndicatorProps {
  buffer: string;
  isAwaiting: boolean;
}

export function StreamingIndicator({ buffer, isAwaiting }: StreamingIndicatorProps) {
  if (!isAwaiting && !buffer) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl border border-jarvis-border bg-jarvis-panel px-4 py-3 text-sm text-white/90 backdrop-blur-md">
        {buffer ? (
          <Markdown content={buffer} />
        ) : (
          <div className="flex items-center gap-1.5 py-1">
            <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-jarvis-cyan" />
            <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-jarvis-cyan [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-jarvis-cyan [animation-delay:0.4s]" />
          </div>
        )}
      </div>
    </div>
  );
}
