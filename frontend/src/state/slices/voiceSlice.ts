import type { StateCreator } from "zustand";

export interface VoiceSlice {
  sttSupported: boolean;
  ttsSupported: boolean;
  wakeWordEnabled: boolean;
  wakeWordSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  setVoiceSupport: (stt: boolean, tts: boolean) => void;
  setWakeWordEnabled: (enabled: boolean) => void;
  setIsListening: (value: boolean) => void;
  setIsSpeaking: (value: boolean) => void;
  setInterimTranscript: (value: string) => void;
}

export const createVoiceSlice: StateCreator<VoiceSlice> = (set) => ({
  sttSupported: false,
  ttsSupported: false,
  // On by default — Gustavo wants Aurora listening for her name from the moment he
  // logs in, no manual toggle or mic-button press required.
  wakeWordEnabled: true,
  wakeWordSupported: false,
  isListening: false,
  isSpeaking: false,
  interimTranscript: "",
  setVoiceSupport: (stt, tts) => set({ sttSupported: stt, ttsSupported: tts, wakeWordSupported: stt }),
  setWakeWordEnabled: (enabled) => set({ wakeWordEnabled: enabled }),
  setIsListening: (value) => set({ isListening: value }),
  setIsSpeaking: (value) => set({ isSpeaking: value }),
  setInterimTranscript: (value) => set({ interimTranscript: value }),
});
