import type { StateCreator } from "zustand";
import type { DashboardSnapshot } from "@jarvis/shared";

export interface DashboardSlice {
  dashboardSnapshot: DashboardSnapshot | null;
  apiConnected: boolean;
  setDashboardSnapshot: (snapshot: DashboardSnapshot) => void;
  setApiConnected: (value: boolean) => void;
}

export const createDashboardSlice: StateCreator<DashboardSlice> = (set) => ({
  dashboardSnapshot: null,
  apiConnected: false,
  setDashboardSnapshot: (snapshot) => set({ dashboardSnapshot: snapshot }),
  setApiConnected: (value) => set({ apiConnected: value }),
});
