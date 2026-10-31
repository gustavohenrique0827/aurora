/**
 * Recognizes "investigate X" / "check if X is true" phrases so Aurora can summon the evidence
 * board (EvidenceBoard, see evidenceBoardSlice.ts) — multiple small draggable cards instead of
 * one HoloBook. Sibling to documentSummonIntent.ts, same reasoning: a client-side shortcut, no
 * n8n round trip.
 *
 * IMPORTANT — there is no real fact-checking backend behind this yet (no Radar/web-search
 * wiring, no verdict logic). The cards this produces are an honestly-labeled placeholder for
 * the drag/organize mechanism only, same rule as documentPlaceholderContent.ts: never present
 * a fabricated verdict as if it were real. Do not change this to emit "aconteceu"/"falso" on
 * real-sounding claims without building the real evidence pipeline first — a convincing-looking
 * fake verdict is a real misinformation risk, not just an unfinished feature.
 */
const VERB = "(investig\\w*|apur\\w*|verific\\w*|checa\\w*|confirm\\w*)";
const SUBJECT = "(isso|isso [ée] verdade|se isso [ée] verdade)";
const GAP = "[^.?!]{0,24}";

const PATTERN = new RegExp(`\\b${VERB}\\b${GAP}\\b${SUBJECT}\\b|\\b${SUBJECT}\\b${GAP}\\b${VERB}\\b`, "i");
const CLOSE_PATTERN = /\b(fech|guard|tir)\w*\b[^.?!]{0,24}\b(investiga[çc][aã]o|apura[çc][aã]o|quadro)\b/i;

export function matchInvestigationIntent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return PATTERN.test(normalized);
}

export function matchInvestigationCloseIntent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return CLOSE_PATTERN.test(normalized);
}
