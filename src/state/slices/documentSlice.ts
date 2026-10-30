import type { StateCreator } from "zustand";
import type { HandSide } from "../../lib/handTracking/types";

export interface HoloDocument {
  id: string;
  title: string;
  /** Each entry is one page's body text. Page 0 is shown first once opened. */
  pages: string[];
  pageIndex: number;
  /** False = resting closed (cover only); true = showing pages[pageIndex]. */
  opened: boolean;
  position: [number, number, number];
  grabbedBy: HandSide | null;
  /** Bumped on summon so HoloBook can play a fresh fly-in entrance even if the id is reused. */
  summonedAt: number;
}

export interface DocumentSlice {
  /** Capped at one for now — summoning a new one replaces whatever's open. A real multi-book
   * stack (and real per-client file content instead of this placeholder) is the natural next
   * step once this mechanism itself has been tried with a real hand. */
  holoDocument: HoloDocument | null;
  summonDocument: (title: string, pages: string[]) => void;
  closeDocument: () => void;
  openDocument: () => void;
  turnDocumentPage: (direction: 1 | -1) => void;
  setDocumentGrab: (hand: HandSide | null) => void;
  setDocumentPosition: (position: [number, number, number]) => void;
}

export const createDocumentSlice: StateCreator<DocumentSlice> = (set, get) => ({
  holoDocument: null,

  summonDocument: (title, pages) =>
    set({
      holoDocument: {
        id: `doc-${Date.now().toString(36)}`,
        title,
        pages,
        pageIndex: 0,
        opened: false,
        position: [1.3, -0.05, 1.1],
        grabbedBy: null,
        summonedAt: Date.now(),
      },
    }),

  closeDocument: () => set({ holoDocument: null }),

  openDocument: () => {
    const doc = get().holoDocument;
    if (!doc || doc.opened) return;
    set({ holoDocument: { ...doc, opened: true } });
  },

  turnDocumentPage: (direction) => {
    const doc = get().holoDocument;
    if (!doc || !doc.opened) return;
    const next = doc.pageIndex + direction;
    if (next < 0 || next >= doc.pages.length) return;
    set({ holoDocument: { ...doc, pageIndex: next } });
  },

  setDocumentGrab: (hand) => {
    const doc = get().holoDocument;
    if (!doc) return;
    set({ holoDocument: { ...doc, grabbedBy: hand } });
  },

  setDocumentPosition: (position) => {
    const doc = get().holoDocument;
    if (!doc) return;
    set({ holoDocument: { ...doc, position } });
  },
});
