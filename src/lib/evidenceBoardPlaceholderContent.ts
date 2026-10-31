import type { EvidenceCardKind } from "../state/slices/evidenceBoardSlice";

/**
 * Placeholder cards for the EvidenceBoard mechanism (see evidenceBoardSlice.ts /
 * EvidenceBoard.tsx). Deliberately NOT a real investigation: no web-search/Radar backend is
 * wired up yet, so the verdict card below is explicitly "INDETERMINADO", never a real
 * "aconteceu"/"falso" — inventing a convincing-looking true/false verdict on a real-sounding
 * claim would be a real misinformation risk, not just an unfinished feature. See the warning
 * in investigationIntent.ts.
 */
export function buildPlaceholderEvidenceCards(): Array<{ kind: EvidenceCardKind; label: string; body: string }> {
  return [
    {
      kind: "text",
      label: "Exemplo",
      body: "Este é um quadro de investigação de EXEMPLO — ainda não existe apuração real conectada a este recurso.",
    },
    {
      kind: "photo",
      label: "Evidência (exemplo)",
      body: "Em breve: evidências reais viriam de busca na web (Radar) e fontes verificáveis, não deste placeholder.",
    },
    {
      kind: "verdict",
      label: "INDETERMINADO",
      body: "Nenhuma apuração real foi feita ainda — este card nunca deve mostrar 'aconteceu' ou 'falso' sem um mecanismo real por trás.",
    },
  ];
}
