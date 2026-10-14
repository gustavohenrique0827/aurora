import { useCallback, useEffect, useRef } from "react";
import { useJarvisStore } from "../state/store";

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Push-to-talk style dictation + TTS playback + mic-volume metering for the sphere.
 * Separate from useWakeWord, which owns its own always-on recognition instance.
 */
export function useVoiceEngine(onFinalTranscript: (text: string) => void) {
  const setIsListening = useJarvisStore((s) => s.setIsListening);
  const setIsSpeaking = useJarvisStore((s) => s.setIsSpeaking);
  const setInterimTranscript = useJarvisStore((s) => s.setInterimTranscript);
  const setMicVolume = useJarvisStore((s) => s.setMicVolume);
  const setSphereMode = useJarvisStore((s) => s.setSphereMode);
  const setVoiceSupport = useJarvisStore((s) => s.setVoiceSupport);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  // Output analyser on Aurora's own voice (drives the face's mouth via store.speechLevel).
  const outCtxRef = useRef<AudioContext | null>(null);
  const outAnalyserRef = useRef<AnalyserNode | null>(null);
  const outConnectedRef = useRef(false);
  const speechRafRef = useRef<number | null>(null);
  const setSpeechLevel = useJarvisStore((s) => s.setSpeechLevel);

  useEffect(() => {
    const sttSupported = getRecognitionCtor() !== null;
    // TTS now comes from server-side audio (see playAudioBase64) — the browser's
    // own speechSynthesis turned out to be unreliable across machines/profiles,
    // so "TTS supported" just means "can this browser play an <audio> element",
    // which is effectively universal.
    setVoiceSupport(sttSupported, true);
  }, [setVoiceSupport]);

  const stopVolumeMetering = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
    setMicVolume(0);
  }, [setMicVolume]);

  const startVolumeMetering = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
        setMicVolume(avg / 255);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Mic permission denied or unavailable — voice UI stays disabled, chat-by-text still works.
    }
  }, [setMicVolume]);

  const stopPushToTalk = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const getPlaybackEl = useCallback(() => {
    if (!playbackRef.current) {
      playbackRef.current = new Audio();
    }
    return playbackRef.current;
  }, []);

  /**
   * Browser autoplay policy blocks unmuted <audio>.play() calls that aren't tied
   * to a user gesture. Aurora's real playAudioBase64() call happens later, async,
   * once the AI response arrives — well outside that window. Call this
   * synchronously from the same click/keydown handler that sends the message: a
   * muted zero-volume play+pause "unlocks" audio for the rest of the session
   * without producing any audible artifact of its own. (This replaces an earlier
   * approach that primed the browser's own speechSynthesis — that API turned out
   * to be unreliably broken on some machines even after priming; real audio
   * playback via <audio> is far more consistently supported.)
   */
  const stopSpeechMetering = useCallback(() => {
    if (speechRafRef.current) cancelAnimationFrame(speechRafRef.current);
    speechRafRef.current = null;
    setSpeechLevel(0);
  }, [setSpeechLevel]);

  /**
   * Routes the playback element through an AnalyserNode so the face can lip-sync. Only
   * connects once the AudioContext is actually "running": a MediaElementSource sends ALL
   * of the element's sound through the context, so connecting while suspended would mute
   * Aurora. If it isn't running yet, playback stays on the default path (face falls back to
   * a procedural mouth) and a later call connects once a user gesture has resumed it.
   */
  const ensureOutputAnalyser = useCallback((el: HTMLAudioElement): AnalyserNode | null => {
    try {
      if (!outCtxRef.current) outCtxRef.current = new AudioContext();
      const ctx = outCtxRef.current;
      if (ctx.state !== "running") {
        void ctx.resume().catch(() => undefined);
        return outConnectedRef.current ? outAnalyserRef.current : null;
      }
      if (!outConnectedRef.current) {
        const source = ctx.createMediaElementSource(el);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        outAnalyserRef.current = analyser;
        outConnectedRef.current = true;
      }
      return outAnalyserRef.current;
    } catch {
      return null;
    }
  }, []);

  const startSpeechMetering = useCallback(
    (analyser: AnalyserNode | null) => {
      stopSpeechMetering();
      if (!analyser) return;
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setSpeechLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
        speechRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    },
    [setSpeechLevel, stopSpeechMetering]
  );

  const primeAudio = useCallback(() => {
    // Same user gesture also unlocks the analyser's AudioContext for lip-sync later.
    if (outCtxRef.current && outCtxRef.current.state !== "running") {
      void outCtxRef.current.resume().catch(() => undefined);
    } else if (!outCtxRef.current) {
      try {
        outCtxRef.current = new AudioContext();
      } catch {
        // No Web Audio — mouth uses the procedural fallback.
      }
    }
    const el = getPlaybackEl();
    const wasMuted = el.muted;
    el.muted = true;
    el.src = "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA";
    void el
      .play()
      .catch(() => undefined)
      .finally(() => {
        el.pause();
        el.muted = wasMuted;
      });
  }, [getPlaybackEl]);

  const startPushToTalk = useCallback(() => {
    const Ctor = getRecognitionCtor();
    // Privacy Mode (Seção 2) blocks the mic outright, including a manual push-to-talk
    // click — "desliga câmera e microfone" is meant as a hard stop, not just the
    // background wake-word loop (see useWakeWord.ts for that half of the guard).
    if (!Ctor || useJarvisStore.getState().privacyMode) return;

    // Direct user gesture (mic click) — good spot to unlock audible <audio>
    // playback for the rest of the session (see primeAudio below).
    primeAudio();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new Ctor();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setSphereMode("listening");
      void startVolumeMetering();
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setInterimTranscript(interim);
      if (finalText.trim()) {
        onFinalTranscript(finalText.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setSphereMode("idle");
      stopVolumeMetering();
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      // Don't clobber a mode transition already triggered by the final transcript
      // (e.g. sendMessage already flipped this to "thinking").
      if (useJarvisStore.getState().sphereMode === "listening") {
        setSphereMode("idle");
      }
      stopVolumeMetering();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onFinalTranscript, primeAudio, setIsListening, setInterimTranscript, setSphereMode, startVolumeMetering, stopVolumeMetering]);

  const interrupt = useCallback(() => {
    const el = playbackRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setIsSpeaking(false);
    setSphereMode("idle");
    stopSpeechMetering();
  }, [setIsSpeaking, setSphereMode, stopSpeechMetering]);

  const playAudioBase64 = useCallback(
    (base64: string) => {
      if (!base64) return;
      const el = getPlaybackEl();
      el.muted = false;
      const analyser = ensureOutputAnalyser(el);
      el.onplay = () => {
        setIsSpeaking(true);
        setSphereMode("speaking");
        startSpeechMetering(analyser);
      };
      el.onended = () => {
        setIsSpeaking(false);
        setSphereMode("idle");
        stopSpeechMetering();
      };
      el.onerror = () => {
        setIsSpeaking(false);
        setSphereMode("idle");
        stopSpeechMetering();
      };
      el.src = `data:audio/mpeg;base64,${base64}`;
      void el.play().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("Aurora: falha ao tocar áudio da resposta", err);
        setIsSpeaking(false);
        setSphereMode("idle");
        stopSpeechMetering();
      });
    },
    [ensureOutputAnalyser, getPlaybackEl, setIsSpeaking, setSphereMode, startSpeechMetering, stopSpeechMetering]
  );

  useEffect(() => stopVolumeMetering, [stopVolumeMetering]);
  useEffect(
    () => () => {
      stopSpeechMetering();
      void outCtxRef.current?.close().catch(() => undefined);
      outCtxRef.current = null;
      outConnectedRef.current = false;
    },
    [stopSpeechMetering]
  );
  useEffect(() => {
    const el = playbackRef.current;
    return () => {
      el?.pause();
    };
  }, []);

  return { startPushToTalk, stopPushToTalk, playAudioBase64, interrupt, primeAudio };
}
