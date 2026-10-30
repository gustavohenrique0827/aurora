/**
 * Recognizes "bring me the material/document/book [of X]" phrases so Aurora can summon the
 * holographic document (HoloBook, see documentSlice.ts) instead of only answering in text.
 * Sibling to cameraVisionIntent.ts / screenVisionIntent.ts, same reasoning: this is a
 * client-side shortcut so the frontend can react immediately, without a round trip through
 * the n8n agent's own tool-calling to control this UI.
 *
 * Also recognizes "fecha o material/livro" to close it without needing a gesture.
 */
const SUMMON_PATTERNS: RegExp[] = [
  /\b(me )?mostr(a|e)( pra mim)? o (material|documento|livro)\b/i,
  /\btraz(e|ga)?( pra mim)? o (material|documento|livro)\b/i,
  /\babr(e|a)( pra mim)? o (material|documento|livro)\b/i,
];

const CLOSE_PATTERNS: RegExp[] = [/\bfech(a|e) o (material|documento|livro)\b/i];

/** Pulls a trailing "do X" / "de X" subject out of the phrase, if present, for the title —
 * e.g. "me mostra o material do Fora da Curva" → "Fora da Curva". Purely cosmetic: the
 * placeholder pages are the same regardless (see useGlobalVoiceAgent.ts). */
function extractSubject(text: string): string | null {
  const match = text.match(/\b(?:material|documento|livro)\s+(?:do|da|de)\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim().replace(/[.?!]+$/, "");
}

export function matchDocumentSummonIntent(text: string): { subject: string | null } | null {
  const normalized = text.trim();
  if (!normalized) return null;
  if (!SUMMON_PATTERNS.some((pattern) => pattern.test(normalized))) return null;
  return { subject: extractSubject(normalized) };
}

export function matchDocumentCloseIntent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return CLOSE_PATTERNS.some((pattern) => pattern.test(normalized));
}
