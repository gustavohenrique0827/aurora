import crypto from "node:crypto";
import type { Socket } from "socket.io";
import type { ChatMessage, ChatSendPayload } from "@jarvis/shared";
import { SOCKET_EVENTS } from "@jarvis/shared";
import { env } from "../../config/env";
import { sendNonStreaming, sendStreaming, JarvisChatError } from "../../jarvis/jarvisClient";
import { logger } from "../../utils/logger";
import { resolveLocalIntent } from "../../localActions/localIntents";

export function registerChatEvents(socket: Socket): void {
  socket.on(SOCKET_EVENTS.CHAT_SEND, async (payload: ChatSendPayload) => {
    const { conversationId, message, directorId, imageBase64, imageMimeType, documentBase64, documentMimeType } = payload;

    if (!message || !conversationId) {
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, { conversationId, error: "mensagem inválida" });
      return;
    }

    // Local-intent resolution — deliberately handled here, BEFORE the message
    // ever reaches the AI, for the intents n8n (remote) can't act on itself:
    // opening an app/site/streaming search short-circuits with a canned reply,
    // reading a project file instead injects its content as extra context and
    // lets the normal AI call proceed. Everything else (music, calendar,
    // general questions) is resolved by Aurora's own tool-calling in n8n — see
    // localActions/localIntents.ts for the full taxonomy.
    const localIntent = resolveLocalIntent(message, conversationId);

    if (localIntent?.type === "short_circuit") {
      const outcome = await localIntent.execute();
      const responseMessage: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId,
        role: "assistant",
        content: outcome.content,
        createdAt: new Date().toISOString(),
        directorId,
        error: outcome.error,
      };
      socket.emit(SOCKET_EVENTS.CHAT_COMPLETE, { conversationId, message: responseMessage });
      return;
    }

    // The message shown in the UI is untouched: the frontend already added
    // Gustavo's literal words to the chat before this event was even emitted
    // (see useJarvisChat.sendMessage) — only what's SENT to Aurora gets the
    // extra context spliced in.
    const outboundMessage =
      localIntent?.type === "context_injection" ? `${message}\n\n${localIntent.contextBlock}` : message;

    try {
      let fullText: string;
      let audioBase64: string | undefined;

      if (env.JARVIS_STREAMING_ENABLED) {
        try {
          fullText = await sendStreaming(
            {
              message: outboundMessage,
              sessionId: conversationId,
              directorId,
              imageBase64,
              imageMimeType,
              documentBase64,
              documentMimeType,
            },
            (delta) => {
              socket.emit(SOCKET_EVENTS.CHAT_CHUNK, { conversationId, delta });
            }
          );
        } catch (streamErr) {
          logger.warn({ streamErr }, "chatEvents: streaming failed, falling back to non-streaming");
          const reply = await sendNonStreaming({
            message: outboundMessage,
            sessionId: conversationId,
            directorId,
            imageBase64,
            imageMimeType,
            documentBase64,
            documentMimeType,
          });
          fullText = reply.text;
          audioBase64 = reply.audioBase64;
        }
      } else {
        const reply = await sendNonStreaming({
          message: outboundMessage,
          sessionId: conversationId,
          directorId,
          imageBase64,
          imageMimeType,
          documentBase64,
          documentMimeType,
        });
        fullText = reply.text;
        audioBase64 = reply.audioBase64;
      }

      const responseMessage: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId,
        role: "assistant",
        content: fullText,
        createdAt: new Date().toISOString(),
        directorId,
        audioBase64,
      };

      socket.emit(SOCKET_EVENTS.CHAT_COMPLETE, { conversationId, message: responseMessage });
    } catch (err) {
      logger.error({ err }, "chatEvents: chat:send failed on both streaming and non-streaming paths");
      const errorText = err instanceof JarvisChatError ? err.message : "Não foi possível falar com o JARVIS agora.";
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, { conversationId, error: errorText });
    }
  });
}
