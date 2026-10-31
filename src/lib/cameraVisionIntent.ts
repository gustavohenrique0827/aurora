/**
 * Recognizes "use the camera / take a photo" phrases — voice or typed — so Aurora can
 * offer to see something physical in front of Gustavo. Sibling to screenVisionIntent.ts,
 * same reasoning: getUserMedia only exists in the browser and only grants inside a real
 * click, so recognizing the phrase here just opens an inline "click to allow" offer (see
 * useGlobalVoiceAgent.ts / CameraShareOffer.tsx) instead of capturing anything directly.
 *
 * Phrases are deliberately distinct from screenVisionIntent.ts's ("olha isso"/"vê minha
 * tela" mean screen) — these are about something physical held up to the camera, not the
 * screen, so they don't compete for the same trigger words.
 */
const TRIGGER_PATTERNS: RegExp[] = [
  /\btira(r)? uma foto\b/i,
  /\bfotograf(ar|a)( isso)?\b/i,
  /\busa(r)? a c[aâ]mera\b/i,
  /\bliga(r)? a c[aâ]mera\b/i,
  /\bme (v[eê](r)?|olha) pela c[aâ]mera\b/i,
  /\bmostra(r)? (isso |algo )?pra (voc[eê]|ti)( pela c[aâ]mera)?\b/i,
  // "There's another person here, look at/greet them" — same camera-capture offer, just
  // phrased as addressing a person instead of asking to use the camera literally. Requires
  // "pessoa"/"ela"/"ele" as the object, not just the bare verb, since "se apresenta" and
  // "fala com" alone are common in unrelated business phrasing (CRM, meetings) in this app.
  /\bfala(r)? com (essa |esta |aquela )?pessoa\b/i,
  /\bconversa(r)? com (essa |esta |aquela )?(pessoa|ela|ele)\b/i,
  /\bse apresent(a|e|ar)\s+(pra|pro|para|a)\s+(ela|ele|essa pessoa|esta pessoa)\b/i,
  /\bcumpriment(a|e|ar)( essa| esta)? pessoa\b/i,
  /\bolha quem[^.?!]{0,12}(aqui|atr[aá]s)\b/i,
  /\bv[eê]( essa| esta)? pessoa\b/i,
];

export function matchCameraVisionIntent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return TRIGGER_PATTERNS.some((pattern) => pattern.test(normalized));
}
