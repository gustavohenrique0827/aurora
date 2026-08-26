export type DirectorId =
  | "ceo"
  | "cto"
  | "cfo"
  | "cco"
  | "coo"
  | "cmo"
  | "cpo"
  | "cio"
  | "chro"
  | "general_counsel";

export interface DirectorMeta {
  id: DirectorId;
  name: string;
  title: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  directorId?: DirectorId;
  pending?: boolean;
  error?: string;
  /** Base64 MP3 from Aurora CORE's server-side TTS (OpenAI). Browser speechSynthesis
   * is unreliable across machines/profiles, so real audio is generated in n8n and
   * played back via an <audio> element instead — see useGlobalVoiceAgent. */
  audioBase64?: string;
  /** Present when the user attached a file or shared a screen frame — rendered as a
   * thumbnail in the user's own bubble (MessageBubble.tsx). Not stored anywhere; lives
   * only for the lifetime of the socket session. */
  imageBase64?: string;
  imageMimeType?: string;
}

export interface ChatSendPayload {
  conversationId: string;
  message: string;
  directorId?: DirectorId;
  /** A single image (file attachment or one captured screen-share frame) riding along
   * with this message — see EnergySphere/ScreenShareOffer for the capture side, and
   * jarvisClient.ts for how it reaches Aurora CORE's vision-enabled agent. */
  imageBase64?: string;
  imageMimeType?: string;
}

export interface ChatChunkEvent {
  conversationId: string;
  delta: string;
}

export interface ChatCompleteEvent {
  conversationId: string;
  message: ChatMessage;
}

export interface ChatErrorEvent {
  conversationId: string;
  error: string;
}
