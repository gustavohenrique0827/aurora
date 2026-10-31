import type { StateCreator } from "zustand";
import type { HandSide } from "../../lib/handTracking/types";

export type EvidenceCardKind = "text" | "photo" | "verdict";

export interface EvidenceCard {
  id: string;
  kind: EvidenceCardKind;
  label: string;
  body: string;
  position: [number, number, number];
  grabbedBy: HandSide | null;
}

export interface EvidenceBoardSlice {
  evidenceTopic: string | null;
  evidenceCards: EvidenceCard[];
  /** `cards` omit id/position/grabbedBy — the slice assigns those, fanning them out in front
   * of Aurora so they don't spawn stacked on top of each other. */
  summonEvidenceBoard: (topic: string, cards: Array<{ kind: EvidenceCardKind; label: string; body: string }>) => void;
  closeEvidenceBoard: () => void;
  setEvidenceCardGrab: (id: string, hand: HandSide | null) => void;
  setEvidenceCardPosition: (id: string, position: [number, number, number]) => void;
}

// Tuned against one 1400x900 viewport (see HoloBook's position comment) — the old
// [-0.9, ..., y=0.15] fan overlapped the greeting text and clipped on the left nav.
const FAN_START_X = -0.7;
const FAN_SPACING_X = 0.5;
const FAN_Y = 0.7;
const FAN_Z = 1.6;

export const createEvidenceBoardSlice: StateCreator<EvidenceBoardSlice> = (set, get) => ({
  evidenceTopic: null,
  evidenceCards: [],

  summonEvidenceBoard: (topic, cards) =>
    set({
      evidenceTopic: topic,
      evidenceCards: cards.map((c, i) => ({
        ...c,
        id: `evidence-${Date.now().toString(36)}-${i}`,
        position: [FAN_START_X + i * FAN_SPACING_X, FAN_Y, FAN_Z],
        grabbedBy: null,
      })),
    }),

  closeEvidenceBoard: () => set({ evidenceTopic: null, evidenceCards: [] }),

  setEvidenceCardGrab: (id, hand) =>
    set({ evidenceCards: get().evidenceCards.map((c) => (c.id === id ? { ...c, grabbedBy: hand } : c)) }),

  setEvidenceCardPosition: (id, position) =>
    set({ evidenceCards: get().evidenceCards.map((c) => (c.id === id ? { ...c, position } : c)) }),
});
