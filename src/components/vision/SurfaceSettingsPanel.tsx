import { useState } from "react";
import { Sliders, Sun, Moon, RotateCw, Layers, Sparkles, Check } from "lucide-react";
import { GlassPanel } from "../common/GlassPanel";
import { useJarvisStore } from "../../state/store";
import type { SurfaceMode } from "@jarvis/shared";

interface SurfaceSettingsPanelProps {
  onOpenCalibration?: () => void;
}

export function SurfaceSettingsPanel({ onOpenCalibration }: SurfaceSettingsPanelProps) {
  const surfaceProfiles = useJarvisStore((s) => s.surfaceProfiles);
  const activeProfileId = useJarvisStore((s) => s.activeProfileId);
  const activeProfile = surfaceProfiles[activeProfileId];
  const setActiveProfile = useJarvisStore((s) => s.setActiveProfile);
  const updateActiveProfile = useJarvisStore((s) => s.updateActiveProfile);

  if (!activeProfile) return null;

  const modesList: Array<{ mode: SurfaceMode; id: string; label: string; desc: string }> = [
    { mode: "wall", id: "profile-wall", label: "Modo Parede", desc: "Projeção vertical em parede opaca" },
    { mode: "glass", id: "profile-glass", label: "Modo Vidro / HUD", desc: "Projeção transparente e alto contraste" },
    { mode: "tabletop", id: "profile-tabletop", label: "Modo Mesa", desc: "Superfície horizontal interativa" },
    { mode: "screen", id: "profile-screen", label: "Modo Tela / Monitor", desc: "Monitor externo ou Smart TV" },
    { mode: "custom", id: "profile-custom", label: "Personalizado", desc: "Calibração sob medida" },
  ];

  return (
    <GlassPanel title="Configurações da Superfície de Projeção">
      <div className="space-y-4 text-xs">
        {/* Surface Presets */}
        <div>
          <label className="mb-2 block font-semibold text-white/80">Perfil da Superfície</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {modesList.map((m) => {
              const isSelected = activeProfileId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveProfile(m.id)}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-jarvis-accentBright bg-jarvis-accent/15 text-white shadow-[0_0_15px_rgba(255,122,26,0.1)]"
                      : "border-jarvis-border/60 bg-black/20 text-white/60 hover:border-jarvis-border hover:text-white/80"
                  }`}
                >
                  <div className="flex w-full items-center justify-between font-semibold">
                    <span>{m.label}</span>
                    {isSelected && <Check size={12} className="text-jarvis-accentBright" />}
                  </div>
                  <span className="mt-1 text-[10px] text-white/40 leading-tight">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dark Room Mode */}
        <div className="flex items-center justify-between rounded-xl border border-jarvis-border/60 bg-black/25 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-jarvis-accent/10 text-jarvis-accentBright">
              <Moon size={15} />
            </div>
            <div>
              <div className="font-semibold text-white">Modo Dark Room</div>
              <div className="text-[10px] text-white/45">Fundo preto absoluto (True Void) para evitar vazamento de luz</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateActiveProfile((p) => ({ ...p, darkRoomMode: !p.darkRoomMode }))}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              activeProfile.darkRoomMode
                ? "border-jarvis-accentBright bg-jarvis-accentBright/20 text-jarvis-accentBright"
                : "border-jarvis-border text-white/50 hover:text-white"
            }`}
          >
            {activeProfile.darkRoomMode ? "Ligado" : "Desligado"}
          </button>
        </div>

        {/* Brightness & Contrast Sliders */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex justify-between">
              <span className="text-white/70">Brilho Holográfico</span>
              <span className="font-mono text-jarvis-accentBright">{activeProfile.brightness}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={150}
              value={activeProfile.brightness}
              onChange={(e) =>
                updateActiveProfile((p) => ({ ...p, brightness: Number(e.target.value) }))
              }
              className="w-full accent-jarvis-accent"
            />
          </div>

          <div>
            <div className="mb-1.5 flex justify-between">
              <span className="text-white/70">Contraste</span>
              <span className="font-mono text-jarvis-accentBright">{activeProfile.contrast}%</span>
            </div>
            <input
              type="range"
              min={70}
              max={200}
              value={activeProfile.contrast}
              onChange={(e) =>
                updateActiveProfile((p) => ({ ...p, contrast: Number(e.target.value) }))
              }
              className="w-full accent-jarvis-accent"
            />
          </div>
        </div>

        {/* Rotation and Keystone */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-jarvis-border/50 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-white/60">Orientação:</span>
            {([0, 90, 180, 270] as const).map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => updateActiveProfile((p) => ({ ...p, rotation: deg }))}
                className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] ${
                  activeProfile.rotation === deg
                    ? "border-jarvis-accent bg-jarvis-accent/15 text-jarvis-accentBright font-bold"
                    : "border-jarvis-border text-white/50 hover:text-white"
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>

          {onOpenCalibration && (
            <button
              type="button"
              onClick={onOpenCalibration}
              className="flex items-center gap-1 rounded-lg border border-jarvis-accent/40 bg-jarvis-accent/10 px-3 py-1 text-xs text-jarvis-accentBright hover:bg-jarvis-accent/20"
            >
              <Sliders size={12} /> Calibração 4 Pontos
            </button>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

