import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DIRECTORS } from "@jarvis/shared";
import { Search } from "lucide-react";
import { NAV_ITEMS } from "./navItems";

interface Entry {
  to: string;
  label: string;
  hint?: string;
}

const DIRECTOR_ENTRIES: Entry[] = DIRECTORS.map((d) => ({
  to: `/directors/${d.id}`,
  label: d.name,
  hint: d.title,
}));

const ALL_ENTRIES: Entry[] = [
  ...NAV_ITEMS.map((i) => ({ to: i.to, label: i.label, hint: i.hint })),
  ...DIRECTOR_ENTRIES.filter((d) => !NAV_ITEMS.some((i) => i.to === d.to)),
];

/** ⌘K quick-nav — client-side substring filter over real routes, no network round-trip. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ENTRIES;
    return ALL_ENTRIES.filter((e) => e.label.toLowerCase().includes(q) || e.hint?.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter" && results[selected]) {
        navigate(results[selected].to);
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selected, navigate, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-jarvis-borderBright bg-jarvis-bg/95 shadow-glow"
          >
            <div className="flex items-center gap-2.5 border-b border-jarvis-border px-4 py-3">
              <Search size={15} className="text-white/40" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(0);
                }}
                placeholder="Ir para módulo, diretor..."
                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 && <div className="px-3 py-6 text-center text-xs text-white/30">Nada encontrado.</div>}
              {results.map((entry, i) => (
                <button
                  key={entry.to}
                  type="button"
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => {
                    navigate(entry.to);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    i === selected ? "bg-jarvis-cyan/15 text-jarvis-cyanBright" : "text-white/70 hover:bg-white/5"
                  }`}
                >
                  <span>{entry.label}</span>
                  {entry.hint && <span className="text-[10px] text-white/30">{entry.hint}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
