import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useJarvisStore } from "../state/store";
import { api } from "../lib/api";
import { LoadingPulse } from "../components/common/LoadingPulse";

export function AuthGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useJarvisStore((s) => s.isAuthenticated);
  const authChecked = useJarvisStore((s) => s.authChecked);
  const setAuthenticated = useJarvisStore((s) => s.setAuthenticated);
  const setAuthChecked = useJarvisStore((s) => s.setAuthChecked);
  const location = useLocation();

  useEffect(() => {
    if (authChecked) return;
    api
      .me()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, [authChecked, setAuthenticated, setAuthChecked]);

  if (!authChecked) {
    return (
      <div className="flex h-dvh items-center justify-center px-4">
        <LoadingPulse label="Verificando sessão..." />
      </div>
    );
  }

  if (!isAuthenticated && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
