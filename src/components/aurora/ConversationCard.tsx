import { useEffect, useRef } from "react";
import type { ChatMessage } from "@jarvis/shared";
import { Pencil } from "lucide-react";
import { useJarvisStore } from "../../state/store";

const plain = (text: string) => text.replace(/[*_#`>]/g, "").trim();

interface ConversationCardProps {
  messages: ChatMessage[];
  isAwaitingResponse: boolean;
  /** Put a past question back in the input so it can be fixed and re-sent. */
  onEdit: (text: string) => void;
}

/**
 * The conversation with Aurora, inside the chat bar's own card (above the input row): every
 * question (typed or spoken — speech shows up here live while you talk) and every reply, in
 * full. Opening/closing is the chat card's job (AuroraPage), not this component's.
 */
export function ConversationCard({
  messages,
  isAwaitingResponse,
  onEdit,
}: ConversationCardProps) {
  const isListening = useJarvisStore((s) => s.isListening);
  const interimTranscript = useJarvisStore((s) => s.interimTranscript);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recent = messages.slice(-30);
  const hasContent = recent.length > 0 || isListening || isAwaitingResponse;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [recent.length, interimTranscript, isAwaitingResponse]);

  if (!hasContent) return null;

  return (
    <section
      aria-label="Conversa com a Aurora"
      className="mb-2 border-b border-white/10 pb-1"
    >
      <div
        ref={scrollRef}
        className="max-h-[34vh] space-y-2 overflow-y-auto px-2 pb-2 pt-1"
        aria-live="polite"
      >
        {recent.map((m) =>
          m.role === "user" ? (
            <div
              key={m.id}
              className="group flex items-start justify-end gap-1.5"
            >
              <button
                type="button"
                onClick={() => onEdit(m.content)}
                className="mt-1 rounded-md p-1 text-white/35 opacity-0 transition-opacity hover:text-jarvis-accentBright focus-visible:opacity-100 group-hover:opacity-100"
                title="Editar e reenviar"
                aria-label="Editar esta pergunta e reenviar"
              >
                <Pencil size={12} />
              </button>
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-jarvis-accent/15 px-3 py-2 text-sm text-white">
                {m.content}
              </p>
            </div>
          ) : (
            <p
              key={m.id}
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md px-3 py-2 text-sm leading-relaxed ${
                m.error
                  ? "bg-jarvis-red/15 text-jarvis-red"
                  : "bg-white/[0.06] text-white/90"
              }`}
            >
              {plain(m.error ?? m.content)}
            </p>
          ),
        )}

        {isListening && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md border border-dashed border-jarvis-accent/50 px-3 py-2 text-sm italic text-jarvis-accentBright">
              {interimTranscript || "Ouvindo…"}
            </p>
          </div>
        )}

        {isAwaitingResponse && (
          <p className="font-mono text-xs tracking-wider text-jarvis-accentBright/80">
            Aurora está pensando…
          </p>
        )}
      </div>
    </section>
  );
}
