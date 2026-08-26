import { useRef, useState } from "react";
import { MicButton } from "../voice/MicButton";
import { VoiceSupportGate } from "../voice/VoiceSupportGate";
import { FileAttachment } from "./FileAttachment";
import { useJarvisStore } from "../../state/store";

interface ChatComposerProps {
  onSend: (message: string, image?: { base64: string; mimeType: string }) => void;
  startPushToTalk: () => void;
  stopPushToTalk: () => void;
  interrupt: () => void;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
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

const TEXTAREA_MAX_PX = 128; // matches the old max-h-32

export function ChatComposer({ onSend, startPushToTalk, stopPushToTalk, interrupt }: ChatComposerProps) {
  const [text, setText] = useState("");
  // Only one image at a time — the vision pipeline (ChatSendPayload.imageBase64) and
  // Aurora CORE's n8n workflow only carry a single image per turn.
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSpeaking = useJarvisStore((s) => s.isSpeaking);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_PX)}px`;
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;

    let image: { base64: string; mimeType: string } | undefined;
    if (attachment) {
      setSending(true);
      try {
        image = await fileToBase64(attachment);
      } finally {
        setSending(false);
      }
    }

    onSend(trimmed, image);
    setText("");
    setAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleMicStart = () => {
    if (isSpeaking) interrupt();
    startPushToTalk();
  };

  return (
    <div className="border-t border-jarvis-border bg-jarvis-panel/80 p-3 backdrop-blur-md">
      {attachment && (
        <div className="mb-2 flex flex-wrap gap-2">
          <FileAttachment file={attachment} onRemove={() => setAttachment(null)} />
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-jarvis-border bg-jarvis-panel text-white/60 hover:border-jarvis-cyan/60 hover:text-white"
          aria-label="Anexar imagem"
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setAttachment(file);
            e.target.value = "";
          }}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Fale com a Aurora..."
          className="max-h-32 flex-1 resize-none overflow-y-auto rounded-2xl border border-jarvis-border bg-black/20 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-jarvis-cyan/60 focus:outline-none"
        />

        <VoiceSupportGate>
          <MicButton onStart={handleMicStart} onStop={stopPushToTalk} />
        </VoiceSupportGate>

        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !attachment) || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-jarvis-cyan/40 bg-jarvis-cyan/15 text-jarvis-cyanBright transition-opacity disabled:opacity-30"
          aria-label="Enviar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
