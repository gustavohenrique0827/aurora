import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  FRONTEND_ORIGIN: z.string().optional(),

  JARVIS_AUTH_TOKEN: z.string().min(8, "JARVIS_AUTH_TOKEN must be set to a real secret"),
  JARVIS_SESSION_SECRET: z.string().min(16, "JARVIS_SESSION_SECRET must be set to a real secret"),

  N8N_CHAT_WEBHOOK_URL: z.string().url(),
  JARVIS_STREAMING_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  N8N_API_URL: z.string().url(),
  N8N_API_KEY: z.string().min(1, "N8N_API_KEY is required for the dashboard workflow panel"),

  SPY_SUPABASE_URL: z.string().url(),
  // The dashboard reads SPY server-side; the anon key is blocked by RLS (returns 0 rows / 401),
  // so a service-role key is needed. Never expose it to the frontend.
  SPY_SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SPY_SUPABASE_ANON_KEY: z.string().optional(),
  SPY_TENANT_ID: z.string().uuid(),

  WAHA_URL: z.string().url(),
  WAHA_API_KEY: z.string().min(1, "WAHA_API_KEY is required for the WhatsApp status panel"),
  WAHA_SESSION: z.string().default("Aurora-Equipe"),

  // Optional: Spotify Client Credentials (app-only auth, no user login) used
  // to resolve "toca X" to a real track and open it via spotify:track:<id>
  // so the desktop app plays it directly. Without these, Spotify requests
  // fall back to spotify:search:<query> (opens the app, doesn't auto-play).
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Deployments created before the Axis→SPY rename still carry AXIS_* variables; SPY_* wins when both exist. */
function withLegacyAxisFallback(raw: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out = { ...raw };
  for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "TENANT_ID"]) {
    out[`SPY_${key}`] ??= raw[`AXIS_${key}`];
  }
  return out;
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(withLegacyAxisFallback(process.env));
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:\n" + parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exit(1);
  }
  if (!parsed.data.SPY_SUPABASE_SERVICE_ROLE_KEY && !parsed.data.SPY_SUPABASE_ANON_KEY) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:\n  - SPY_SUPABASE_SERVICE_ROLE_KEY: required for the SPY KPI panel");
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
