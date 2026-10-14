import type { Socket } from "socket.io";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "./sessionToken";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    out[key] = value;
  }
  return out;
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const sessionValue = cookies[SESSION_COOKIE_NAME];

  if (!verifySessionCookieValue(sessionValue)) {
    next(new Error("unauthorized"));
    return;
  }
  next();
}
