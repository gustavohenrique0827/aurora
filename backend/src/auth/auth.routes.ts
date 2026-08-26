import { Router } from "express";
import type { LoginRequest, LoginResponse } from "@jarvis/shared";
import { env } from "../config/env";
import { requireAuth } from "./auth.middleware";
import { createSessionCookieValue, SESSION_COOKIE_MAX_AGE_MS, SESSION_COOKIE_NAME, verifyLoginToken } from "./sessionToken";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const body = req.body as Partial<LoginRequest>;
  if (!body?.token || typeof body.token !== "string" || !verifyLoginToken(body.token)) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  res.cookie(SESSION_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });

  const response: LoginResponse = { ok: true };
  res.json(response);
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ ok: true, sub: "gustavo" });
});
