import {
  matchLocalCommand,
  matchContentIntent,
  launchApp,
  launchUrl,
  stripAccents,
  STREAMING_TARGETS,
  type LocalCommandMatch,
  type StreamingPlatform,
} from "./appLauncher";
import { matchProjectContextRequest } from "./projectFiles";

/**
 * Full intent taxonomy Gustavo asked for. Only some of these are resolved
 * HERE, locally, before the message ever reaches Aurora — because n8n
 * (Aurora's brain) runs on a remote server with no network path back to this
 * Mac. Everything else is already resolved for free by the LangChain Agent's
 * own tool-calling in n8n (workflow YHjULZeySJTpCXHO) — no local code needed,
 * and no local code should try to duplicate that routing.
 */
export type IntentType =
  // --- Local (resolved in this file, before the AI call) ---
  | "OPEN_APP"
  | "OPEN_WEBSITE"
  | "OPEN_STREAMING" // Netflix/YouTube search-link — no real playback API exists
  | "GET_FILE"
  | "SEARCH_FILE"
  | "OPEN_MUSIC_SEARCH" // Spotify web search opened locally — NOT real playback (that's PLAY_MUSIC below)
  // --- Remote (resolved by Aurora's tool-calling in n8n — listed here only
  // so the full taxonomy lives in one place; nothing local acts on these) ---
  | "PLAY_MUSIC"
  | "SEARCH_MUSIC"
  | "GET_CALENDAR"
  | "CREATE_EVENT"
  | "UPDATE_EVENT"
  | "DELETE_EVENT"
  | "CREATE_REMINDER"
  | "CREATE_TASK"
  | "ANALYZE_PROJECT"
  | "GENERAL_QUERY";

export interface LocalCommandOutcome {
  content: string;
  error?: "local_command_failed";
}

export type LocalIntentResult =
  | { type: "short_circuit"; intentType: IntentType; execute: () => Promise<LocalCommandOutcome> }
  | { type: "context_injection"; intentType: IntentType; contextBlock: string }
  | null;

/**
 * "Vídeo do Homem de Ferro" mentioned with no platform named registers here
 * instead of executing — a short follow-up ("abre para mim", "toca essa")
 * within PENDING_TTL_MS resolves against it. Per-process, in-memory: doesn't
 * need to survive a restart, only needs to bridge two consecutive turns of
 * the same conversation.
 */
interface PendingContentIntent {
  query: string;
  createdAt: number;
}
const pendingByConversation = new Map<string, PendingContentIntent>();
const PENDING_TTL_MS = 3 * 60 * 1000;

function prunePending(): void {
  const now = Date.now();
  for (const [id, entry] of pendingByConversation) {
    if (now - entry.createdAt >= PENDING_TTL_MS) pendingByConversation.delete(id);
  }
}

/**
 * Only fires when the ENTIRE message (after stripping punctuation) is one of
 * a small fixed set of short continuation phrases — never by finding the
 * phrase inside a longer sentence. Same reasoning as everywhere else in this
 * module: the wake word is always listening, so a loose match risks acting
 * on unrelated ambient chatter.
 */
const FOLLOWUP_PHRASES = new Set([
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
  "essa",
]);

function matchFollowup(rawText: string): { platform?: StreamingPlatform } | null {
  const text = stripAccents(rawText.toLowerCase()).trim().replace(/[!?.]+$/, "");
  if (FOLLOWUP_PHRASES.has(text)) return {};
  const platformMatch = text.match(/^abre no (youtube|netflix|spotify)$/) || text.match(/^abre na (netflix)$/);
  if (platformMatch) return { platform: platformMatch[1] as StreamingPlatform };
  return null;
}

async function executeUrl(url: string, label: string): Promise<LocalCommandOutcome> {
  try {
    await launchUrl(url);
    return { content: `Abrindo ${label}, Senhor Gustavo.` };
  } catch {
    return { content: "Não consegui abrir isso agora.", error: "local_command_failed" };
  }
}

/**
 * Runs the existing matchers (unchanged, already tested) in order and
 * normalizes the result. `conversationId` threads through so bare
 * continuation commands ("abre para mim") can resolve against the pending
 * content intent from the previous turn of the SAME conversation.
 */
export function resolveLocalIntent(rawText: string, conversationId: string): LocalIntentResult {
  prunePending();

  // Checked BEFORE matchLocalCommand, but only when a pending entry actually
  // exists: a bare "abre no spotify" would otherwise be swallowed by the
  // plain app-launcher (spotify is also a known app alias) and lose the
  // query we're holding onto. With no pending entry, ordering is unchanged
  // from before — matchLocalCommand still goes first.
  const pendingEntry = pendingByConversation.get(conversationId);
  if (pendingEntry) {
    const followup = matchFollowup(rawText);
    if (followup) {
      pendingByConversation.delete(conversationId);
      const platform: StreamingPlatform = followup.platform ?? "youtube";
      const url = STREAMING_TARGETS[platform](pendingEntry.query);
      return {
        type: "short_circuit",
        intentType: platform === "spotify" ? "OPEN_MUSIC_SEARCH" : "OPEN_STREAMING",
        execute: () => executeUrl(url, `${pendingEntry.query} (${platform})`),
      };
    }
  }

  const localCommand = matchLocalCommand(rawText);
  if (localCommand) {
    return {
      type: "short_circuit",
      intentType: intentTypeForCommand(localCommand),
      execute: () => executeLocalCommand(localCommand),
    };
  }

  const contentIntent = matchContentIntent(rawText);
  if (contentIntent) {
    if (contentIntent.kind === "url") {
      const isMusic = contentIntent.url.startsWith("spotify:");
      return {
        type: "short_circuit",
        intentType: isMusic ? "OPEN_MUSIC_SEARCH" : "OPEN_STREAMING",
        execute: () => executeUrl(contentIntent.url, contentIntent.label),
      };
    }
    // Platform not named yet — remember it, but don't touch the message: it
    // still flows through to Aurora untouched so she can discuss it normally.
    pendingByConversation.set(conversationId, { query: contentIntent.query, createdAt: Date.now() });
    return null;
  }

  const projectContext = matchProjectContextRequest(rawText);
  if (projectContext) {
    return {
      type: "context_injection",
      intentType: "GET_FILE",
      contextBlock: projectContext.contextBlock,
    };
  }

  return null;
}

function intentTypeForCommand(command: LocalCommandMatch): IntentType {
  if (command.kind === "app") return "OPEN_APP";
  return command.url.includes("netflix.com/search") || command.url.includes("youtube.com/results") ? "OPEN_STREAMING" : "OPEN_WEBSITE";
}

async function executeLocalCommand(command: LocalCommandMatch): Promise<LocalCommandOutcome> {
  try {
    if (command.kind === "app") {
      await launchApp(command.appName);
      return { content: `Abrindo ${command.appName}, Senhor Gustavo.` };
    }
    await launchUrl(command.url);
    return { content: `Abrindo ${command.label}, Senhor Gustavo.` };
  } catch {
    return { content: "Não consegui abrir isso agora.", error: "local_command_failed" };
  }
}
