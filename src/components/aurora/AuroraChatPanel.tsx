import { useEffect, useRef, useState } from "react";
import { Maximize2, Mic, Minimize2, Paperclip, Send, X } from "lucide-react";
import type { ChatMessage } from "@jarvis/shared";
import { Markdown } from "../../lib/markdown";
import { FileAttachment } from "../chat/FileAttachment";
import { WakeWordToggle } from "../voice/WakeWordToggle";
import { useJarvisStore } from "../../state/store";

type Attachment = { base64: string; mimeType: string };

interface AuroraChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isAwaitingResponse: boolean;
  onSend: (text: string, image?: Attachment, document?: Attachment) => void;
  startPushToTalk: () => void;
  stopPushToTalk: () => void;
  /** Lets the page prefill the input (e.g. from the agent card's "ask" action). */
  prefill?: { text: string; nonce: number } | null;
}

function fileToBase64(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1] ?? "", mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Right-hand conversation panel of the immersive Aurora view; slides away when closed. */
export function AuroraChatPanel({
  open,
  onClose,
  messages,
  isAwaitingResponse,
  onSend,
  startPushToTalk,
  stopPushToTalk,
  prefill,
}: AuroraChatPanelProps) {
  const isListening = useJarvisStore((s) => s.isListening);
  const interimTranscript = useJarvisStore((s) => s.interimTranscript);
  const [wide, setWide] = useState(false);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(new Date().toISOString());

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, interimTranscript, isAwaitingResponse, open]);

  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [prefill]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;
    let image: Attachment | undefined;
    let document: Attachment | undefined;
    if (attachment) {
      const encoded = await fileToBase64(attachment);
      if (attachment.type === "application/pdf") document = encoded;
      else image = encoded;
    }
    onSend(trimmed, image, document);
    setText("");
    setAttachment(null);
  };

  return (
    <aside
      aria-label="Conversa com a Aurora"
      aria-hidden={!open}
      className={`absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex h-[66dvh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c10]/90 shadow-2xl backdrop-blur-2xl transition-all duration-300 md:inset-x-auto md:bottom-5 md:right-5 md:top-24 md:z-30 md:h-auto md:max-w-[calc(100vw-7rem)] ${
        wide ? "md:w-[560px]" : "md:w-[400px]"
      } ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[110%] opacity-0 md:translate-x-[110%] md:translate-y-0"}`}
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 md:px-5 md:py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-jarvis-accent/50 bg-jarvis-accent/10">
          <span className="h-3.5 w-3.5 rounded-full bg-jarvis-accent shadow-[0_0_10px_#ff7a1a]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight text-white">Aurora</h2>
          <p className="text-xs text-white/45">Sua IA pessoal</p>
        </div>
        <button
          type="button"
          onClick={() => setWide((w) => !w)}
          title={wide ? "Painel estreito" : "Painel largo"}
          aria-label={wide ? "Painel estreito" : "Painel largo"}
          className="hidden rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white md:block"
        >
          {wide ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Fechar conversa"
          aria-label="Fechar conversa"
          className="rounded-lg p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:p-2"
        >
          <X size={20} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex items-start gap-3">
            <span className="mt-1 h-8 w-8 shrink-0 rounded-full border border-jarvis-accent/40 bg-jarvis-accent/10" />
            <div>
              <div className="rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-white/90">
                Olá, Gustavo!
                <br />
                Como posso te ajudar hoje?
              </div>
              <span className="mt-1.5 block px-1 text-[11px] text-white/30">{timeLabel(openedAt.current)}</span>
            </div>
          </div>
        )}

        {messages.slice(-40).map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex flex-col items-end">
              {m.imageBase64 && (
                <img
                  src={`data:${m.imageMimeType ?? "image/jpeg"};base64,${m.imageBase64}`}
                  alt="Anexo enviado"
                  className="mb-1.5 max-h-40 rounded-xl border border-white/10"
                />
              )}
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-jarvis-accent/20 px-4 py-2.5 text-sm text-white">
                {m.content}
              </p>
              <span className="mt-1 px-1 text-[11px] text-white/30">{timeLabel(m.createdAt)}</span>
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-3">
              <span className="mt-1 h-8 w-8 shrink-0 rounded-full border border-jarvis-accent/40 bg-jarvis-accent/10" />
              <div className="min-w-0">
                <div
                  className={`rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed ${
                    m.error ? "bg-jarvis-red/15 text-jarvis-red" : "bg-white/[0.06] text-white/90"
                  }`}
                >
                  {m.error ? m.error : <Markdown content={m.content} />}
                </div>
                <span className="mt-1.5 block px-1 text-[11px] text-white/30">{timeLabel(m.createdAt)}</span>
              </div>
            </div>
          )
        )}

        {isListening && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-tr-md border border-dashed border-jarvis-accent/50 px-4 py-2.5 text-sm italic text-jarvis-accentBright">
              {interimTranscript || "Ouvindo…"}
            </p>
          </div>
        )}
        {isAwaitingResponse && <p className="px-1 text-xs tracking-wide text-jarvis-accentBright/80">Aurora está pensando…</p>}
      </div>

      <div className="p-4">
        {attachment && (
          <div className="mb-2">
            <FileAttachment file={attachment} onRemove={() => setAttachment(null)} />
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1.5 pl-3"
        >
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full p-2 text-white/55 transition-colors hover:text-white"
            title="Anexar imagem ou PDF"
            aria-label="Anexar imagem ou PDF"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAttachment(file);
              e.target.value = "";
            }}
          />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <WakeWordToggle compact />
          <button
            type="button"
            onPointerDown={startPushToTalk}
            onPointerUp={stopPushToTalk}
            title="Segure para falar"
            aria-label="Segure para falar"
            className={`rounded-full p-2 transition-colors ${
              isListening ? "animate-pulse bg-jarvis-accent text-black" : "text-white/55 hover:text-white"
            }`}
          >
            <Mic size={18} />
          </button>
          <button
            type="submit"
            disabled={!text.trim() && !attachment}
            title="Enviar"
            aria-label="Enviar mensagem"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-jarvis-accent text-black transition-colors hover:bg-jarvis-accentBright disabled:opacity-35"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </aside>
  );
}
