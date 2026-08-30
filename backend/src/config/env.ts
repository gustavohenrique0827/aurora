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

  AXIS_SUPABASE_URL: z.string().url(),
  AXIS_SUPABASE_ANON_KEY: z.string().min(1, "AXIS_SUPABASE_ANON_KEY is required for the Axis KPI panel"),
  AXIS_TENANT_ID: z.string().uuid(),

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

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:\n" + parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
