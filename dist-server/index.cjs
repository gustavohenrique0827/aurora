"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_node_http = __toESM(require("node:http"), 1);
var import_express5 = __toESM(require("express"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_cors = __toESM(require("cors"), 1);

// server/config/env.ts
var import_config = require("dotenv/config");
var import_zod = require("zod");
var envSchema = import_zod.z.object({
  PORT: import_zod.z.coerce.number().default(3001),
  NODE_ENV: import_zod.z.enum(["development", "production", "test"]).default("production"),
  FRONTEND_ORIGIN: import_zod.z.string().optional(),
  JARVIS_AUTH_TOKEN: import_zod.z.string().min(8, "JARVIS_AUTH_TOKEN must be set to a real secret"),
  JARVIS_SESSION_SECRET: import_zod.z.string().min(16, "JARVIS_SESSION_SECRET must be set to a real secret"),
  N8N_CHAT_WEBHOOK_URL: import_zod.z.string().url(),
  JARVIS_STREAMING_ENABLED: import_zod.z.string().default("false").transform((v) => v === "true"),
  N8N_API_URL: import_zod.z.string().url(),
  N8N_API_KEY: import_zod.z.string().min(1, "N8N_API_KEY is required for the dashboard workflow panel"),
  SPY_SUPABASE_URL: import_zod.z.string().url(),
  // The dashboard reads SPY server-side; the anon key is blocked by RLS (returns 0 rows / 401),
  // so a service-role key is needed. Never expose it to the frontend.
  SPY_SUPABASE_SERVICE_ROLE_KEY: import_zod.z.string().optional(),
  SPY_SUPABASE_ANON_KEY: import_zod.z.string().optional(),
  SPY_TENANT_ID: import_zod.z.string().uuid(),
  WAHA_URL: import_zod.z.string().url(),
  WAHA_API_KEY: import_zod.z.string().min(1, "WAHA_API_KEY is required for the WhatsApp status panel"),
  WAHA_SESSION: import_zod.z.string().default("Aurora-Equipe"),
  // Optional: Spotify Client Credentials (app-only auth, no user login) used
  // to resolve "toca X" to a real track and open it via spotify:track:<id>
  // so the desktop app plays it directly. Without these, Spotify requests
  // fall back to spotify:search:<query> (opens the app, doesn't auto-play).
  SPOTIFY_CLIENT_ID: import_zod.z.string().optional(),
  SPOTIFY_CLIENT_SECRET: import_zod.z.string().optional()
});
function withLegacyAxisFallback(raw) {
  const out = { ...raw };
  for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "TENANT_ID"]) {
    out[`SPY_${key}`] ??= raw[`AXIS_${key}`];
  }
  return out;
}
function loadEnv() {
  const parsed = envSchema.safeParse(withLegacyAxisFallback(process.env));
  if (!parsed.success) {
    console.error("Invalid environment configuration:\n" + parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exit(1);
  }
  if (!parsed.data.SPY_SUPABASE_SERVICE_ROLE_KEY && !parsed.data.SPY_SUPABASE_ANON_KEY) {
    console.error("Invalid environment configuration:\n  - SPY_SUPABASE_SERVICE_ROLE_KEY: required for the SPY KPI panel");
    process.exit(1);
  }
  return parsed.data;
}
var env = loadEnv();

// server/utils/logger.ts
var import_pino = __toESM(require("pino"), 1);
var logger = (0, import_pino.default)({
  level: env.NODE_ENV === "production" ? "info" : "debug"
});

// server/middleware/requestLogger.ts
var import_pino_http = __toESM(require("pino-http"), 1);
var requestLogger = (0, import_pino_http.default)({
  logger,
  autoLogging: {
    ignore: (req) => req.url === "/api/health"
  }
});

// server/middleware/errorHandler.ts
function errorHandler(err, req, res, _next) {
  logger.error({ err, path: req.path }, "unhandled request error");
  if (res.headersSent) return;
  res.status(500).json({ error: "internal_error" });
}

// server/middleware/rateLimiter.ts
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var chatRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 6e4,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" }
});

// server/auth/sessionToken.ts
var import_node_crypto = __toESM(require("node:crypto"), 1);
var SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
function base64url(input) {
  return Buffer.from(input).toString("base64url");
}
function sign(payload) {
  return import_node_crypto.default.createHmac("sha256", env.JARVIS_SESSION_SECRET).update(payload).digest("base64url");
}
function createSessionCookieValue() {
  const now = Date.now();
  const payload = {
    sub: "gustavo",
    iat: now,
    exp: now + SESSION_TTL_MS
  };
  const payloadEncoded = base64url(JSON.stringify(payload));
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}
function verifySessionCookieValue(value) {
  if (!value) return false;
  const [payloadEncoded, signature] = value.split(".");
  if (!payloadEncoded || !signature) return false;
  const expectedSignature = sign(payloadEncoded);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !import_node_crypto.default.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8"));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}
function verifyLoginToken(candidate) {
  const expected = Buffer.from(env.JARVIS_AUTH_TOKEN);
  const given = Buffer.from(candidate ?? "");
  if (given.length !== expected.length) return false;
  return import_node_crypto.default.timingSafeEqual(given, expected);
}
var SESSION_COOKIE_NAME = "jarvis_session";
var SESSION_COOKIE_MAX_AGE_MS = SESSION_TTL_MS;

// server/auth/auth.middleware.ts
function requireAuth(req, res, next) {
  const cookieValue = req.cookies?.[SESSION_COOKIE_NAME];
  if (!verifySessionCookieValue(cookieValue)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

// server/auth/auth.routes.ts
var import_express = require("express");
var authRouter = (0, import_express.Router)();
authRouter.post("/login", (req, res) => {
  const body = req.body;
  if (!body?.token || typeof body.token !== "string" || !verifyLoginToken(body.token)) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }
  res.cookie(SESSION_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_COOKIE_MAX_AGE_MS
  });
  const response = { ok: true };
  res.json(response);
});
authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ ok: true });
});
authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ ok: true, sub: "gustavo" });
});

// server/directors/directors.routes.ts
var import_node_crypto2 = __toESM(require("node:crypto"), 1);
var import_express2 = require("express");

// server/jarvis/jarvisClient.ts
var import_axios = __toESM(require("axios"), 1);

// shared/socket-events.ts
var SOCKET_EVENTS = {
  CONNECTION_ACK: "connection:ack",
  CHAT_SEND: "chat:send",
  CHAT_CHUNK: "chat:chunk",
  CHAT_COMPLETE: "chat:complete",
  CHAT_ERROR: "chat:error",
  DASHBOARD_UPDATE: "dashboard:update"
};

// shared/directors.ts
var DIRECTORS = [
  { id: "ceo", name: "CEO AI", title: "Estrat\xE9gia, vis\xE3o e crescimento" },
  { id: "cto", name: "CTO AI", title: "Tecnologia, arquitetura e infraestrutura" },
  { id: "cfo", name: "CFO AI", title: "Financeiro, custos e precifica\xE7\xE3o" },
  { id: "cco", name: "CCO AI", title: "Comercial, vendas e clientes" },
  { id: "coo", name: "COO AI", title: "Opera\xE7\xF5es e processos" },
  { id: "cmo", name: "CMO AI", title: "Marketing, marca e aquisi\xE7\xE3o" },
  { id: "cpo", name: "CPO AI", title: "Produto e roadmap" },
  { id: "cio", name: "CIO AI", title: "Dados e governan\xE7a de informa\xE7\xE3o" },
  { id: "chro", name: "CHRO AI", title: "Pessoas e cultura" },
  { id: "general_counsel", name: "General Counsel AI", title: "Jur\xEDdico e compliance" }
];

// server/jarvis/jarvisClient.ts
function buildChatInput({ message, directorId }) {
  if (!directorId) return message;
  const director = DIRECTORS.find((d) => d.id === directorId);
  if (!director) return message;
  return `Fale diretamente com o ${director.name} (${director.title}): ${message}`;
}
function extractOutputText(responseData) {
  if (typeof responseData === "string") return responseData;
  if (responseData && typeof responseData === "object") {
    const obj = responseData;
    if (typeof obj.output === "string") return obj.output;
    if (typeof obj.text === "string") return obj.text;
    if (Array.isArray(responseData) && responseData[0]) {
      return extractOutputText(responseData[0]);
    }
  }
  return JSON.stringify(responseData);
}
function extractAudioBase64(responseData) {
  if (responseData && typeof responseData === "object") {
    const obj = responseData;
    if (typeof obj.audioBase64 === "string" && obj.audioBase64.length > 0) return obj.audioBase64;
    if (Array.isArray(responseData) && responseData[0]) {
      return extractAudioBase64(responseData[0]);
    }
  }
  return void 0;
}
var N8N_REPLY_TIMEOUT_MS = 15e4;
var JarvisChatError = class extends Error {
};
async function sendNonStreaming(options) {
  const chatInput = buildChatInput(options);
  try {
    const response = await import_axios.default.post(
      env.N8N_CHAT_WEBHOOK_URL,
      {
        action: "sendMessage",
        sessionId: options.sessionId,
        chatInput,
        imageBase64: options.imageBase64,
        imageMimeType: options.imageMimeType,
        documentBase64: options.documentBase64,
        documentMimeType: options.documentMimeType
      },
      { timeout: N8N_REPLY_TIMEOUT_MS }
    );
    return { text: extractOutputText(response.data), audioBase64: extractAudioBase64(response.data) };
  } catch (err) {
    logger.error({ err }, "jarvisClient: non-streaming call to n8n chat webhook failed");
    throw new JarvisChatError(
      import_axios.default.isAxiosError(err) && err.response ? `JARVIS CORE respondeu com status ${err.response.status}` : "N\xE3o foi poss\xEDvel falar com o JARVIS CORE agora."
    );
  }
}
async function sendStreaming(options, onChunk) {
  const chatInput = buildChatInput(options);
  const response = await import_axios.default.post(
    env.N8N_CHAT_WEBHOOK_URL,
    {
      action: "sendMessage",
      sessionId: options.sessionId,
      chatInput,
      imageBase64: options.imageBase64,
      imageMimeType: options.imageMimeType,
      documentBase64: options.documentBase64,
      documentMimeType: options.documentMimeType
    },
    { timeout: N8N_REPLY_TIMEOUT_MS, responseType: "stream" }
  );
  return new Promise((resolve, reject) => {
    let full = "";
    let sawAnyData = false;
    response.data.on("data", (chunk) => {
      sawAnyData = true;
      const text = chunk.toString("utf8");
      full += text;
      onChunk(text);
    });
    response.data.on("end", () => {
      if (!sawAnyData) {
        reject(new JarvisChatError("Streaming n\xE3o retornou nenhum dado"));
        return;
      }
      resolve(full);
    });
    response.data.on("error", (err) => {
      reject(err);
    });
  });
}

// server/directors/directors.routes.ts
var directorsRouter = (0, import_express2.Router)();
directorsRouter.get("/", (_req, res) => {
  res.json({ directors: DIRECTORS });
});
directorsRouter.post("/:id/ask", async (req, res) => {
  const directorId = req.params.id;
  const isValid = DIRECTORS.some((d) => d.id === directorId);
  if (!isValid) {
    res.status(404).json({ error: "unknown_director" });
    return;
  }
  const { message, conversationId } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message_required" });
    return;
  }
  const sessionId = conversationId ?? `director-${directorId}`;
  try {
    const reply = await sendNonStreaming({ message, sessionId, directorId });
    const response = {
      id: import_node_crypto2.default.randomUUID(),
      conversationId: sessionId,
      role: "assistant",
      content: reply.text,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      directorId,
      audioBase64: reply.audioBase64
    };
    res.json(response);
  } catch (err) {
    logger.error({ err, directorId }, "directors.routes: ask failed");
    const message2 = err instanceof JarvisChatError ? err.message : "Erro ao consultar o diretor.";
    res.status(502).json({ error: message2 });
  }
});

// server/dashboard/dashboard.routes.ts
var import_express3 = require("express");

// server/dashboard/dashboard.aggregator.ts
var unavailable = () => ({ status: "unavailable", data: null, lastUpdated: null });
var snapshot = {
  n8n: unavailable(),
  spy: unavailable(),
  waha: unavailable()
};
var listeners = /* @__PURE__ */ new Set();
function notify() {
  for (const listener of listeners) listener(snapshot);
}
function onDashboardUpdate(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getDashboardSnapshot() {
  return snapshot;
}
function updateN8n(state) {
  snapshot = { ...snapshot, n8n: state };
  notify();
}
function updateSpy(state) {
  snapshot = { ...snapshot, spy: state };
  notify();
}
function updateWaha(state) {
  snapshot = { ...snapshot, waha: state };
  notify();
}

// server/dashboard/dashboard.routes.ts
var dashboardRouter = (0, import_express3.Router)();
dashboardRouter.get("/snapshot", (_req, res) => {
  res.json(getDashboardSnapshot());
});

// server/tokenUsage/tokenUsage.routes.ts
var import_express4 = require("express");

// server/spy/spySupabaseClient.ts
var import_supabase_js = require("@supabase/supabase-js");
var spySupabase = (0, import_supabase_js.createClient)(env.SPY_SUPABASE_URL, env.SPY_SUPABASE_SERVICE_ROLE_KEY ?? env.SPY_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});
var SPY_TABLES = [
  "leads",
  "clientes",
  "finance_entries",
  "contracts",
  "proposals",
  "dev_sprint_tasks",
  "dev_projects",
  "dev_issues"
];

// server/tokenUsage/tokenUsage.service.ts
var PRICING_USD_PER_1M = {
  "gemini-3.1-flash-lite": { prompt: 0.25, completion: 1.5 }
};
function costUsd(model, promptTokens, completionTokens) {
  const pricing = PRICING_USD_PER_1M[model];
  if (!pricing) return 0;
  return (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1e6;
}
async function fetchTokenUsageSnapshot() {
  const { data, error } = await spySupabase.from("ai_usage_log").select("workflow_name, agent_group, model, prompt_tokens, completion_tokens, total_tokens, created_at").order("created_at", { ascending: false }).limit(5e3);
  if (error) throw new Error(`ai_usage_log: ${error.message}`);
  const rows = data ?? [];
  const byKey = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = `${row.workflow_name}::${row.model}`;
    const existing = byKey.get(key);
    const rowCost = costUsd(row.model, row.prompt_tokens, row.completion_tokens);
    if (!existing) {
      byKey.set(key, {
        workflowName: row.workflow_name,
        agentGroup: row.agent_group,
        model: row.model,
        calls: 1,
        promptTokens: row.prompt_tokens,
        completionTokens: row.completion_tokens,
        totalTokens: row.total_tokens,
        costUsd: rowCost,
        lastUsedAt: row.created_at
      });
      continue;
    }
    existing.calls += 1;
    existing.promptTokens += row.prompt_tokens;
    existing.completionTokens += row.completion_tokens;
    existing.totalTokens += row.total_tokens;
    existing.costUsd += rowCost;
    if (row.created_at > existing.lastUsedAt) existing.lastUsedAt = row.created_at;
  }
  const byAgent = [...byKey.values()].sort((a, b) => b.costUsd - a.costUsd);
  return {
    totalTokens: byAgent.reduce((sum, a) => sum + a.totalTokens, 0),
    totalCostUsd: byAgent.reduce((sum, a) => sum + a.costUsd, 0),
    byAgent
  };
}

// server/tokenUsage/tokenUsage.routes.ts
var tokenUsageRouter = (0, import_express4.Router)();
tokenUsageRouter.get("/summary", async (_req, res, next) => {
  try {
    res.json(await fetchTokenUsageSnapshot());
  } catch (err) {
    next(err);
  }
});

// server/sockets/socketServer.ts
var import_socket = require("socket.io");

// server/auth/auth.socket.ts
function parseCookies(cookieHeader) {
  const out = {};
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
function socketAuthMiddleware(socket, next) {
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const sessionValue = cookies[SESSION_COOKIE_NAME];
  if (!verifySessionCookieValue(sessionValue)) {
    next(new Error("unauthorized"));
    return;
  }
  next();
}

// server/sockets/events/chatEvents.ts
var import_node_crypto3 = __toESM(require("node:crypto"), 1);

// server/localActions/appLauncher.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var APP_ALIASES = {
  chrome: "Google Chrome",
  navegador: "Google Chrome",
  "google chrome": "Google Chrome",
  vscode: "Visual Studio Code",
  "vs code": "Visual Studio Code",
  "visual studio code": "Visual Studio Code",
  codigo: "Visual Studio Code",
  finder: "Finder",
  terminal: "Terminal",
  mail: "Mail",
  email: "Mail",
  calendario: "Calendar",
  notas: "Notes",
  spotify: "Spotify",
  slack: "Slack",
  whatsapp: "WhatsApp"
};
var SITE_ALIASES = {
  youtube: "https://youtube.com",
  instagram: "https://instagram.com",
  gmail: "https://mail.google.com",
  "google agenda": "https://calendar.google.com",
  "google drive": "https://drive.google.com",
  drive: "https://drive.google.com",
  linkedin: "https://linkedin.com",
  facebook: "https://facebook.com",
  twitter: "https://x.com",
  "whatsapp web": "https://web.whatsapp.com",
  netflix: "https://netflix.com",
  github: "https://github.com",
  "google maps": "https://maps.google.com"
};
var OPEN_VERBS = ["abre", "abrir", "abra", "abri", "mostra", "mostre", "entra", "entrar"];
var FILLER_WORDS = /* @__PURE__ */ new Set(["o", "a", "os", "as", "meu", "minha", "no", "na", "site", "do", "de", "aplicativo", "app", "pra", "mim", "aurora"]);
var STREAMING_SEARCH_VERBS = ["procura", "procurar", "busca", "buscar", "quero ver", "mostra", "mostre"];
var STREAMING_TARGETS = {
  netflix: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  youtube: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  // Spotify's own URI scheme opens the desktop app directly (if installed)
  // instead of the browser — `open "spotify:search:<query>"` hands off to
  // the app via macOS LaunchServices, same mechanism as opening a URL.
  spotify: (q) => `spotify:search:${encodeURIComponent(q)}`
};
function matchStreamingSearch(text) {
  for (const [service, buildUrl] of Object.entries(STREAMING_TARGETS)) {
    if (!text.includes(service)) continue;
    const hasSearchVerb = STREAMING_SEARCH_VERBS.some((v) => text.includes(v));
    if (!hasSearchVerb) continue;
    const targeted = text.match(/(?:filme|video|vídeo|serie|série)\s+(.+?)\s+(?:na|no)\s+\S*/);
    let query = targeted ? targeted[1] : null;
    if (!query) {
      const between = text.match(/(?:procura|procurar|busca|buscar|quero ver|mostra|mostre)\s+(.+?)\s+(?:na|no)\s+\S*/);
      query = between ? between[1] : null;
    }
    query = query?.replace(/^(o|a|um|uma)\s+/, "").trim() ?? null;
    if (!query) continue;
    return { kind: "url", label: `${query} (${service})`, url: buildUrl(query) };
  }
  return null;
}
var stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
function findInstalledApp(query) {
  const dirs = ["/Applications", "/System/Applications", `${import_node_os.default.homedir()}/Applications`];
  const normalizedQuery = stripAccents(query.toLowerCase()).replace(/\s+/g, "");
  for (const dir of dirs) {
    let entries;
    try {
      entries = import_node_fs.default.readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".app")) continue;
      const appName = entry.replace(/\.app$/, "");
      const normalizedApp = stripAccents(appName.toLowerCase()).replace(/\s+/g, "");
      if (normalizedApp === normalizedQuery || normalizedApp.includes(normalizedQuery) || normalizedQuery.includes(normalizedApp)) {
        return appName;
      }
    }
  }
  return null;
}
function looksLikeDomain(query) {
  const compact = query.trim().replace(/\s+/g, "");
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(compact)) {
    return compact.startsWith("http") ? compact : `https://${compact}`;
  }
  return null;
}
var trimPunct = (w) => w.replace(/^[^\w.]+|[^\w.]+$/g, "");
function matchLocalCommand(rawText) {
  const text = stripAccents(rawText.toLowerCase()).trim();
  const words = text.split(/\s+/).map(trimPunct).filter(Boolean);
  if (words.length === 0 || words.length > 12) return null;
  const streamingMatch = matchStreamingSearch(text);
  if (streamingMatch) return streamingMatch;
  const hasOpenVerb = OPEN_VERBS.some((v) => words.includes(v));
  if (!hasOpenVerb) return null;
  for (const [phrase, appName] of Object.entries(APP_ALIASES)) {
    if (text.includes(stripAccents(phrase))) {
      return { kind: "app", label: phrase, appName };
    }
  }
  for (const [phrase, url] of Object.entries(SITE_ALIASES)) {
    if (text.includes(stripAccents(phrase))) {
      return { kind: "url", label: phrase, url };
    }
  }
  const targetWords = words.filter((w) => !OPEN_VERBS.includes(w) && !FILLER_WORDS.has(w));
  const target = targetWords.join(" ").trim();
  if (!target) return null;
  const installedApp = findInstalledApp(target);
  if (installedApp) {
    return { kind: "app", label: target, appName: installedApp };
  }
  const domain = looksLikeDomain(target);
  if (domain) {
    return { kind: "url", label: target, url: domain };
  }
  return null;
}
var MUSIC_VERBS = [
  "toca",
  "toque",
  "tocar",
  "coloca",
  "coloque",
  "colocar",
  "bota",
  "bote",
  "botar",
  "reproduz",
  "reproduza",
  "reproduzir",
  "escuta",
  "escute",
  "escutar",
  "ouve",
  "ouvir"
];
var CONTENT_NOUNS = ["video", "v\xEDdeo", "filme", "serie", "s\xE9rie", "musica", "m\xFAsica"];
function matchContentIntent(rawText) {
  const text = stripAccents(rawText.toLowerCase()).trim();
  const words = text.split(/\s+/).map(trimPunct).filter(Boolean);
  if (words.length === 0 || words.length > 14) return null;
  const musicVerb = MUSIC_VERBS.find((v) => words.includes(stripAccents(v)));
  if (musicVerb) {
    const platformNames = new Set(Object.keys(STREAMING_TARGETS));
    const target = words.filter((w) => w !== musicVerb && !FILLER_WORDS.has(w) && !platformNames.has(w)).join(" ").trim();
    if (target) return { kind: "url", label: `${target} (spotify)`, url: STREAMING_TARGETS.spotify(target) };
  }
  const noun = CONTENT_NOUNS.map(stripAccents).find((n) => words.includes(n));
  if (!noun) return null;
  const platform = Object.keys(STREAMING_TARGETS).find((p) => text.includes(p));
  if (platform) {
    const targeted2 = text.match(new RegExp(`${noun}\\s+(.+?)\\s+(?:na|no)\\s+${platform}`));
    const query2 = targeted2?.[1]?.replace(/^(o|a|um|uma|do|da|de)\s+/, "").trim();
    if (query2) return { kind: "url", label: `${query2} (${platform})`, url: STREAMING_TARGETS[platform](query2) };
  }
  const targeted = text.match(new RegExp(`${noun}\\s+(?:d[eo]\\s+)?(.+)$`));
  const query = targeted?.[1]?.trim();
  return query ? { kind: "pending", query } : null;
}
function launchApp(appName) {
  return new Promise((resolve, reject) => {
    (0, import_node_child_process.execFile)("open", ["-a", appName], (error) => {
      if (error) {
        logger.error({ error, appName }, "localActions: failed to launch app");
        reject(error);
        return;
      }
      logger.info({ appName }, "localActions: app launched");
      resolve();
    });
  });
}
var spotifyTokenCache = null;
async function getSpotifyAccessToken() {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return null;
  if (spotifyTokenCache && spotifyTokenCache.expiresAt > Date.now()) return spotifyTokenCache.token;
  try {
    const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials"
    });
    if (!res.ok) return null;
    const data = await res.json();
    spotifyTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1e3 };
    return spotifyTokenCache.token;
  } catch (err) {
    logger.warn({ err }, "localActions: spotify auth failed, falling back to search");
    return null;
  }
}
async function searchSpotifyTrackId(query) {
  const token = await getSpotifyAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.tracks?.items?.[0]?.id ?? null;
  } catch (err) {
    logger.warn({ err, query }, "localActions: spotify track search failed, falling back to search");
    return null;
  }
}
async function resolveSpotifyUri(url) {
  const match = url.match(/^spotify:search:(.+)$/);
  if (!match) return url;
  const trackId = await searchSpotifyTrackId(decodeURIComponent(match[1]));
  return trackId ? `spotify:track:${trackId}` : url;
}
async function launchUrl(url) {
  const resolvedUrl = await resolveSpotifyUri(url);
  return new Promise((resolve, reject) => {
    (0, import_node_child_process.execFile)("open", [resolvedUrl], (error) => {
      if (error) {
        logger.error({ error, url: resolvedUrl }, "localActions: failed to open url");
        reject(error);
        return;
      }
      logger.info({ url: resolvedUrl }, "localActions: url opened");
      resolve();
    });
  });
}

// server/localActions/projectFiles.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var PROJECTS_ROOT = import_node_path.default.join(import_node_os2.default.homedir(), "Documents", "Projetos");
var MAX_FILE_CHARS = 6e3;
var MAX_DEPTH = 3;
var EXCLUDED_NAME_PATTERN = /^(\.env.*|\.git|node_modules|\.ssh|.*\.pem$|.*credentials.*|.*secret.*|.*\.key$|package-lock\.json|\.ds_store|.*\.icloud-bak$|.*[-.]bak$)$/i;
function isExcluded(name) {
  return name.startsWith(".") || EXCLUDED_NAME_PATTERN.test(name);
}
function stripAccents2(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function listProjectRoots() {
  try {
    return import_node_fs2.default.readdirSync(PROJECTS_ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && !isExcluded(e.name)).map((e) => e.name);
  } catch {
    return [];
  }
}
function resolveProjectDir(nameHint) {
  const target = stripAccents2(nameHint.toLowerCase()).replace(/\s+/g, "");
  for (const name of listProjectRoots()) {
    const normalized = stripAccents2(name.toLowerCase()).replace(/\s+/g, "");
    if (normalized === target || normalized.includes(target) || target.includes(normalized)) {
      const full = import_node_path.default.join(PROJECTS_ROOT, name);
      if (import_node_path.default.resolve(full).startsWith(import_node_path.default.resolve(PROJECTS_ROOT) + import_node_path.default.sep)) return full;
    }
  }
  return null;
}
function findFile(projectDir, fileHint) {
  const target = stripAccents2(fileHint.toLowerCase()).replace(/\s+/g, "");
  const stack = [{ dir: projectDir, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (depth > MAX_DEPTH) continue;
    let entries;
    try {
      entries = import_node_fs2.default.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (isExcluded(entry.name)) continue;
      const full = import_node_path.default.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
      } else {
        const normalized = stripAccents2(entry.name.toLowerCase()).replace(/\s+/g, "");
        if (normalized === target || normalized === `${target}.md` || normalized.startsWith(target)) {
          return full;
        }
      }
    }
  }
  return null;
}
function listDir(dir) {
  try {
    const entries = import_node_fs2.default.readdirSync(dir, { withFileTypes: true }).filter((e) => !isExcluded(e.name)).map((e) => `${e.isDirectory() ? "\u{1F4C1}" : "\u{1F4C4}"} ${e.name}`);
    return entries.length > 0 ? entries.join("\n") : "(pasta vazia)";
  } catch (err) {
    return `(erro ao ler a pasta: ${err.message})`;
  }
}
function matchProjectContextRequest(rawText) {
  const text = stripAccents2(rawText.toLowerCase()).trim().replace(/[!?.]+$/, "");
  if (/\bliste\s+os\s+projetos\b/.test(text)) {
    const roots = listProjectRoots();
    return {
      contextBlock: roots.length > 0 ? `[Pastas em ${PROJECTS_ROOT}]:
${roots.map((r) => `\u{1F4C1} ${r}`).join("\n")}` : `[Nenhuma pasta encontrada em ${PROJECTS_ROOT}]`
    };
  }
  const listMatch = text.match(/(?:o que tem no|liste o|mostra o|mostre o)\s+projeto\s+([a-z0-9._-]+)/);
  if (listMatch) {
    const projectDir = resolveProjectDir(listMatch[1]);
    if (!projectDir) return { contextBlock: `[N\xE3o encontrei um projeto chamado "${listMatch[1]}" em ${PROJECTS_ROOT}]` };
    return { contextBlock: `[Conte\xFAdo de ${import_node_path.default.basename(projectDir)}]:
${listDir(projectDir)}` };
  }
  const readMatch = text.match(/(?:leia|le|mostra|mostre|resuma|resume)\s+(?:o\s+|a\s+)?([a-z0-9._-]+)\s+do\s+projeto\s+([a-z0-9._-]+)/);
  if (readMatch) {
    const [, fileHint, projectHint] = readMatch;
    const projectDir = resolveProjectDir(projectHint);
    if (!projectDir) return { contextBlock: `[N\xE3o encontrei um projeto chamado "${projectHint}" em ${PROJECTS_ROOT}]` };
    const filePath = findFile(projectDir, fileHint);
    if (!filePath) return { contextBlock: `[N\xE3o encontrei um arquivo chamado "${fileHint}" no projeto ${import_node_path.default.basename(projectDir)}]` };
    try {
      const content = import_node_fs2.default.readFileSync(filePath, "utf8").slice(0, MAX_FILE_CHARS);
      return { contextBlock: `[Conte\xFAdo de ${import_node_path.default.relative(PROJECTS_ROOT, filePath)}]:
${content}` };
    } catch (err) {
      return { contextBlock: `[Erro ao ler ${import_node_path.default.relative(PROJECTS_ROOT, filePath)}: ${err.message}]` };
    }
  }
  return null;
}

// server/localActions/localIntents.ts
var pendingByConversation = /* @__PURE__ */ new Map();
var PENDING_TTL_MS = 3 * 60 * 1e3;
function prunePending() {
  const now = Date.now();
  for (const [id, entry] of pendingByConversation) {
    if (now - entry.createdAt >= PENDING_TTL_MS) pendingByConversation.delete(id);
  }
}
var FOLLOWUP_PHRASES = /* @__PURE__ */ new Set([
  "abre",
  "abre para mim",
  "abre isso",
  "abre essa",
  "abre esse",
  "pode abrir",
  "pode colocar",
  "coloca essa",
  "coloca isso",
  "toca essa",
  "toca isso",
  "esse",
  "essa"
]);
function matchFollowup(rawText) {
  const text = stripAccents(rawText.toLowerCase()).trim().replace(/[!?.]+$/, "");
  if (FOLLOWUP_PHRASES.has(text)) return {};
  const platformMatch = text.match(/^abre no (youtube|netflix|spotify)$/) || text.match(/^abre na (netflix)$/);
  if (platformMatch) return { platform: platformMatch[1] };
  return null;
}
async function executeUrl(url, label) {
  try {
    await launchUrl(url);
    return { content: `Abrindo ${label}, Senhor Gustavo.` };
  } catch {
    return { content: "N\xE3o consegui abrir isso agora.", error: "local_command_failed" };
  }
}
function resolveLocalIntent(rawText, conversationId) {
  prunePending();
  const pendingEntry = pendingByConversation.get(conversationId);
  if (pendingEntry) {
    const followup = matchFollowup(rawText);
    if (followup) {
      pendingByConversation.delete(conversationId);
      const platform = followup.platform ?? "youtube";
      const url = STREAMING_TARGETS[platform](pendingEntry.query);
      return {
        type: "short_circuit",
        intentType: platform === "spotify" ? "OPEN_MUSIC_SEARCH" : "OPEN_STREAMING",
        execute: () => executeUrl(url, `${pendingEntry.query} (${platform})`)
      };
    }
  }
  const localCommand = matchLocalCommand(rawText);
  if (localCommand) {
    return {
      type: "short_circuit",
      intentType: intentTypeForCommand(localCommand),
      execute: () => executeLocalCommand(localCommand)
    };
  }
  const contentIntent = matchContentIntent(rawText);
  if (contentIntent) {
    if (contentIntent.kind === "url") {
      const isMusic = contentIntent.url.startsWith("spotify:");
      return {
        type: "short_circuit",
        intentType: isMusic ? "OPEN_MUSIC_SEARCH" : "OPEN_STREAMING",
        execute: () => executeUrl(contentIntent.url, contentIntent.label)
      };
    }
    pendingByConversation.set(conversationId, { query: contentIntent.query, createdAt: Date.now() });
    return null;
  }
  const projectContext = matchProjectContextRequest(rawText);
  if (projectContext) {
    return {
      type: "context_injection",
      intentType: "GET_FILE",
      contextBlock: projectContext.contextBlock
    };
  }
  return null;
}
function intentTypeForCommand(command) {
  if (command.kind === "app") return "OPEN_APP";
  return command.url.includes("netflix.com/search") || command.url.includes("youtube.com/results") ? "OPEN_STREAMING" : "OPEN_WEBSITE";
}
async function executeLocalCommand(command) {
  try {
    if (command.kind === "app") {
      await launchApp(command.appName);
      return { content: `Abrindo ${command.appName}, Senhor Gustavo.` };
    }
    await launchUrl(command.url);
    return { content: `Abrindo ${command.label}, Senhor Gustavo.` };
  } catch {
    return { content: "N\xE3o consegui abrir isso agora.", error: "local_command_failed" };
  }
}

// server/sockets/events/chatEvents.ts
function registerChatEvents(socket) {
  socket.on(SOCKET_EVENTS.CHAT_SEND, async (payload) => {
    const { conversationId, message, directorId, imageBase64, imageMimeType, documentBase64, documentMimeType } = payload;
    if (!message || !conversationId) {
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, { conversationId, error: "mensagem inv\xE1lida" });
      return;
    }
    const localIntent = resolveLocalIntent(message, conversationId);
    if (localIntent?.type === "short_circuit") {
      const outcome = await localIntent.execute();
      const responseMessage = {
        id: import_node_crypto3.default.randomUUID(),
        conversationId,
        role: "assistant",
        content: outcome.content,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        directorId,
        error: outcome.error
      };
      socket.emit(SOCKET_EVENTS.CHAT_COMPLETE, { conversationId, message: responseMessage });
      return;
    }
    const outboundMessage = localIntent?.type === "context_injection" ? `${message}

${localIntent.contextBlock}` : message;
    try {
      let fullText;
      let audioBase64;
      if (env.JARVIS_STREAMING_ENABLED) {
        try {
          fullText = await sendStreaming(
            {
              message: outboundMessage,
              sessionId: conversationId,
              directorId,
              imageBase64,
              imageMimeType,
              documentBase64,
              documentMimeType
            },
            (delta) => {
              socket.emit(SOCKET_EVENTS.CHAT_CHUNK, { conversationId, delta });
            }
          );
        } catch (streamErr) {
          logger.warn({ streamErr }, "chatEvents: streaming failed, falling back to non-streaming");
          const reply = await sendNonStreaming({
            message: outboundMessage,
            sessionId: conversationId,
            directorId,
            imageBase64,
            imageMimeType,
            documentBase64,
            documentMimeType
          });
          fullText = reply.text;
          audioBase64 = reply.audioBase64;
        }
      } else {
        const reply = await sendNonStreaming({
          message: outboundMessage,
          sessionId: conversationId,
          directorId,
          imageBase64,
          imageMimeType,
          documentBase64,
          documentMimeType
        });
        fullText = reply.text;
        audioBase64 = reply.audioBase64;
      }
      const responseMessage = {
        id: import_node_crypto3.default.randomUUID(),
        conversationId,
        role: "assistant",
        content: fullText,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        directorId,
        audioBase64
      };
      socket.emit(SOCKET_EVENTS.CHAT_COMPLETE, { conversationId, message: responseMessage });
    } catch (err) {
      logger.error({ err }, "chatEvents: chat:send failed on both streaming and non-streaming paths");
      const errorText = err instanceof JarvisChatError ? err.message : "N\xE3o foi poss\xEDvel falar com o JARVIS agora.";
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, { conversationId, error: errorText });
    }
  });
}

// server/sockets/events/dashboardEvents.ts
function registerDashboardBroadcast(io) {
  onDashboardUpdate((snapshot2) => {
    io.emit(SOCKET_EVENTS.DASHBOARD_UPDATE, snapshot2);
  });
}
function sendInitialDashboardSnapshot(socket) {
  socket.emit(SOCKET_EVENTS.DASHBOARD_UPDATE, getDashboardSnapshot());
}

// server/sockets/socketServer.ts
function createSocketServer(httpServer2) {
  const io = new import_socket.Server(httpServer2, {
    cors: env.FRONTEND_ORIGIN ? { origin: env.FRONTEND_ORIGIN, credentials: true } : void 0
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

// server/n8nApi/n8nApiClient.ts
var import_axios2 = __toESM(require("axios"), 1);
var client = import_axios2.default.create({
  baseURL: env.N8N_API_URL,
  timeout: 15e3,
  headers: { "X-N8N-API-KEY": env.N8N_API_KEY }
});
async function fetchJarvisWorkflows() {
  const workflows = [];
  let cursor;
  do {
    const response = await client.get("/workflows", {
      params: { limit: 100, cursor }
    });
    const page = response.data?.data ?? [];
    workflows.push(...page);
    cursor = response.data?.nextCursor ?? void 0;
  } while (cursor);
  return workflows;
}
async function fetchLatestExecution(workflowId) {
  const response = await client.get("/executions", {
    params: { workflowId, limit: 1 }
  });
  const data = response.data?.data ?? [];
  return data[0] ?? null;
}

// server/n8nApi/n8nApi.poller.ts
var POLL_INTERVAL_MS = 2e4;
function mapExecutionStatus(status, finished) {
  if (status === "success") return "success";
  if (status === "error" || status === "crashed" || status === "failed") return "error";
  if (!finished) return "running";
  return "unknown";
}
function classifyKind(name) {
  const bare = name.replace(/^\[[^\]]+\]\s*/, "");
  if (/^(WA )?Tool\s*-/i.test(bare)) return "tool";
  return "agent";
}
async function pollOnce() {
  try {
    const rawWorkflows = await fetchJarvisWorkflows();
    const workflows = await Promise.all(
      rawWorkflows.map(async (w) => {
        try {
          const execution = await fetchLatestExecution(w.id);
          return {
            id: w.id,
            name: w.name,
            active: w.active,
            lastExecutionStatus: execution ? mapExecutionStatus(execution.status, execution.finished) : null,
            lastExecutionAt: execution?.startedAt ?? null,
            kind: classifyKind(w.name)
          };
        } catch {
          return {
            id: w.id,
            name: w.name,
            active: w.active,
            lastExecutionStatus: null,
            lastExecutionAt: null,
            kind: classifyKind(w.name)
          };
        }
      })
    );
    const snapshot2 = {
      workflows,
      activeCount: workflows.filter((w) => w.active).length,
      inactiveCount: workflows.filter((w) => !w.active).length
    };
    updateN8n({ status: "live", data: snapshot2, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    logger.warn({ err }, "n8nApi.poller: failed to refresh workflow snapshot");
    const previous = getDashboardSnapshot().n8n;
    updateN8n({
      status: "error",
      data: previous.data,
      // keep last known numbers visible, but clearly tagged as errored
      lastUpdated: previous.lastUpdated,
      error: err instanceof Error ? err.message : "unknown error"
    });
  }
}
function startN8nPoller() {
  void pollOnce();
  setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
}

// server/spy/spyKpi.service.ts
var LABEL_COLUMN = {
  leads: "name",
  clientes: "name",
  finance_entries: "description",
  contracts: "title",
  proposals: "titulo",
  dev_sprint_tasks: "title",
  dev_projects: "name",
  dev_issues: "title"
};
var TABLES_WITH_NULLABLE_TENANT = /* @__PURE__ */ new Set(["finance_entries", "dev_sprint_tasks"]);
function applyTenantFilter(query, table) {
  const q = query;
  if (TABLES_WITH_NULLABLE_TENANT.has(table)) {
    return q.or(`tenant_id.eq.${env.SPY_TENANT_ID},tenant_id.is.null`);
  }
  return q.eq("tenant_id", env.SPY_TENANT_ID);
}
async function countForTable(table) {
  const base = spySupabase.from(table).select("*", { count: "exact", head: true });
  const { count, error } = await applyTenantFilter(base, table);
  if (error) throw new Error(`${table}: ${error.message}`);
  return { table, count: count ?? 0 };
}
async function recentForTable(table) {
  const labelColumn = LABEL_COLUMN[table];
  const base = spySupabase.from(table).select(`id, created_at, ${labelColumn}`);
  const { data, error } = await applyTenantFilter(base, table).order("created_at", { ascending: false }).limit(3);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []).map((row) => {
    const record = row;
    return {
      table,
      id: String(record.id),
      label: typeof record[labelColumn] === "string" ? record[labelColumn] : `(${table})`,
      createdAt: String(record.created_at)
    };
  });
}
async function fetchSpyKpiSnapshot() {
  const counts = await Promise.all(SPY_TABLES.map(countForTable));
  const recentPerTable = await Promise.all(SPY_TABLES.map(recentForTable));
  const recent = recentPerTable.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
  return { counts, recent };
}

// server/spy/spyKpi.poller.ts
var POLL_INTERVAL_MS2 = 3e4;
async function pollOnce2() {
  try {
    const snapshot2 = await fetchSpyKpiSnapshot();
    updateSpy({ status: "live", data: snapshot2, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    logger.warn({ err }, "spyKpi.poller: failed to refresh SPY KPI snapshot");
    const previous = getDashboardSnapshot().spy;
    updateSpy({
      status: "error",
      data: previous.data,
      lastUpdated: previous.lastUpdated,
      error: err instanceof Error ? err.message : "unknown error"
    });
  }
}
function startSpyPoller() {
  void pollOnce2();
  setInterval(() => void pollOnce2(), POLL_INTERVAL_MS2);
}

// server/waha/wahaClient.ts
var import_axios3 = __toESM(require("axios"), 1);
var client2 = import_axios3.default.create({
  baseURL: env.WAHA_URL,
  timeout: 1e4,
  headers: { "X-Api-Key": env.WAHA_API_KEY }
});
async function fetchWahaSessionStatus() {
  const response = await client2.get(`/api/sessions/${env.WAHA_SESSION}`);
  const status = response.data?.status;
  const known = ["WORKING", "STARTING", "SCAN_QR_CODE", "FAILED", "STOPPED"];
  return known.find((s) => s === status) ?? "STOPPED";
}

// server/waha/waha.poller.ts
var POLL_INTERVAL_MS3 = 2e4;
async function pollOnce3() {
  try {
    const status = await fetchWahaSessionStatus();
    updateWaha({
      status: "live",
      data: { session: env.WAHA_SESSION, status },
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    logger.warn({ err }, "waha.poller: failed to refresh WAHA session status");
    const previous = getDashboardSnapshot().waha;
    updateWaha({
      status: "error",
      data: previous.data,
      lastUpdated: previous.lastUpdated,
      error: err instanceof Error ? err.message : "unknown error"
    });
  }
}
function startWahaPoller() {
  void pollOnce3();
  setInterval(() => void pollOnce3(), POLL_INTERVAL_MS3);
}

// server/index.ts
var app = (0, import_express5.default)();
app.use(requestLogger);
app.use(import_express5.default.json({ limit: "2mb" }));
app.use((0, import_cookie_parser.default)());
if (env.FRONTEND_ORIGIN) {
  app.use((0, import_cors.default)({ origin: env.FRONTEND_ORIGIN, credentials: true }));
}
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "jarvis-backend" });
});
app.use("/api/auth", authRouter);
app.use("/api/directors", requireAuth, chatRateLimiter, directorsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/token-usage", requireAuth, tokenUsageRouter);
app.use(errorHandler);
var httpServer = import_node_http.default.createServer(app);
createSocketServer(httpServer);
startN8nPoller();
startSpyPoller();
startWahaPoller();
httpServer.listen(env.PORT, () => {
  logger.info(`JARVIS backend listening on port ${env.PORT}`);
});
