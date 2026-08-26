import type { DataState, WahaSnapshot } from "@jarvis/shared";
import { GlassPanel } from "../../common/GlassPanel";
import { DataStateBadge } from "../DataStateBadge";
import { NotConnectedPanel } from "./NotConnectedPanel";

const STATUS_LABEL: Record<WahaSnapshot["status"], string> = {
  WORKING: "Conectado",
  STARTING: "Iniciando",
  SCAN_QR_CODE: "Aguardando QR Code",
  FAILED: "Falhou",
  STOPPED: "Parado",
  unknown: "Desconhecido",
};

export function WahaStatusPanel({ state }: { state: DataState<WahaSnapshot> }) {
  return (
    <GlassPanel title="WhatsApp (WAHA)" action={<DataStateBadge status={state.status} lastUpdated={state.lastUpdated} />}>
      {!state.data ? (
        <NotConnectedPanel reason={state.error ?? "Credencial do WAHA não configurada"} />
      ) : (
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              state.data.status === "WORKING" ? "bg-jarvis-green animate-pulseGlow" : "bg-jarvis-amber"
            }`}
          />
          <div>
            <div className="text-sm font-medium">{STATUS_LABEL[state.data.status]}</div>
            <div className="text-[10px] text-white/40">sessão “{state.data.session}”</div>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
