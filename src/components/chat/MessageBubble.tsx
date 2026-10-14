import { useState } from "react";
import type { ChatMessage } from "@jarvis/shared";
import { Markdown } from "../../lib/markdown";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[80%] rounded-2xl border px-4 py-3 text-sm leading-relaxed backdrop-blur-md ${
          isUser
            ? "border-jarvis-cyan/30 bg-jarvis-cyan/10 text-white"
            : message.error
              ? "border-jarvis-red/40 bg-jarvis-red/10 text-white/90"
              : "border-jarvis-border bg-jarvis-panel text-white/90"
        }`}
      >
        {message.directorId && !isUser && (
          <div className="mb-1 text-[10px] uppercase tracking-wider text-jarvis-cyan/70">{message.directorId}</div>
        )}
        {message.imageBase64 && (
          <img
            src={`data:${message.imageMimeType ?? "image/jpeg"};base64,${message.imageBase64}`}
            alt="Imagem enviada"
            className="mb-2 max-h-48 w-full rounded-lg border border-white/10 object-cover"
          />
        )}
        <Markdown content={message.content} />
        <button
          type="button"
          onClick={handleCopy}
          className="absolute -bottom-5 right-1 text-[10px] text-white/30 opacity-0 transition-opacity hover:text-white/70 group-hover:opacity-100"
        >
          {copied ? "copiado" : "copiar"}
        </button>
      </div>
    </div>
  );
}
