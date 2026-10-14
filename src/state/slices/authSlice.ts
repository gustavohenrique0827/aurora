import type { StateCreator } from "zustand";

export interface AuthSlice {
  isAuthenticated: boolean;
  authChecked: boolean;
  setAuthenticated: (value: boolean) => void;
  setAuthChecked: (value: boolean) => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  isAuthenticated: false,
  authChecked: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setAuthChecked: (value) => set({ authChecked: value }),
});
