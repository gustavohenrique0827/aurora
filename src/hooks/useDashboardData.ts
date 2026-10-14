import { useEffect } from "react";
import { startDashboardPolling } from "../state/realtime";
import { useJarvisStore } from "../state/store";

/** Keeps the dashboard snapshot fresh by polling /api/dashboard/snapshot (see realtime.ts). */
export function useDashboardData() {
  useEffect(() => {
    startDashboardPolling();
  }, []);

  const snapshot = useJarvisStore((s) => s.dashboardSnapshot);
  const apiConnected = useJarvisStore((s) => s.apiConnected);

  return { snapshot, apiConnected };
}
