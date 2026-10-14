/**
 * Recognizes demonstrative pronouns ("isso", "aquilo", "esse", "essa") that plausibly
 * refer to something the user is physically pointing at — Seção 36/37's "isso/aquilo"
 * spatial targeting. Unlike screenVisionIntent.ts's phrases, these are single common
 * words that appear in all kinds of unrelated sentences, so this matcher is NEVER used
 * standalone — useGlobalVoiceAgent.ts only calls it when the dominant hand is ALSO
 * currently in a POINTING/FINGER_GUN pose. The gesture itself is the guard a bare word
 * like this needs (see screenVisionIntent.ts's note on the same risk).
 */
const PATTERNS: RegExp[] = [/\bisso\b/i, /\baquilo\b/i, /\bess[ea]\b/i];

export function matchDemonstrativeIntent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return PATTERNS.some((pattern) => pattern.test(normalized));
}
