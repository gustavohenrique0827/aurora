import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "./sessionToken";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookieValue = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  if (!verifySessionCookieValue(cookieValue)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
