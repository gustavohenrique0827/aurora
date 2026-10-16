import type { StateCreator } from "zustand";
import type { DirectorId } from "@jarvis/shared";

/**
 * Owns which director the persistent CommsDock is scoped to, and whether the dock is
 * expanded. `activeDirectorId` replaces the old per-page ChatPanel prop now that chat is
 * mounted once in AppShell instead of per-route — a page sets this on mount/unmount
 * instead of owning its own chat instance.
 */
export interface UiSlice {
  activeDirectorId: DirectorId | null;
  commsDockOpen: boolean;
  /** Drawer state for the navigation rail below the `md` breakpoint — irrelevant at `md`+, where the
   * nav is always visible (full or icon-rail) and never overlays content. */
  mobileNavOpen: boolean;
  setActiveDirectorId: (id: DirectorId | null) => void;
  setCommsDockOpen: (open: boolean) => void;
  toggleCommsDock: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
}

// Below `lg` the dock renders as a full overlay (see CommsDock.tsx), so defaulting it open
// would greet a phone/tablet user with the chat covering the whole page instead of the
// dashboard they just logged into. Desktop keeps the old "open by default" behavior.
const commsDockDefaultOpen =
  typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches;

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  activeDirectorId: null,
  commsDockOpen: commsDockDefaultOpen,
  mobileNavOpen: false,
  setActiveDirectorId: (id) => set({ activeDirectorId: id }),
  setCommsDockOpen: (open) => set({ commsDockOpen: open }),
  toggleCommsDock: () => set((state) => ({ commsDockOpen: !state.commsDockOpen })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
});
