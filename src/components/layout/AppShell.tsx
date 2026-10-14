import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { HudOverlay } from "./HudOverlay";
import { useGlobalVoiceAgent } from "../../hooks/useGlobalVoiceAgent";
import { VoiceAgentContext } from "../../hooks/voiceAgentContext";
import { useGlobalVisionAgent } from "../../hooks/useGlobalVisionAgent";
import { usePointerMode } from "../../hooks/usePointerMode";
import { useGestureCombos } from "../../hooks/useGestureCombos";
import { useCustomGestureActions } from "../../hooks/useCustomGestureActions";
import { useBuiltInGestureActions } from "../../hooks/useBuiltInGestureActions";
import { useSpatialWindows } from "../../hooks/useSpatialWindows";
import { GestureDebugPanel } from "../vision/GestureDebugPanel";
import { GestureCursor } from "../vision/GestureCursor";
import { RadialMenu } from "../vision/RadialMenu";
import { useJarvisStore } from "../../state/store";

export function AppShell({ children }: { children: ReactNode }) {
  // Mounted once here, at the top of the whole authenticated app — survives comms
  // dock collapse and director-scope switches, which ChatPanel itself does not.
  const voice = useGlobalVoiceAgent();
  // Mounted for its side effect (owns the camera/hand-tracking lifecycle, reacting to
  // cameraRequested/privacyMode in the store) — nothing downstream needs its return value,
  // every other component talks to it indirectly through the store instead of props.
  useGlobalVisionAgent();
  // Same shape — owns the pointer-mode loop (cursor position + DOM event dispatch),
  // reacting to pointerModeEnabled in the store. Also side-effect only.
  usePointerMode();
  // Clap = open the Gesture Debug panel (Seção 34).
  useGestureCombos();
  // Executes a custom gesture's bound shortcut the moment it's recognized (Seção 55).
  useCustomGestureActions(voice.interrupt);
  // Same, but for the fixed built-in pose→action bindings that work with no recording
  // needed (CLOSED_FIST/PEACE/ROCK/CALL/FOUR_FINGERS) — see builtInGestureActions.ts.
  useBuiltInGestureActions(voice.interrupt);
  // Direct pinch-drag repositioning for any [data-gesture-window] element (Seção 52/53).
  useSpatialWindows();
  const debugMode = useJarvisStore((s) => s.debugMode);
  const cameraActive = useJarvisStore((s) => s.cameraActive);

  return (
    <VoiceAgentContext.Provider value={voice}>
    <div className="relative flex h-screen flex-col">
      <HudOverlay />
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
      {debugMode && cameraActive && <GestureDebugPanel />}
      <GestureCursor />
      <RadialMenu />
    </div>
    </VoiceAgentContext.Provider>
  );
}
