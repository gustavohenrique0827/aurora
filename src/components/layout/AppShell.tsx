import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { AuroraRail } from "../aurora/AuroraRail";
import { AuroraBackdrop } from "../aurora/AuroraBackdrop";
import { usePersistedToggle } from "../../hooks/usePersistedToggle";
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
  // /aurora is the immersive view: it draws its own chrome (brand, rail, chat) instead of the app bar + side nav.
  const immersive = useLocation().pathname.startsWith("/aurora");
  const [railOpen, toggleRail] = usePersistedToggle("aurora.rail.open", false);
  const mobileNavOpen = useJarvisStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useJarvisStore((s) => s.setMobileNavOpen);
  const debugMode = useJarvisStore((s) => s.debugMode);
  const cameraActive = useJarvisStore((s) => s.cameraActive);

  return (
    <VoiceAgentContext.Provider value={voice}>
    <div className="relative flex h-dvh flex-col bg-[#050403]">
      {/* Every page shares the Aurora look: ember backdrop, floating rail, glass content frame. */}
      <AuroraBackdrop calm />
      {!immersive && <TopBar />}
      <div className="relative z-10 flex min-h-0 flex-1">
        {!immersive && (
          <>
            {mobileNavOpen && (
              <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
            )}
            <AuroraRail
              open={railOpen || mobileNavOpen}
              onToggle={toggleRail}
              onNavigate={() => setMobileNavOpen(false)}
              className={`${
                mobileNavOpen ? "fixed bottom-5 left-5 top-5 z-40 flex" : "relative mb-5 ml-5 hidden md:flex"
              }`}
            />
          </>
        )}
        <main
          className={
            immersive
              ? "min-w-0 flex-1 overflow-hidden"
              : "mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] min-w-0 flex-1 md:mb-5 overflow-hidden rounded-3xl border border-white/10 bg-black/35 backdrop-blur-sm md:mx-5"
          }
        >
          {children}
        </main>
      </div>
      {debugMode && cameraActive && <GestureDebugPanel />}
      <GestureCursor />
      <RadialMenu />
    </div>
    </VoiceAgentContext.Provider>
  );
}
