import type { CalibrationQuad, SurfaceMode, SurfaceProfile } from "@jarvis/shared";

const STORAGE_PROFILES_KEY = "aurora-vision-surface-profiles";
const STORAGE_ACTIVE_PROFILE_KEY = "aurora-vision-active-profile-id";

export const DEFAULT_QUAD: CalibrationQuad = {
  topLeft: { x: 0.1, y: 0.1 },
  topRight: { x: 0.9, y: 0.1 },
  bottomRight: { x: 0.9, y: 0.9 },
  bottomLeft: { x: 0.1, y: 0.9 },
};

export const DEFAULT_PROFILES: Record<SurfaceMode, SurfaceProfile> = {
  wall: {
    id: "profile-wall",
    name: "Modo Parede",
    surfaceMode: "wall",
    quad: { ...DEFAULT_QUAD },
    brightness: 110,
    contrast: 130,
    darkRoomMode: true,
    rotation: 0,
    keystone: { x: 0, y: 0 },
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    updatedAt: Date.now(),
  },
  glass: {
    id: "profile-glass",
    name: "Modo Vidro / HUD",
    surfaceMode: "glass",
    quad: {
      topLeft: { x: 0.15, y: 0.12 },
      topRight: { x: 0.85, y: 0.12 },
      bottomRight: { x: 0.85, y: 0.88 },
      bottomLeft: { x: 0.15, y: 0.88 },
    },
    brightness: 135,
    contrast: 160,
    darkRoomMode: true,
    rotation: 0,
    keystone: { x: 0, y: 0 },
    scale: 0.95,
    offsetX: 0,
    offsetY: 0,
    updatedAt: Date.now(),
  },
  tabletop: {
    id: "profile-tabletop",
    name: "Modo Mesa Interativa",
    surfaceMode: "tabletop",
    quad: {
      topLeft: { x: 0.2, y: 0.25 },
      topRight: { x: 0.8, y: 0.25 },
      bottomRight: { x: 0.9, y: 0.85 },
      bottomLeft: { x: 0.1, y: 0.85 },
    },
    brightness: 105,
    contrast: 120,
    darkRoomMode: false,
    rotation: 0,
    keystone: { x: 0, y: 5 },
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    updatedAt: Date.now(),
  },
  screen: {
    id: "profile-screen",
    name: "Modo Tela / Monitor",
    surfaceMode: "screen",
    quad: {
      topLeft: { x: 0.05, y: 0.05 },
      topRight: { x: 0.95, y: 0.05 },
      bottomRight: { x: 0.95, y: 0.95 },
      bottomLeft: { x: 0.05, y: 0.95 },
    },
    brightness: 100,
    contrast: 100,
    darkRoomMode: false,
    rotation: 0,
    keystone: { x: 0, y: 0 },
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    updatedAt: Date.now(),
  },
  custom: {
    id: "profile-custom",
    name: "Superfície Personalizada",
    surfaceMode: "custom",
    quad: { ...DEFAULT_QUAD },
    brightness: 100,
    contrast: 100,
    darkRoomMode: false,
    rotation: 0,
    keystone: { x: 0, y: 0 },
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    updatedAt: Date.now(),
  },
};

export function loadProfiles(): Record<string, SurfaceProfile> {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILES };
  try {
    const raw = window.localStorage.getItem(STORAGE_PROFILES_KEY);
    if (!raw) return { ...DEFAULT_PROFILES };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILES, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILES };
  }
}

export function saveProfiles(profiles: Record<string, SurfaceProfile>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // Non-fatal
  }
}

export function loadActiveProfileId(): string {
  if (typeof window === "undefined") return "profile-wall";
  try {
    return window.localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY) || "profile-wall";
  } catch {
    return "profile-wall";
  }
}

export function saveActiveProfileId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, id);
  } catch {
    // Non-fatal
  }
}

