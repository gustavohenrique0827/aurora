import type { StateCreator } from "zustand";
import type { ChatMessage } from "@jarvis/shared";

export interface ChatSlice {
  activeConversationId: string;
  messages: ChatMessage[];
  streamingBuffers: Record<string, string>;
  isAwaitingResponse: boolean;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  appendStreamingDelta: (conversationId: string, delta: string) => void;
  clearStreamingBuffer: (conversationId: string) => void;
  setAwaitingResponse: (value: boolean) => void;
}

export const createChatSlice: StateCreator<ChatSlice> = (set) => ({
  activeConversationId: "",
  messages: [],
  streamingBuffers: {},
  isAwaitingResponse: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, patch) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  appendStreamingDelta: (conversationId, delta) =>
    set((state) => ({
      streamingBuffers: {
        ...state.streamingBuffers,
        [conversationId]: (state.streamingBuffers[conversationId] ?? "") + delta,
      },
    })),
  clearStreamingBuffer: (conversationId) =>
    set((state) => {
      const next = { ...state.streamingBuffers };
      delete next[conversationId];
      return { streamingBuffers: next };
    }),
  setAwaitingResponse: (value) => set({ isAwaitingResponse: value }),
});
