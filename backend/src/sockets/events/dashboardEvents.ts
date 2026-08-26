import type { Server } from "socket.io";
import { SOCKET_EVENTS } from "@jarvis/shared";
import { getDashboardSnapshot, onDashboardUpdate } from "../../dashboard/dashboard.aggregator";

/** Registered once for the whole server — broadcasts every aggregator update to all connected clients. */
export function registerDashboardBroadcast(io: Server): void {
  onDashboardUpdate((snapshot) => {
    io.emit(SOCKET_EVENTS.DASHBOARD_UPDATE, snapshot);
  });
}

/** Called per-connection so a freshly connected client gets the current state immediately, not just on the next poll tick. */
export function sendInitialDashboardSnapshot(socket: import("socket.io").Socket): void {
  socket.emit(SOCKET_EVENTS.DASHBOARD_UPDATE, getDashboardSnapshot());
}
