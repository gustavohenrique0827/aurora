import { useJarvisChat } from "../../hooks/useJarvisChat";
import { MessageList } from "./MessageList";
import { ChatComposer } from "./ChatComposer";
import { ScreenShareOffer } from "./ScreenShareOffer";
import { WakeWordToggle } from "../voice/WakeWordToggle";
import { useJarvisStore } from "../../state/store";

export interface ChatPanelVoiceProps {
  startPushToTalk: () => void;
  stopPushToTalk: () => void;
  interrupt: () => void;
  handleComposerSend: (text: string, image?: { base64: string; mimeType: string }) => void;
  pendingScreenShare: string | null;
  confirmScreenShare: (image: { base64: string; mimeType: string }) => void;
  cancelScreenShare: () => void;
}

/**
 * Mounted once, globally, in AppShell's CommsDock — chat "never disappears" per the
 * product spec. Which director it's scoped to comes from the store (set by whichever
 * page is active, e.g. DirectorPanel), not a per-mount prop.
 *
 * Voice (wake-word, push-to-talk, speak-on-reply) is deliberately NOT owned here —
 * ChatPanel itself unmounts when the comms dock collapses or the director scope
 * changes (see CommsDock's AnimatePresence key), which would kill an in-progress
 * recognition or silently stop wake-word listening. It's owned by
 * useGlobalVoiceAgent in AppShell instead, and passed down as props.
 */
export function ChatPanel({
  startPushToTalk,
  stopPushToTalk,
  interrupt,
  handleComposerSend,
  pendingScreenShare,
  confirmScreenShare,
  cancelScreenShare,
}: ChatPanelVoiceProps) {
  const directorId = useJarvisStore((s) => s.activeDirectorId) ?? undefined;
  const { conversationId, messages, streamingBuffer, isAwaitingResponse } = useJarvisChat();

  const scopedMessages = directorId ? messages.filter((m) => m.directorId === directorId || m.role === "user") : messages;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-jarvis-border px-4 py-2">
        <span className="text-xs uppercase tracking-widest text-white/40">Conversa · {conversationId.slice(0, 8)}</span>
        <WakeWordToggle />
      </div>
      <MessageList messages={scopedMessages} streamingBuffer={streamingBuffer} isAwaitingResponse={isAwaitingResponse} />
      {pendingScreenShare !== null && <ScreenShareOffer onConfirm={confirmScreenShare} onCancel={cancelScreenShare} />}
      <ChatComposer onSend={handleComposerSend} startPushToTalk={startPushToTalk} stopPushToTalk={stopPushToTalk} interrupt={interrupt} />
    </div>
  );
}
