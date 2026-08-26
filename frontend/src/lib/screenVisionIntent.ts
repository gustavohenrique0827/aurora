/**
 * Recognizes "look at my screen" phrases — voice or typed — so Aurora can offer to see
 * what Gustavo is doing. Deliberately NOT wired into backend/localIntents.ts (which only
 * handles intents the remote n8n brain can't act on): getDisplayMedia only exists in the
 * browser, and the browser only grants it inside a real click, so recognizing the phrase
 * here just opens an inline "click to share" offer (see useGlobalVoiceAgent.ts /
 * ScreenShareOffer.tsx) instead of capturing anything directly.
 *
 * Matched as a substring within a larger sentence (not an exact whole-message match like
 * the short continuation commands in localIntents.ts) — these phrases are distinctive
 * enough ("olha minha tela", "vê o que eu tô fazendo") that they don't need the stricter
 * guard a bare word like "essa" needs against the always-on wake word.
 */
const TRIGGER_PATTERNS: RegExp[] = [
  /\bolha(r)? (aqui|isso|minha tela|essa tela|o que eu (t[oô]|estou) fazendo)\b/i,
  /\bv[eê](r)? (aqui|isso|minha tela|essa tela|o que eu (t[oô]|estou) fazendo)\b/i,
  /\bd[aá] uma olhada(inha)?( aqui| nisso| na minha tela)?\b/i,
  /\bpresta aten[cç][aã]o n[oa] que eu (t[oô]|estou) fazendo\b/i,
  /\bcompartilh(ar|a) (a )?(minha )?tela\b/i,
];

export function matchScreenVisionIntent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return TRIGGER_PATTERNS.some((pattern) => pattern.test(normalized));
}
