import crypto from "node:crypto";
import { env } from "../config/env";
import type { AuthTokenPayload } from "@jarvis/shared";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — single user, low-risk to keep long-lived

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.JARVIS_SESSION_SECRET).update(payload).digest("base64url");
}

export function createSessionCookieValue(): string {
  const now = Date.now();
  const payload: AuthTokenPayload = {
    sub: "gustavo",
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadEncoded = base64url(JSON.stringify(payload));
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifySessionCookieValue(value: string | undefined): boolean {
  if (!value) return false;
  const [payloadEncoded, signature] = value.split(".");
  if (!payloadEncoded || !signature) return false;

  const expectedSignature = sign(payloadEncoded);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as AuthTokenPayload;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function verifyLoginToken(candidate: string): boolean {
  const expected = Buffer.from(env.JARVIS_AUTH_TOKEN);
  const given = Buffer.from(candidate ?? "");
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}

export const SESSION_COOKIE_NAME = "jarvis_session";
export const SESSION_COOKIE_MAX_AGE_MS = SESSION_TTL_MS;
