import { useEffect, useState } from "react";
import { EnergySphere } from "../components/sphere/EnergySphere";
import { TranscriptOverlay } from "../components/voice/TranscriptOverlay";
import { SpatialWindowManager } from "../components/vision/SpatialWindowManager";
import { HolographicCursor } from "../components/vision/HolographicCursor";
import { MultimodalHighlight } from "../components/vision/MultimodalHighlight";
import { PresentationDeck } from "../components/vision/PresentationDeck";
import { DemoExperience } from "../components/vision/DemoExperience";
import { useJarvisStore } from "../state/store";
import { projectorSync } from "../lib/projection/projectorSync";
import type { ProjectorSyncMessage, SpatialWindow, SurfaceProfile, VisionExperienceMode } from "@jarvis/shared";

export function ProjectorPage() {
  const experienceMode = useJarvisStore((s) => s.experienceMode);
  const setExperienceMode = useJarvisStore((s) => s.setExperienceMode);
  const setPresentationSlide = useJarvisStore((s) => s.setPresentationSlide);
  const setProjectorPointerPosition = useJarvisStore((s) => s.setProjectorPointerPosition);
  const setMultimodalTarget = useJarvisStore((s) => s.setMultimodalTarget);
  const activeProfile = useJarvisStore((s) => s.surfaceProfiles[s.activeProfileId]);
  const updateActiveProfile = useJarvisStore((s) => s.updateActiveProfile);

  // Sync state from BroadcastChannel
  useEffect(() => {
    const unsub = projectorSync.subscribe((msg: ProjectorSyncMessage) => {
      switch (msg.type) {
        case "CURSOR_MOVE":
          setProjectorPointerPosition(msg.pos);
          break;
        case "EXPERIENCE_MODE":
          setExperienceMode(msg.mode);
          break;
        case "PRESENTATION_SLIDE":
          setPresentationSlide(msg.slideIndex);
          break;
        case "MULTIMODAL_TARGET":
          setMultimodalTarget(msg.target);
          break;
        case "SURFACE_SETTINGS":
          updateActiveProfile(() => msg.profile);
          break;
      }
    });

    return () => unsub();
  }, [setExperienceMode, setMultimodalTarget, setPresentationSlide, setProjectorPointerPosition, updateActiveProfile]);

  const filterStyle = {
    filter: `brightness(${activeProfile?.brightness ?? 100}%) contrast(${activeProfile?.contrast ?? 100}%)`,
    transform: `rotate(${activeProfile?.rotation ?? 0}deg) scale(${activeProfile?.scale ?? 1}) translate(${activeProfile?.offsetX ?? 0}px, ${activeProfile?.offsetY ?? 0}px)`,
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-black text-white select-none cursor-none"
      style={filterStyle}
    >
      {/* Central 3D Aurora Energy Sphere */}
      <div className="absolute inset-0 z-0">
        <EnergySphere />
      </div>

      {/* Holographic Spatial Windows in Projection Canvas */}
      <SpatialWindowManager projectorView />

      {/* Multimodal Highlight Beacon */}
      <MultimodalHighlight />

      {/* Projector-Mapped Holographic Cursor */}
      <HolographicCursor projectorMode />

      {/* Voice Transcript Overlay */}
      <TranscriptOverlay />

      {/* Presentation Deck in Projection */}
      {experienceMode === "presentation" && <PresentationDeck />}

      {/* Demo Tour in Projection */}
      {experienceMode === "demo" && <DemoExperience />}
    </div>
  );
}

