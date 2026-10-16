import { useState } from "react";

/** Open/closed state of a panel, remembered per viewer in localStorage (convenience only). */
export function usePersistedToggle(key: string, initial: boolean): [boolean, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : stored === "1";
    } catch {
      return initial;
    }
  });
  const set = (v: boolean) => {
    setValue(v);
    try {
      localStorage.setItem(key, v ? "1" : "0");
    } catch {
      /* per-viewer convenience only */
    }
  };
  return [value, () => set(!value), set];
}
