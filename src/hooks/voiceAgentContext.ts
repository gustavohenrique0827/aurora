import { createContext, useContext } from "react";
import type { useGlobalVoiceAgent } from "./useGlobalVoiceAgent";

export type VoiceAgent = ReturnType<typeof useGlobalVoiceAgent>;

/**
 * The ONE voice agent, mounted in AppShell. Pages must read it from here instead of calling
 * useGlobalVoiceAgent() again: a second mount starts a second wake-word SpeechRecognition
 * (Chrome allows one live session per page — they abort each other until the wake-word
 * disables itself) and plays every reply's audio twice.
 */
export const VoiceAgentContext = createContext<VoiceAgent | null>(null);

export function useVoiceAgent(): VoiceAgent {
  const voice = useContext(VoiceAgentContext);
  if (!voice) throw new Error("useVoiceAgent must be used inside AppShell (VoiceAgentContext)");
  return voice;
}
