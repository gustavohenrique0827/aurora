import { useCallback, useEffect } from "react";
import type { DirectorId } from "@jarvis/shared";
import { SOCKET_EVENTS } from "@jarvis/shared";
import { getSocket } from "../state/socket";
import { useJarvisStore } from "../state/store";

// Fixo (não mais um UUID por navegador) e compartilhado com o widget da Aurora no SPY —
// mesmo n8n memory node, mesma janela de conversa, então Gustavo tem contexto contínuo entre
// os dois apps em vez de duas "abas de memória" isoladas. Seguro porque a própria Aurora só
// atende um usuário real hoje (ver system prompt do workflow AURORA CORE).
const AURORA_SHARED_SESSION_ID = "aurora-gustavo-principal";

export function useJarvisChat() {
  const conversationId = useJarvisStore((s) => s.activeConversationId) || AURORA_SHARED_SESSION_ID;
  const messages = useJarvisStore((s) => s.messages);
  const streamingBuffer = useJarvisStore((s) => s.streamingBuffers[conversationId] ?? "");
  const isAwaitingResponse = useJarvisStore((s) => s.isAwaitingResponse);

  useEffect(() => {
    getSocket(); // ensure connection is established as soon as chat is used
  }, []);

  const sendMessage = useCallback(
    (
      message: string,
      directorId?: DirectorId,
      image?: { base64: string; mimeType: string },
      document?: { base64: string; mimeType: string }
    ) => {
      const store = useJarvisStore.getState();
      store.addMessage({
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
        directorId,
        imageBase64: image?.base64,
        imageMimeType: image?.mimeType,
        documentBase64: document?.base64,
        documentMimeType: document?.mimeType,
      });
      store.setAwaitingResponse(true);
      store.setSphereMode("thinking");

      getSocket().emit(SOCKET_EVENTS.CHAT_SEND, {
        conversationId,
        message,
        directorId,
        imageBase64: image?.base64,
        imageMimeType: image?.mimeType,
        documentBase64: document?.base64,
        documentMimeType: document?.mimeType,
      });
    },
    [conversationId]
  );

  return { conversationId, messages, streamingBuffer, isAwaitingResponse, sendMessage };
}
