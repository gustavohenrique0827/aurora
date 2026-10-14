import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJarvisChat } from "./useJarvisChat";
import { useVoiceEngine } from "./useVoiceEngine";
import { useWakeWord } from "./useWakeWord";
import { useJarvisStore } from "../state/store";
import { matchScreenVisionIntent } from "../lib/screenVisionIntent";
import { matchCameraVisionIntent } from "../lib/cameraVisionIntent";
import { matchDemonstrativeIntent } from "../lib/demonstrativeIntent";
import { resolvePointedTarget } from "../lib/handTracking/pointedTarget";

function checkVoiceActionShortcuts(text: string, navigate: (path: string) => void): boolean {
  const norm = text.toLowerCase().trim();
  const state = useJarvisStore.getState();

  if (norm.includes("consumo de tokens") || norm.includes("gastos dos agentes") || norm.includes("quanto eu gastei")) {
    navigate("/consumo");
    return true;
  }

  if (norm.includes("iniciar apresentação") || norm.includes("abrir apresentação")) {
    state.setExperienceMode("presentation");
    return true;
  }
  if (norm.includes("mostre como você funciona") || norm.includes("iniciar demonstração") || norm.includes("modo demo")) {
    state.setExperienceMode("demo");
    return true;
  }
  if (norm.includes("abra o crm") || norm.includes("abrir crm") || norm.includes("mostre os clientes")) {
    state.addSpatialWindow("crm", "CRM & Leads (SPY)");
    return false; // Still allow sending query to chat
  }
  if (norm.includes("mostre minhas vendas") || norm.includes("abrir vendas") || norm.includes("painel de vendas")) {
    state.addSpatialWindow("vendas", "Vendas & Desempenho");
    return false;
  }
  if (norm.includes("painel financeiro") || norm.includes("abrir financeiro")) {
    state.addSpatialWindow("financeiro", "Painel Financeiro");
    return false;
  }
  if (norm === "voltar" || norm === "aurora, volte") {
    if (state.experienceMode === "presentation") {
      state.prevPresentationSlide();
    } else {
      window.history.back();
    }
    return true;
  }

  return false;
}

function maybeAugmentWithPointedTarget(text: string): string {
  if (!matchDemonstrativeIntent(text)) return text;
  const vision = useJarvisStore.getState();
  if (!vision.cameraActive || vision.privacyMode) return text;
  const hand = vision.hands[vision.dominantHand];
  if (!hand || (hand.pose.pose !== "POINTING" && hand.pose.pose !== "FINGER_GUN")) return text;
  const tip = hand.landmarks[8];
  const target = resolvePointedTarget(tip.x, tip.y, vision.pointerCalibration);
  if (!target) return text;

  // Set visual target highlight and trigger analyzing visual state on Aurora core
  vision.setMultimodalTarget(target);
  vision.setSphereMode("analyzing");

  setTimeout(() => {
    // Clear highlight after 6 seconds
    useJarvisStore.getState().setMultimodalTarget(null);
  }, 6000);

  return `${text}\n\n[Contexto: o usuário está apontando para: ${target.label}]`;
}

export function useGlobalVoiceAgent() {
  const activeDirectorId = useJarvisStore((s) => s.activeDirectorId) ?? undefined;
  const navigate = useNavigate();
  const { messages, sendMessage } = useJarvisChat();
  const lastSpokenIdRef = useRef<string | null>(null);
  const [pendingScreenShare, setPendingScreenShare] = useState<string | null>(null);
  const [pendingCameraShare, setPendingCameraShare] = useState<string | null>(null);

  const handleSend = (
    text: string,
    image?: { base64: string; mimeType: string },
    document?: { base64: string; mimeType: string }
  ) => {
    if (!image && !document && matchScreenVisionIntent(text)) {
      setPendingScreenShare(text);
      return;
    }
    if (!image && !document && matchCameraVisionIntent(text)) {
      setPendingCameraShare(text);
      return;
    }

    const handledShortcuts = checkVoiceActionShortcuts(text, navigate);
    if (handledShortcuts) return;

    const augmented = image || document ? text : maybeAugmentWithPointedTarget(text);
    sendMessage(augmented, activeDirectorId, image, document);
  };

  const { startPushToTalk, stopPushToTalk, playAudioBase64, interrupt, primeAudio } = useVoiceEngine(handleSend);

  // "Aurora, <pedido>" in one breath → send the pedido directly; just "Aurora" → open the mic.
  useWakeWord((command) => {
    if (command) handleSend(command);
    else startPushToTalk();
  });

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.error) return;
    if (lastSpokenIdRef.current === last.id) return;
    lastSpokenIdRef.current = last.id;
    if (last.audioBase64) playAudioBase64(last.audioBase64);
  }, [messages, playAudioBase64]);

  const handleComposerSend = (
    text: string,
    image?: { base64: string; mimeType: string },
    document?: { base64: string; mimeType: string }
  ) => {
    primeAudio();
    handleSend(text, image, document);
  };

  const confirmScreenShare = (image: { base64: string; mimeType: string }) => {
    if (pendingScreenShare === null) return;
    sendMessage(pendingScreenShare, activeDirectorId, image);
    setPendingScreenShare(null);
  };

  const cancelScreenShare = () => {
    if (pendingScreenShare === null) return;
    sendMessage(pendingScreenShare, activeDirectorId);
    setPendingScreenShare(null);
  };

  const confirmCameraShare = (image: { base64: string; mimeType: string }) => {
    if (pendingCameraShare === null) return;
    sendMessage(pendingCameraShare, activeDirectorId, image);
    setPendingCameraShare(null);
  };

  const cancelCameraShare = () => {
    if (pendingCameraShare === null) return;
    sendMessage(pendingCameraShare, activeDirectorId);
    setPendingCameraShare(null);
  };

  return {
    startPushToTalk,
    stopPushToTalk,
    interrupt,
    handleComposerSend,
    pendingScreenShare,
    confirmScreenShare,
    cancelScreenShare,
    pendingCameraShare,
    confirmCameraShare,
    cancelCameraShare,
  };
}
