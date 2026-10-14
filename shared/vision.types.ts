export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type CalibrationCorner = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

export interface CalibrationQuad {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export type SurfaceMode = "wall" | "glass" | "tabletop" | "screen" | "custom";

export interface SurfaceProfile {
  id: string;
  name: string;
  surfaceMode: SurfaceMode;
  quad: CalibrationQuad;
  brightness: number; // 50..150 (%)
  contrast: number; // 50..200 (%)
  darkRoomMode: boolean;
  rotation: 0 | 90 | 180 | 270;
  keystone: { x: number; y: number };
  scale: number; // 0.5..1.5
  offsetX: number; // -200..200 px
  offsetY: number; // -200..200 px
  updatedAt: number;
}

export type SpatialWindowType =
  | "crm"
  | "vendas"
  | "financeiro"
  | "projetos"
  | "automacoes"
  | "waha"
  | "chat"
  | "apresentacao"
  | "demo";

export interface SpatialWindow {
  id: string;
  type: SpatialWindowType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

export type DeviceStatus = "connected" | "disconnected" | "error" | "calibrating";

export interface AuroraDeviceState {
  cameras: Array<{ deviceId: string; label: string }>;
  selectedCameraId: string | null;
  microphones: Array<{ deviceId: string; label: string }>;
  selectedMicId: string | null;
  projectorConnected: boolean;
  projectorWindowOpen: boolean;
}

export type VisionExperienceMode = "normal" | "presentation" | "business" | "demo";

export type ProjectorSyncMessage =
  | { type: "CURSOR_MOVE"; pos: Point2D; pinchActive: boolean; pointing: boolean }
  | { type: "CURSOR_CLICK"; pos: Point2D; double: boolean }
  | { type: "WINDOWS_UPDATE"; windows: SpatialWindow[] }
  | { type: "WINDOW_FOCUS"; id: string }
  | { type: "EXPERIENCE_MODE"; mode: VisionExperienceMode }
  | { type: "PRESENTATION_SLIDE"; slideIndex: number }
  | { type: "SURFACE_SETTINGS"; profile: SurfaceProfile }
  | { type: "MULTIMODAL_TARGET"; target: { label: string; x: number; y: number; bounds?: { x: number; y: number; width: number; height: number } } | null }
  | { type: "SPHERE_STATE"; mode: string; mood: string; text?: string; micVolume?: number };

