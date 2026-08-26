import { create } from "zustand";
import { createAuthSlice, type AuthSlice } from "./slices/authSlice";
import { createSphereSlice, type SphereSlice } from "./slices/sphereSlice";
import { createVoiceSlice, type VoiceSlice } from "./slices/voiceSlice";
import { createChatSlice, type ChatSlice } from "./slices/chatSlice";
import { createDashboardSlice, type DashboardSlice } from "./slices/dashboardSlice";
import { createUiSlice, type UiSlice } from "./slices/uiSlice";
import { createVisionSlice, type VisionSlice } from "./slices/visionSlice";

export type RootState = AuthSlice &
  SphereSlice &
  VoiceSlice &
  ChatSlice &
  DashboardSlice &
  UiSlice &
  VisionSlice;

export const useJarvisStore = create<RootState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createSphereSlice(...a),
  ...createVoiceSlice(...a),
  ...createChatSlice(...a),
  ...createDashboardSlice(...a),
  ...createUiSlice(...a),
  ...createVisionSlice(...a),
}));
