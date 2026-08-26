import crypto from "node:crypto";
import { Router } from "express";
import type { ChatMessage, DirectorId } from "@jarvis/shared";
import { sendNonStreaming, JarvisChatError } from "../jarvis/jarvisClient";
import { DIRECTORS } from "./directors.config";
import { logger } from "../utils/logger";

export const directorsRouter = Router();

directorsRouter.get("/", (_req, res) => {
  res.json({ directors: DIRECTORS });
});

directorsRouter.post("/:id/ask", async (req, res) => {
  const directorId = req.params.id as DirectorId;
  const isValid = DIRECTORS.some((d) => d.id === directorId);
  if (!isValid) {
    res.status(404).json({ error: "unknown_director" });
    return;
  }

  const { message, conversationId } = req.body as { message?: string; conversationId?: string };
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message_required" });
    return;
  }

  const sessionId = conversationId ?? `director-${directorId}`;

  try {
    const reply = await sendNonStreaming({ message, sessionId, directorId });
    const response: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId: sessionId,
      role: "assistant",
      content: reply.text,
      createdAt: new Date().toISOString(),
      directorId,
      audioBase64: reply.audioBase64,
    };
    res.json(response);
  } catch (err) {
    logger.error({ err, directorId }, "directors.routes: ask failed");
    const message = err instanceof JarvisChatError ? err.message : "Erro ao consultar o diretor.";
    res.status(502).json({ error: message });
  }
});
