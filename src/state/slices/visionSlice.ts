import type { StateCreator } from "zustand";
import type { HandFrame, HandSide } from "../../lib/handTracking/types";
import type { GestureState } from "../../lib/handTracking/gestureStateMachine";
import type { CustomGestureDef } from "../../lib/handTracking/customGestures";
import { loadCustomGestures, saveCustomGestures } from "../../lib/handTracking/customGestures";
import type { PointerCalibration } from "../../lib/handTracking/calibration";
import { DEFAULT_CALIBRATION, loadCalibration, saveCalibration } from "../../lib/handTracking/calibration";
import type {
  CalibrationQuad,
  SurfaceProfile,
  SurfaceMode,
  SpatialWindow,
  SpatialWindowType,
  VisionExperienceMode,
  AuroraDeviceState,
} from "@jarvis/shared";
import {
  loadProfiles,
  saveProfiles,
  loadActiveProfileId,
  saveActiveProfileId,
  DEFAULT_PROFILES,
} from "../../lib/projection/calibrationProfiles";
import {
  computeCameraToProjectionMatrix,
  type Homography3x3,
  IDENTITY_HOMOGRAPHY,
} from "../../lib/projection/homography";
import { projectorSync } from "../../lib/projection/projectorSync";

export type HandsState = Partial<Record<HandSide, HandFrame>>;

export interface GestureHistoryEntry {
  id: string;
  timestamp: number;
  side: HandSide;
  label: string;
}

const GESTURE_HISTORY_LIMIT = 40;

const DEFAULT_WINDOWS: SpatialWindow[] = [];

export interface VisionSlice {
  // Camera & Tracking core
  cameraRequested: boolean;
  cameraActive: boolean;
  cameraStarting: boolean;
  cameraError: string | null;
  privacyMode: boolean;
  debugMode: boolean;
  confidenceThreshold: number;
  pinchSensitivity: number;
  dominantHand: HandSide;
  hands: HandsState;
  gestureState: GestureState;
  handLostWarning: boolean;

  // Pointer & Cursor
  pointerModeEnabled: boolean;
  pointerPosition: { x: number; y: number } | null;
  projectorPointerPosition: { x: number; y: number } | null;
  pointerCalibration: PointerCalibration;
  calibrationStep: "idle" | "top-left" | "bottom-right";

  // Projection & Homography Calibration
  surfaceProfiles: Record<string, SurfaceProfile>;
  activeProfileId: string;
  homographyMatrix: Homography3x3;
  guidedCalibrationStep: number; // 0 = idle, 1..7 for the 7-step wizard
  guidedCalibrationStatus: string;

  // Spatial Windows
  spatialWindows: SpatialWindow[];
  activeWindowId: string | null;

  // Operational Experience Modes
  experienceMode: VisionExperienceMode;
  presentationSlide: number;
  totalPresentationSlides: number;
  demoActive: boolean;
  demoStep: number;

  // Multimodal Interaction Target
  multimodalTarget: {
    label: string;
    x: number;
    y: number;
    bounds?: { x: number; y: number; width: number; height: number };
  } | null;

  // Device Manager
  deviceState: AuroraDeviceState;

  // Custom Gestures & Shortcuts
  customGestures: CustomGestureDef[];
  radialMenuOpen: boolean;
  radialMenuCenter: { x: number; y: number } | null;
  radialMenuHand: HandSide | null;
  gestureHistory: GestureHistoryEntry[];
  trackingFps: number;
  detectionLatencyMs: number;
  cinematicMode: boolean;
  builtInGestureShortcutsEnabled: boolean;

  // Actions
  setCameraRequested: (requested: boolean) => void;
  setCameraActive: (active: boolean) => void;
  setCameraStarting: (starting: boolean) => void;
  setCameraError: (error: string | null) => void;
  setPrivacyMode: (on: boolean) => void;
  setDebugMode: (on: boolean) => void;
  setConfidenceThreshold: (value: number) => void;
  setPinchSensitivity: (value: number) => void;
  setDominantHand: (hand: HandSide) => void;
  setHands: (hands: HandsState) => void;
  setGestureState: (state: GestureState) => void;
  setHandLostWarning: (on: boolean) => void;
  setPointerModeEnabled: (on: boolean) => void;
  setPointerPosition: (pos: { x: number; y: number } | null) => void;
  setProjectorPointerPosition: (pos: { x: number; y: number } | null) => void;
  setPointerCalibration: (calibration: PointerCalibration) => void;
  setCalibrationStep: (step: "idle" | "top-left" | "bottom-right") => void;

  // Projection Profile & Calibration Actions
  setActiveProfile: (profileId: string) => void;
  updateActiveProfile: (updater: (prev: SurfaceProfile) => SurfaceProfile) => void;
  setSurfaceQuad: (quad: CalibrationQuad) => void;
  setGuidedCalibrationStep: (step: number, status?: string) => void;

  // Spatial Windows Actions
  addSpatialWindow: (type: SpatialWindowType, title?: string) => void;
  removeSpatialWindow: (id: string) => void;
  updateSpatialWindow: (id: string, patch: Partial<SpatialWindow>) => void;
  focusSpatialWindow: (id: string) => void;
  toggleMinimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;

  // Experience Mode Actions
  setExperienceMode: (mode: VisionExperienceMode) => void;
  setPresentationSlide: (index: number) => void;
  nextPresentationSlide: () => void;
  prevPresentationSlide: () => void;
  setDemoActive: (active: boolean) => void;
  setDemoStep: (step: number) => void;

  // Multimodal Targeting
  setMultimodalTarget: (
    target: { label: string; x: number; y: number; bounds?: { x: number; y: number; width: number; height: number } } | null
  ) => void;

  // Device Manager Actions
  setDeviceState: (patch: Partial<AuroraDeviceState>) => void;

  // Custom Gestures & Helpers
  addCustomGesture: (def: CustomGestureDef) => void;
  removeCustomGesture: (id: string) => void;
  setRadialMenuOpen: (open: boolean) => void;
  setRadialMenuCenter: (center: { x: number; y: number } | null) => void;
  setRadialMenuHand: (hand: HandSide | null) => void;
  pushGestureHistory: (entry: Omit<GestureHistoryEntry, "id">) => void;
  setTrackingStats: (fps: number, latencyMs: number) => void;
  setCinematicMode: (on: boolean) => void;
  setBuiltInGestureShortcutsEnabled: (on: boolean) => void;
}

const initialProfiles = typeof window === "undefined" ? { ...DEFAULT_PROFILES } : loadProfiles();
const initialActiveProfileId = typeof window === "undefined" ? "profile-wall" : loadActiveProfileId();
const activeProf = initialProfiles[initialActiveProfileId] || initialProfiles["profile-wall"] || DEFAULT_PROFILES.wall;
const initialHomography = computeCameraToProjectionMatrix(activeProf.quad);

export const createVisionSlice: StateCreator<VisionSlice> = (set, get) => ({
  cameraRequested: false,
  cameraActive: false,
  cameraStarting: false,
  cameraError: null,
  privacyMode: false,
  debugMode: false,
  confidenceThreshold: 0.7,
  pinchSensitivity: 0.5,
  dominantHand: "right",
  hands: {},
  gestureState: "IDLE",
  handLostWarning: false,

  pointerModeEnabled: true,
  pointerPosition: null,
  projectorPointerPosition: null,
  pointerCalibration: typeof window === "undefined" ? DEFAULT_CALIBRATION : loadCalibration(),
  calibrationStep: "idle",

  surfaceProfiles: initialProfiles,
  activeProfileId: initialActiveProfileId,
  homographyMatrix: initialHomography,
  guidedCalibrationStep: 0,
  guidedCalibrationStatus: "",

  spatialWindows: DEFAULT_WINDOWS,
  activeWindowId: null,

  experienceMode: "normal",
  presentationSlide: 0,
  totalPresentationSlides: 5,
  demoActive: false,
  demoStep: 0,

  multimodalTarget: null,

  deviceState: {
    cameras: [],
    selectedCameraId: null,
    microphones: [],
    selectedMicId: null,
    projectorConnected: false,
    projectorWindowOpen: false,
  },

  customGestures: typeof window === "undefined" ? [] : loadCustomGestures(),
  radialMenuOpen: false,
  radialMenuCenter: null,
  radialMenuHand: null,
  gestureHistory: [],
  trackingFps: 0,
  detectionLatencyMs: 0,
  cinematicMode: false,
  builtInGestureShortcutsEnabled: true,

  setCameraRequested: (requested) => set({ cameraRequested: requested }),
  setCameraActive: (active) => set({ cameraActive: active }),
  setCameraStarting: (starting) => set({ cameraStarting: starting }),
  setCameraError: (error) => set({ cameraError: error }),
  setPrivacyMode: (on) => set({ privacyMode: on }),
  setDebugMode: (on) => set({ debugMode: on }),
  setConfidenceThreshold: (value) => set({ confidenceThreshold: Math.max(0, Math.min(1, value)) }),
  setPinchSensitivity: (value) => set({ pinchSensitivity: Math.max(0, Math.min(1, value)) }),
  setDominantHand: (hand) => set({ dominantHand: hand }),
  setHands: (hands) => set({ hands }),
  setGestureState: (state) => set({ gestureState: state }),
  setHandLostWarning: (on) => set({ handLostWarning: on }),
  setPointerModeEnabled: (on) => set({ pointerModeEnabled: on }),
  setPointerPosition: (pos) => set({ pointerPosition: pos }),
  setProjectorPointerPosition: (pos) => set({ projectorPointerPosition: pos }),
  setPointerCalibration: (calibration) => {
    saveCalibration(calibration);
    set({ pointerCalibration: calibration });
  },
  setCalibrationStep: (step) => set({ calibrationStep: step }),

  setActiveProfile: (profileId) => {
    const state = get();
    const target = state.surfaceProfiles[profileId];
    if (!target) return;
    saveActiveProfileId(profileId);
    const homography = computeCameraToProjectionMatrix(target.quad);
    set({ activeProfileId: profileId, homographyMatrix: homography });
    projectorSync.send({ type: "SURFACE_SETTINGS", profile: target });
  },

  updateActiveProfile: (updater) => {
    const state = get();
    const current = state.surfaceProfiles[state.activeProfileId];
    if (!current) return;
    const next = updater(current);
    const updatedProfiles = { ...state.surfaceProfiles, [state.activeProfileId]: next };
    saveProfiles(updatedProfiles);
    const homography = computeCameraToProjectionMatrix(next.quad);
    set({ surfaceProfiles: updatedProfiles, homographyMatrix: homography });
    projectorSync.send({ type: "SURFACE_SETTINGS", profile: next });
  },

  setSurfaceQuad: (quad) => {
    const state = get();
    const current = state.surfaceProfiles[state.activeProfileId];
    if (!current) return;
    const next: SurfaceProfile = { ...current, quad, updatedAt: Date.now() };
    const updatedProfiles = { ...state.surfaceProfiles, [state.activeProfileId]: next };
    saveProfiles(updatedProfiles);
    const homography = computeCameraToProjectionMatrix(quad);
    set({ surfaceProfiles: updatedProfiles, homographyMatrix: homography });
    projectorSync.send({ type: "SURFACE_SETTINGS", profile: next });
  },

  setGuidedCalibrationStep: (step, status) =>
    set({
      guidedCalibrationStep: step,
      guidedCalibrationStatus: status ?? "",
    }),

  addSpatialWindow: (type, title) => {
    const state = get();
    const titles: Record<SpatialWindowType, string> = {
      crm: "CRM & Clientes (SPY)",
      vendas: "Vendas & Desempenho",
      financeiro: "Painel Financeiro & DRE",
      projetos: "Projetos & Tarefas",
      automacoes: "Workflows & Automações n8n",
      waha: "WhatsApp / WAHA",
      chat: "Aurora Conversacional",
      apresentacao: "Apresentação Executiva",
      demo: "Demonstração Interativa",
    };

    const maxZ = state.spatialWindows.reduce((acc, w) => Math.max(acc, w.zIndex), 10);
    const newWin: SpatialWindow = {
      id: `win-${type}-${Date.now().toString(36)}`,
      type,
      title: title || titles[type],
      x: 100 + (state.spatialWindows.length * 30) % 300,
      y: 100 + (state.spatialWindows.length * 30) % 200,
      width: 480,
      height: 360,
      zIndex: maxZ + 1,
      minimized: false,
      maximized: false,
    };

    const nextWindows = [...state.spatialWindows, newWin];
    set({ spatialWindows: nextWindows, activeWindowId: newWin.id });
    projectorSync.send({ type: "WINDOWS_UPDATE", windows: nextWindows });
  },

  removeSpatialWindow: (id) => {
    const state = get();
    const nextWindows = state.spatialWindows.filter((w) => w.id !== id);
    set({ spatialWindows: nextWindows });
    projectorSync.send({ type: "WINDOWS_UPDATE", windows: nextWindows });
  },

  updateSpatialWindow: (id, patch) => {
    const state = get();
    const nextWindows = state.spatialWindows.map((w) => (w.id === id ? { ...w, ...patch } : w));
    set({ spatialWindows: nextWindows });
    projectorSync.send({ type: "WINDOWS_UPDATE", windows: nextWindows });
  },

  focusSpatialWindow: (id) => {
    const state = get();
    const maxZ = state.spatialWindows.reduce((acc, w) => Math.max(acc, w.zIndex), 10);
    const nextWindows = state.spatialWindows.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
    set({ spatialWindows: nextWindows, activeWindowId: id });
    projectorSync.send({ type: "WINDOW_FOCUS", id });
  },

  toggleMinimizeWindow: (id) => {
    const state = get();
    const nextWindows = state.spatialWindows.map((w) =>
      w.id === id ? { ...w, minimized: !w.minimized } : w
    );
    set({ spatialWindows: nextWindows });
    projectorSync.send({ type: "WINDOWS_UPDATE", windows: nextWindows });
  },

  toggleMaximizeWindow: (id) => {
    const state = get();
    const nextWindows = state.spatialWindows.map((w) =>
      w.id === id ? { ...w, maximized: !w.maximized } : w
    );
    set({ spatialWindows: nextWindows });
    projectorSync.send({ type: "WINDOWS_UPDATE", windows: nextWindows });
  },

  setExperienceMode: (mode) => {
    set({ experienceMode: mode });
    projectorSync.send({ type: "EXPERIENCE_MODE", mode });
  },

  setPresentationSlide: (index) => {
    const state = get();
    const safeIndex = Math.max(0, Math.min(state.totalPresentationSlides - 1, index));
    set({ presentationSlide: safeIndex });
    projectorSync.send({ type: "PRESENTATION_SLIDE", slideIndex: safeIndex });
  },

  nextPresentationSlide: () => {
    const state = get();
    const next = Math.min(state.totalPresentationSlides - 1, state.presentationSlide + 1);
    set({ presentationSlide: next });
    projectorSync.send({ type: "PRESENTATION_SLIDE", slideIndex: next });
  },

  prevPresentationSlide: () => {
    const state = get();
    const prev = Math.max(0, state.presentationSlide - 1);
    set({ presentationSlide: prev });
    projectorSync.send({ type: "PRESENTATION_SLIDE", slideIndex: prev });
  },

  setDemoActive: (active) => set({ demoActive: active, demoStep: active ? 0 : 0 }),
  setDemoStep: (step) => set({ demoStep: step }),

  setMultimodalTarget: (target) => {
    set({ multimodalTarget: target });
    projectorSync.send({ type: "MULTIMODAL_TARGET", target });
  },

  setDeviceState: (patch) =>
    set((state) => ({
      deviceState: { ...state.deviceState, ...patch },
    })),

  addCustomGesture: (def) =>
    set((state) => {
      const next = [...state.customGestures, def];
      saveCustomGestures(next);
      return { customGestures: next };
    }),

  removeCustomGesture: (id) =>
    set((state) => {
      const next = state.customGestures.filter((g) => g.id !== id);
      saveCustomGestures(next);
      return { customGestures: next };
    }),

  setRadialMenuOpen: (open) => set({ radialMenuOpen: open }),
  setRadialMenuCenter: (center) => set({ radialMenuCenter: center }),
  setRadialMenuHand: (hand) => set({ radialMenuHand: hand }),

  pushGestureHistory: (entry) =>
    set((state) => ({
      gestureHistory: [
        { ...entry, id: `${entry.timestamp}-${entry.side}-${Math.random().toString(36).slice(2, 7)}` },
        ...state.gestureHistory,
      ].slice(0, GESTURE_HISTORY_LIMIT),
    })),

  setTrackingStats: (fps, latencyMs) => set({ trackingFps: fps, detectionLatencyMs: latencyMs }),
  setCinematicMode: (on) => set({ cinematicMode: on }),
  setBuiltInGestureShortcutsEnabled: (on) => set({ builtInGestureShortcutsEnabled: on }),
});
