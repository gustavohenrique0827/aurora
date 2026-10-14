import type { ProjectorSyncMessage } from "@jarvis/shared";

const CHANNEL_NAME = "aurora-vision-projector-sync";

type MessageHandler = (msg: ProjectorSyncMessage) => void;

class ProjectorSyncChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<MessageHandler> = new Set();

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev) => {
        const msg = ev.data as ProjectorSyncMessage;
        this.listeners.forEach((fn) => {
          try {
            fn(msg);
          } catch (err) {
            console.error("[ProjectorSync] listener error:", err);
          }
        });
      };
    }
  }

  public send(msg: ProjectorSyncMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.warn("[ProjectorSync] failed to post message:", err);
      }
    }
  }

  public subscribe(fn: MessageHandler): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public close() {
    this.channel?.close();
    this.listeners.clear();
  }
}

export const projectorSync = new ProjectorSyncChannel();

