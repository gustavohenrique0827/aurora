import { useEffect } from "react";
import { getSocket } from "../state/socket";
import { useJarvisStore } from "../state/store";

/** Subscribes to live dashboard:update pushes. Initial snapshot arrives right after socket connect (see socketServer.ts). */
export function useDashboardData() {
  useEffect(() => {
    getSocket();
  }, []);

  const snapshot = useJarvisStore((s) => s.dashboardSnapshot);
  const socketConnected = useJarvisStore((s) => s.socketConnected);

  return { snapshot, socketConnected };
}
