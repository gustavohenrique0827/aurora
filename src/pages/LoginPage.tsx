import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useJarvisStore } from "../state/store";

export function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuthenticated = useJarvisStore((s) => s.setAuthenticated);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.login(token);
      setAuthenticated(true);
      navigate("/", { replace: true });
    } catch {
      setError("Token inválido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-jarvis-border bg-jarvis-panel/80 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-md"
      >
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-jarvis-accent shadow-glowSoft" />
        <h1 className="mb-1 text-lg font-semibold tracking-widest">AURORA</h1>
        <p className="mb-6 text-xs text-white/40">G-TECH AI OS</p>

        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Token de acesso"
          autoFocus
          className="mb-3 w-full rounded-xl border border-jarvis-border bg-black/30 px-4 py-2.5 text-center text-sm text-white placeholder:text-white/30 focus:border-jarvis-accent/60 focus:outline-none"
        />

        {error && <p className="mb-3 text-xs text-jarvis-red">{error}</p>}

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full rounded-xl border border-jarvis-accent/40 bg-jarvis-accent/15 py-2.5 text-sm text-jarvis-accentBright transition-opacity disabled:opacity-40"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
