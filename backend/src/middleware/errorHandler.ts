import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, path: req.path }, "unhandled request error");
  if (res.headersSent) return;
  // Never leak upstream URLs/keys in the error body.
  res.status(500).json({ error: "internal_error" });
}
