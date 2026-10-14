import axios from "axios";
import type { DirectorId } from "@jarvis/shared";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { DIRECTORS } from "../directors/directors.config";

/**
 * Single integration point with the JARVIS CORE n8n chat webhook.
 * The app never talks to any other n8n endpoint for chat — this is the one door in.
 */

interface SendOptions {
  message: string;
  sessionId: string;
  directorId?: DirectorId;
  /** One image riding along with this turn (file attachment, or a captured screen-share
   * /camera frame) — converted to n8n binary and passed to Aurora CORE's vision-enabled
   * agent. See chatEvents.ts and the n8n workflow's base64→binary conversion node. */
  imageBase64?: string;
  imageMimeType?: string;
  /** One PDF attached instead of an image — Aurora CORE summarizes it via Gemini before
   * the agent sees it (same pattern as the WhatsApp channel's document handling). */
  documentBase64?: string;
  documentMimeType?: string;
}

function buildChatInput({ message, directorId }: SendOptions): string {
  if (!directorId) return message;
  const director = DIRECTORS.find((d) => d.id === directorId);
  if (!director) return message;
  // Mirrors the "Jarvis, fale com o CTO" command pattern already understood by
  // JARVIS CORE's system prompt — we just phrase it explicitly instead of relying
  // on the user typing it themselves.
  return `Fale diretamente com o ${director.name} (${director.title}): ${message}`;
}

function extractOutputText(responseData: unknown): string {
  if (typeof responseData === "string") return responseData;
  if (responseData && typeof responseData === "object") {
    const obj = responseData as Record<string, unknown>;
    if (typeof obj.output === "string") return obj.output;
    if (typeof obj.text === "string") return obj.text;
    if (Array.isArray(responseData) && responseData[0]) {
      return extractOutputText(responseData[0]);
    }
  }
  return JSON.stringify(responseData);
}

function extractAudioBase64(responseData: unknown): string | undefined {
  if (responseData && typeof responseData === "object") {
    const obj = responseData as Record<string, unknown>;
    if (typeof obj.audioBase64 === "string" && obj.audioBase64.length > 0) return obj.audioBase64;
    if (Array.isArray(responseData) && responseData[0]) {
      return extractAudioBase64(responseData[0]);
    }
  }
  return undefined;
}

// Aurora's model call can take well over a minute when Gemini is overloaded (primary 503 →
// fallback model); 90s made the backend give up while n8n was still answering, so Gustavo
// got silence. The n8n side has its own retry/fallback budget; this just has to outlast it.
const N8N_REPLY_TIMEOUT_MS = 150_000;

export class JarvisChatError extends Error {}

export interface JarvisReply {
  text: string;
  audioBase64?: string;
}

export async function sendNonStreaming(options: SendOptions): Promise<JarvisReply> {
  const chatInput = buildChatInput(options);

  try {
    const response = await axios.post(
      env.N8N_CHAT_WEBHOOK_URL,
      {
        action: "sendMessage",
        sessionId: options.sessionId,
        chatInput,
        imageBase64: options.imageBase64,
        imageMimeType: options.imageMimeType,
        documentBase64: options.documentBase64,
        documentMimeType: options.documentMimeType,
      },
      { timeout: N8N_REPLY_TIMEOUT_MS }
    );
    return { text: extractOutputText(response.data), audioBase64: extractAudioBase64(response.data) };
  } catch (err) {
    logger.error({ err }, "jarvisClient: non-streaming call to n8n chat webhook failed");
    throw new JarvisChatError(
      axios.isAxiosError(err) && err.response
        ? `JARVIS CORE respondeu com status ${err.response.status}`
        : "Não foi possível falar com o JARVIS CORE agora."
    );
  }
}
