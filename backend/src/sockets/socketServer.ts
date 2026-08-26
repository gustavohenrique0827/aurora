import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { SOCKET_EVENTS } from "@jarvis/shared";
import { env } from "../config/env";
import { socketAuthMiddleware } from "../auth/auth.socket";
import { registerChatEvents } from "./events/chatEvents";
import { registerDashboardBroadcast, sendInitialDashboardSnapshot } from "./events/dashboardEvents";
import { logger } from "../utils/logger";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: env.FRONTEND_ORIGIN
      ? { origin: env.FRONTEND_ORIGIN, credentials: true }
      : undefined,
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "socket connected");

    socket.emit(SOCKET_EVENTS.CONNECTION_ACK, { streamingEnabled: env.JARVIS_STREAMING_ENABLED });
    sendInitialDashboardSnapshot(socket);
    registerChatEvents(socket);

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "socket disconnected");
    });
  });

  registerDashboardBroadcast(io);

  return io;
}
