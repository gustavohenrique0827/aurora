/**
 * The fixed catalog of real actions a custom gesture (Lote 5) can be bound to (Seção 55 —
 * "atalhos configuráveis"). Kept as a closed set of app actions that already exist and do
 * something real, rather than free text, so recording a gesture in Configurações actually
 * wires up to a working shortcut instead of just a label.
 */
export const CUSTOM_GESTURE_ACTIONS = [
  { id: "none", label: "Nenhuma (só um rótulo)" },
  { id: "toggle-chat", label: "Abrir/fechar chat" },
  { id: "toggle-debug", label: "Ativar/desativar Debug Mode" },
  { id: "toggle-privacy", label: "Ativar Privacy Mode" },
  { id: "interrupt-speech", label: "Interromper a fala da Aurora" },
  { id: "toggle-cinematic", label: "Ativar/desativar Modo Cinematic" },
  { id: "toggle-pointer-mode", label: "Ativar/desativar Modo Ponteiro" },
  { id: "swap-dominant-hand", label: "Trocar a mão dominante" },
] as const;

export type CustomGestureActionId = (typeof CUSTOM_GESTURE_ACTIONS)[number]["id"];

export function customGestureActionLabel(id: string): string {
  return CUSTOM_GESTURE_ACTIONS.find((a) => a.id === id)?.label ?? id;
}
