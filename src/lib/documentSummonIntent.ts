/**
 * Recognizes "bring me the material/document/book [of X]" phrases so Aurora can summon the
 * holographic document (HoloBook, see documentSlice.ts) instead of only answering in text.
 * Sibling to cameraVisionIntent.ts / screenVisionIntent.ts, same reasoning: this is a
 * client-side shortcut so the frontend can react immediately, without a round trip through
 * the n8n agent's own tool-calling to control this UI.
 *
 * Deliberately loose: verb and object are matched independently, with up to ~20 characters of
 * anything (article, "pra mim", "aí", "esse") allowed between them, instead of requiring an
 * exact phrase like "mostra o material" — real speech rarely comes out that rigid, and a
 * stricter pattern just means Aurora silently never reacts.
 *
 * Also recognizes "fecha o material/livro" to close it without needing a gesture.
 */
const OBJECT = "(material|documento|livro|arquivo|apostila|pdf)";
const SUMMON_VERB = "(mostr\\w*|traz\\w*|trag\\w*|abr\\w*|busc\\w*|peg\\w*|exib\\w*|quero ver|quer ver|deixa(?: eu)? ver|p[õo]e\\w*)";
const CLOSE_VERB = "(fech\\w*|guard\\w*|tir\\w*|some com)";
const GAP = "[^.?!]{0,24}"; // anything short, not crossing a sentence boundary

const SUMMON_PATTERN = new RegExp(`\\b${SUMMON_VERB}\\b${GAP}\\b${OBJECT}\\b`, "i");
const CLOSE_PATTERN = new RegExp(`\\b${CLOSE_VERB}\\b${GAP}\\b${OBJECT}\\b`, "i");

/** Pulls a trailing "do X" / "da X" / "sobre X" subject out of the phrase, if present, for the
 * title — e.g. "me mostra o material do Fora da Curva" → "Fora da Curva". Purely cosmetic: the
 * placeholder pages are the same regardless (see useGlobalVoiceAgent.ts). */
function extractSubject(text: string): string | null {
  const match = text.match(new RegExp(`\\b${OBJECT}\\b\\s+(?:do|da|de|dos|das|sobre)\\s+(.+)$`, "i"));
  if (!match) return null;
  return match[2].trim().replace(/[.?!]+$/, "");
}

export function matchDocumentSummonIntent(text: string): { subject: string | null } | null {
  const normalized = text.trim();
  if (!normalized) return null;
  if (!SUMMON_PATTERN.test(normalized)) return null;
  return { subject: extractSubject(normalized) };
}

export function matchDocumentCloseIntent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return CLOSE_PATTERN.test(normalized);
}
