import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { logger } from "../utils/logger";
import { env } from "../config/env";

/**
 * Fast-path aliases for apps/sites whose macOS bundle name or URL doesn't match
 * what Gustavo would naturally say — checked before the dynamic /Applications
 * lookup and before generic domain detection. Site nicknames map straight to a
 * URL; app nicknames map to a real macOS app name (still opened via `open -a`,
 * never a shell string).
 */
const APP_ALIASES: Record<string, string> = {
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
  whatsapp: "WhatsApp",
};

const SITE_ALIASES: Record<string, string> = {
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
  "google maps": "https://maps.google.com",
};

const OPEN_VERBS = ["abre", "abrir", "abra", "abri", "mostra", "mostre", "entra", "entrar"];
const FILLER_WORDS = new Set(["o", "a", "os", "as", "meu", "minha", "no", "na", "site", "do", "de", "aplicativo", "app", "pra", "mim", "aurora"]);

/**
 * "procura o filme/vídeo X na netflix/youtube" → search-results deep link.
 * No real playback API exists for either service (nothing an assistant can
 * legitimately control), so this is deliberately scoped to "open with the
 * search already typed in" — never a promise to "play" anything.
 */
const STREAMING_SEARCH_VERBS = ["procura", "procurar", "busca", "buscar", "quero ver", "mostra", "mostre"];
export const STREAMING_TARGETS = {
  netflix: (q: string) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  youtube: (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  // Spotify's own URI scheme opens the desktop app directly (if installed)
  // instead of the browser — `open "spotify:search:<query>"` hands off to
  // the app via macOS LaunchServices, same mechanism as opening a URL.
  spotify: (q: string) => `spotify:search:${encodeURIComponent(q)}`,
};
export type StreamingPlatform = keyof typeof STREAMING_TARGETS;

function matchStreamingSearch(text: string): { kind: "url"; label: string; url: string } | null {
  for (const [service, buildUrl] of Object.entries(STREAMING_TARGETS)) {
    if (!text.includes(service)) continue;
    const hasSearchVerb = STREAMING_SEARCH_VERBS.some((v) => text.includes(v));
    if (!hasSearchVerb) continue;
    // Pull out "filme/video/serie <query>" or fall back to everything between
    // the verb and the service name.
    const targeted = text.match(/(?:filme|video|vídeo|serie|série)\s+(.+?)\s+(?:na|no)\s+\S*/);
    let query: string | null = targeted ? targeted[1] : null;
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

export const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export type LocalCommandMatch = { kind: "app"; label: string; appName: string } | { kind: "url"; label: string; url: string };

function findInstalledApp(query: string): string | null {
  const dirs = ["/Applications", "/System/Applications", `${os.homedir()}/Applications`];
  const normalizedQuery = stripAccents(query.toLowerCase()).replace(/\s+/g, "");
  for (const dir of dirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
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

function looksLikeDomain(query: string): string | null {
  const compact = query.trim().replace(/\s+/g, "");
  // e.g. "gtech.com.br", "openai.com" — a bare word.word(.word) shape, no spaces.
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(compact)) {
    return compact.startsWith("http") ? compact : `https://${compact}`;
  }
  return null;
}

/**
 * Only fires on short, explicit "open <target>" phrasing — never inferred from
 * general conversation. Gustavo asked specifically for this to require a clear
 * command, since wake-word listening is always-on and a loose match risks
 * launching things from unrelated chatter. Resolution order: known alias
 * (app or site) → any real installed app by name → bare domain → give up
 * (falls through to normal AI chat, nothing fires on an unresolved target).
 */
// Strips leading/trailing punctuation (commas, periods, "!", "?") from a word
// WITHOUT touching internal dots — "aurora," -> "aurora", but "gtech.com.br"
// stays intact so domain detection still works.
const trimPunct = (w: string) => w.replace(/^[^\w.]+|[^\w.]+$/g, "");

export function matchLocalCommand(rawText: string): LocalCommandMatch | null {
  const text = stripAccents(rawText.toLowerCase()).trim();
  const words = text
    .split(/\s+/)
    .map(trimPunct)
    .filter(Boolean);
  if (words.length === 0 || words.length > 12) return null;

  // Checked before the open-verb gate: "procura"/"busca"/"quero ver" aren't
  // OPEN_VERBS, but a streaming search request is still a valid, explicit
  // local command.
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

  // Remainder after the verb + filler words is the candidate target — try it
  // against real installed apps, then as a bare domain.
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

/**
 * Recognizes a request to open specific CONTENT ("vídeo do Homem de Ferro no
 * YouTube", "toca Tô Bem Melhor", "filme X na Netflix") without needing an
 * explicit open-verb first — this is what makes Aurora act on a bare content
 * mention instead of just replying with a recommendation. Two outcomes:
 *   - "url": platform is clear (named explicitly, or a play-verb implies
 *     Spotify) — safe to open immediately.
 *   - "pending": a content noun was mentioned but no platform was named —
 *     NOT opened yet (guessing the platform wrong is worse than waiting);
 *     the caller (localIntents.ts) remembers this so a short follow-up like
 *     "abre para mim" can resolve it against this same query.
 * Deliberately still requires a real content noun (vídeo/filme/música/série)
 * or a play-verb (toca/coloca/bota) — a bare mention of "YouTube" or
 * "Netflix" alone in ambient conversation won't trigger this.
 */
const MUSIC_VERBS = [
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
  "ouvir",
];
const CONTENT_NOUNS = ["video", "vídeo", "filme", "serie", "série", "musica", "música"];

export type ContentIntentMatch = { kind: "url"; label: string; url: string } | { kind: "pending"; query: string };

export function matchContentIntent(rawText: string): ContentIntentMatch | null {
  const text = stripAccents(rawText.toLowerCase()).trim();
  const words = text.split(/\s+/).map(trimPunct).filter(Boolean);
  if (words.length === 0 || words.length > 14) return null;

  const musicVerb = MUSIC_VERBS.find((v) => words.includes(stripAccents(v)));
  if (musicVerb) {
    const platformNames = new Set(Object.keys(STREAMING_TARGETS));
    const target = words
      .filter((w) => w !== musicVerb && !FILLER_WORDS.has(w) && !platformNames.has(w))
      .join(" ")
      .trim();
    if (target) return { kind: "url", label: `${target} (spotify)`, url: STREAMING_TARGETS.spotify(target) };
  }

  const noun = CONTENT_NOUNS.map(stripAccents).find((n) => words.includes(n));
  if (!noun) return null;

  const platform = (Object.keys(STREAMING_TARGETS) as StreamingPlatform[]).find((p) => text.includes(p));
  if (platform) {
    const targeted = text.match(new RegExp(`${noun}\\s+(.+?)\\s+(?:na|no)\\s+${platform}`));
    const query = targeted?.[1]?.replace(/^(o|a|um|uma|do|da|de)\s+/, "").trim();
    if (query) return { kind: "url", label: `${query} (${platform})`, url: STREAMING_TARGETS[platform](query) };
  }

  const targeted = text.match(new RegExp(`${noun}\\s+(?:d[eo]\\s+)?(.+)$`));
  const query = targeted?.[1]?.trim();
  return query ? { kind: "pending", query } : null;
}

export function launchApp(appName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("open", ["-a", appName], (error) => {
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

/**
 * `spotify:search:<query>` opens the app to a search results LIST — Gustavo
 * asked for it to start PLAYING directly instead. That needs a real track
 * id, which needs the Spotify Web API, which needs app credentials (Client
 * Credentials grant — app-only auth, no user login, free, created once at
 * developer.spotify.com/dashboard). Without SPOTIFY_CLIENT_ID/SECRET set,
 * this quietly falls back to the search URL — same behavior as before.
 */
let spotifyTokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return null;
  if (spotifyTokenCache && spotifyTokenCache.expiresAt > Date.now()) return spotifyTokenCache.token;
  try {
    const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };
    spotifyTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return spotifyTokenCache.token;
  } catch (err) {
    logger.warn({ err }, "localActions: spotify auth failed, falling back to search");
    return null;
  }
}

async function searchSpotifyTrackId(query: string): Promise<string | null> {
  const token = await getSpotifyAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tracks?: { items?: { id: string }[] } };
    return data.tracks?.items?.[0]?.id ?? null;
  } catch (err) {
    logger.warn({ err, query }, "localActions: spotify track search failed, falling back to search");
    return null;
  }
}

async function resolveSpotifyUri(url: string): Promise<string> {
  const match = url.match(/^spotify:search:(.+)$/);
  if (!match) return url;
  const trackId = await searchSpotifyTrackId(decodeURIComponent(match[1]));
  return trackId ? `spotify:track:${trackId}` : url;
}

export async function launchUrl(url: string): Promise<void> {
  const resolvedUrl = await resolveSpotifyUri(url);
  return new Promise((resolve, reject) => {
    execFile("open", [resolvedUrl], (error) => {
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
