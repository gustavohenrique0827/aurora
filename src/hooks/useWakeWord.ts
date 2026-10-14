import { useEffect, useRef } from "react";
import { useJarvisStore } from "../state/store";

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

const WAKE_PHRASE = "aurora";
const MAX_CONSECUTIVE_FAILURES = 5;
const RESTART_DELAY_MS = 400;

/**
 * Best-effort, toggleable wake-word listener. Uses a SEPARATE SpeechRecognition
 * instance from the push-to-talk one in useVoiceEngine, because the two have
 * different lifecycles (continuous background listening vs. one-shot dictation).
 *
 * Known limitations (surfaced to the user via WakeWordToggle, not hidden here):
 * Chrome/Edge only, needs an active mic grant, needs the tab to stay open,
 * auto-restarts after Chrome's silence timeout, disables itself after repeated
 * failures rather than looping forever silently.
 */
/** Words said after "Aurora" in the same breath ("Aurora, tudo bem?") — that's the command. */
function commandAfterWake(transcript: string): string {
  const at = transcript.lastIndexOf(WAKE_PHRASE);
  return transcript.slice(at + WAKE_PHRASE.length).replace(/^[\s,.!?:;-]+/, "").trim();
}

// Chrome fires these routinely (silence timeout, our own stop/abort) — not real failures.
const BENIGN_ERRORS = new Set(["no-speech", "aborted"]);

/**
 * onWake(command): command is what was said right after "Aurora" in the same utterance, or ""
 * when only the name was said (then the caller should open push-to-talk for the command).
 */
export function useWakeWord(onWake: (command: string) => void) {
  const wakeWordEnabled = useJarvisStore((s) => s.wakeWordEnabled);
  const setWakeWordEnabled = useJarvisStore((s) => s.setWakeWordEnabled);
  // Privacy Mode (Seção 2) must kill the mic too, not just the camera — a background
  // SpeechRecognition loop is exactly the kind of "always listening" surface it exists to stop.
  const privacyMode = useJarvisStore((s) => s.privacyMode);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const failureCountRef = useRef(0);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(wakeWordEnabled);
  enabledRef.current = wakeWordEnabled;
  // Set synchronously the instant "jarvis" is heard, before onWake()'s async chain
  // (startPushToTalk → its own recognition.onstart) has had a chance to flip
  // isListening in the store. Without this, wake-word can win the race and start a
  // SECOND SpeechRecognition instance while push-to-talk's is starting up — Chrome
  // allows only one live recognition session per page, so one of the two breaks.
  const justTriggeredRef = useRef(false);
  // Latest callback without restarting recognition on every render (an inline arrow changes
  // identity each render; as an effect dep it aborted and restarted the mic constantly).
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!wakeWordEnabled || !Ctor || privacyMode) return;

    let stopped = false;

    const start = () => {
      if (stopped) return;
      const recognition = new Ctor();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;

      let pendingWake: string | null = null;
      recognition.onstart = () => {
        failureCountRef.current = 0;
      };
      recognition.onresult = (event) => {
        if (pendingWake !== null) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript.toLowerCase();
          if (!transcript.includes(WAKE_PHRASE)) continue;
          const command = commandAfterWake(transcript);
          // Interim "aurora, tu…" — wait for the final result to get the whole command.
          if (!result.isFinal && command.length > 0) return;
          failureCountRef.current = 0;
          justTriggeredRef.current = true;
          // Safety release in case the store flags below never end up covering
          // this cycle for some reason — don't suppress restarts forever.
          setTimeout(() => {
            justTriggeredRef.current = false;
          }, 4000);
          // Instant visual feedback: she perks up the moment she hears her name.
          useJarvisStore.getState().setSphereMode("listening");
          pendingWake = result.isFinal ? command : "";
          // Fire only after this session has fully ended — starting push-to-talk's own
          // recognition while this one is still live makes Chrome reject it.
          recognition.stop();
          return;
        }
      };

      recognition.onerror = (event) => {
        if (!BENIGN_ERRORS.has(event.error)) failureCountRef.current += 1;
      };

      const checkAndRestart = () => {
        if (stopped || !enabledRef.current) return;

        // Don't restart while push-to-talk is capturing a command, Aurora is
        // waiting on the AI response, or Aurora is speaking — starting a second
        // recognition session during any of those breaks the active one.
        const { isListening, isSpeaking, isAwaitingResponse, privacyMode: privacyNow } = useJarvisStore.getState();
        if (privacyNow) return; // Privacy Mode toggled on mid-loop — stop restarting, don't reschedule.
        if (justTriggeredRef.current || isListening || isSpeaking || isAwaitingResponse) {
          restartTimeoutRef.current = setTimeout(checkAndRestart, RESTART_DELAY_MS);
          return;
        }
        if (document.visibilityState !== "visible") {
          restartTimeoutRef.current = setTimeout(checkAndRestart, RESTART_DELAY_MS);
          return;
        }
        if (failureCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
          setWakeWordEnabled(false);
          return;
        }
        start();
      };

      recognition.onend = () => {
        if (pendingWake !== null) {
          const command = pendingWake;
          pendingWake = null;
          if (!command && useJarvisStore.getState().sphereMode === "listening") {
            useJarvisStore.getState().setSphereMode("idle");
          }
          onWakeRef.current(command);
        }
        if (stopped || !enabledRef.current) return;
        restartTimeoutRef.current = setTimeout(checkAndRestart, RESTART_DELAY_MS);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        failureCountRef.current += 1;
      }
    };

    start();

    return () => {
      stopped = true;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      failureCountRef.current = 0;
    };
  }, [wakeWordEnabled, privacyMode, setWakeWordEnabled]);
}
