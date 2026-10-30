/**
 * Placeholder pages for the HoloBook mechanism (see documentSlice.ts / HoloBook.tsx).
 * Deliberately honest about being a placeholder — no real client material (Fora da Curva or
 * otherwise) exists for this yet, and the project rule is to never fake test data as if it
 * were real. Swap this out the moment a real file/PDF is wired in.
 */
export function buildPlaceholderDocumentTitle(subject: string | null): string {
  return subject ? `Material — ${subject} (exemplo)` : "Material de exemplo";
}

export const PLACEHOLDER_DOCUMENT_PAGES: string[] = [
  "Este é um material de EXEMPLO, não um arquivo real do cliente — ainda não existe nenhum arquivo conectado a este recurso.",
  "O que isto está testando é o jeito de interagir: segurar com a pinça, arrastar pra posicionar, deslizar pra virar a página, e fechar pela marca no canto.",
  "Quando você indicar o PDF ou documento real (do Fora da Curva ou de qualquer outro cliente), este conteúdo de exemplo é trocado pelo real sem mudar o mecanismo.",
  "Fim do material de exemplo.",
];
