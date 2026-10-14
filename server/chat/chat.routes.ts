import crypto from "node:crypto";
import { Router } from "express";
import type { ChatMessage, ChatSendPayload } from "@jarvis/shared";
import { sendNonStreaming, JarvisChatError } from "../jarvis/jarvisClient";
import { logger } from "../utils/logger";

export const chatRouter = Router();

chatRouter.post("/", async (req, res) => {
  const { conversationId, message, directorId, imageBase64, imageMimeType, documentBase64, documentMimeType } =
    req.body as Partial<ChatSendPayload>;

  if (!message || !conversationId) {
    res.status(400).json({ error: "mensagem inválida" });
    return;
  }

  try {
    const reply = await sendNonStreaming({
      message,
      sessionId: conversationId,
      directorId,
      imageBase64,
      imageMimeType,
      documentBase64,
      documentMimeType,
    });
    const response: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId,
      role: "assistant",
      content: reply.text,
      createdAt: new Date().toISOString(),
      directorId,
      audioBase64: reply.audioBase64,
    };
    res.json(response);
  } catch (err) {
    logger.error({ err }, "chat.routes: chat failed");
    res.status(502).json({
      error: err instanceof JarvisChatError ? err.message : "Não foi possível falar com o JARVIS agora.",
    });
  }
});
