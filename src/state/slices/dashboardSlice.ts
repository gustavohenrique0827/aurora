import type { StateCreator } from "zustand";
import type { DashboardSnapshot } from "@jarvis/shared";

export interface DashboardSlice {
  dashboardSnapshot: DashboardSnapshot | null;
  socketConnected: boolean;
  setDashboardSnapshot: (snapshot: DashboardSnapshot) => void;
  setSocketConnected: (value: boolean) => void;
}

export const createDashboardSlice: StateCreator<DashboardSlice> = (set) => ({
  dashboardSnapshot: null,
  socketConnected: false,
  setDashboardSnapshot: (snapshot) => set({ dashboardSnapshot: snapshot }),
  setSocketConnected: (value) => set({ socketConnected: value }),
});
