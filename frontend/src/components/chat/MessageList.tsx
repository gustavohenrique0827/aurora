import { useEffect, useRef } from "react";
import type { ChatMessage } from "@jarvis/shared";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  streamingBuffer: string;
  isAwaitingResponse: boolean;
}

export function MessageList({ messages, streamingBuffer, isAwaitingResponse }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingBuffer]);

  if (messages.length === 0 && !isAwaitingResponse) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/30">
        Fale ou digite algo para começar.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <StreamingIndicator buffer={streamingBuffer} isAwaiting={isAwaitingResponse} />
      <div ref={bottomRef} />
    </div>
  );
}
