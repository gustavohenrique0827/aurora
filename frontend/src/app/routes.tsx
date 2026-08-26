import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../pages/LoginPage";
import { HomePage } from "../pages/HomePage";
import { AuroraPage } from "../pages/AuroraPage";
import { AgentesPage } from "../pages/AgentesPage";
import { AutomacoesPage } from "../pages/AutomacoesPage";
import { CrmPage } from "../pages/CrmPage";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { MemoriaPage } from "../pages/MemoriaPage";
import { ConfiguracoesPage } from "../pages/ConfiguracoesPage";
import { DirectorPanel } from "../components/directors/DirectorPanel";
import { AuthGate } from "./AuthGate";

import { AuroraVisionPage } from "../pages/AuroraVisionPage";
import { ProjectorPage } from "../pages/ProjectorPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/projector"
        element={
          <AuthGate>
            <ProjectorPage />
          </AuthGate>
        }
      />
      <Route
        path="/*"
        element={
          <AuthGate>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/aurora" element={<AuroraPage />} />
                <Route path="/vision" element={<Navigate to="/aurora" replace />} />
                {/* legacy link */}
                <Route path="/jarvis" element={<Navigate to="/aurora" replace />} />
                <Route path="/agentes" element={<AgentesPage />} />
                {/* legacy links from before the IA merge */}
                <Route path="/directors" element={<Navigate to="/agentes" replace />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/directors/:id" element={<DirectorPanel />} />
                <Route path="/automacoes" element={<AutomacoesPage />} />
                <Route path="/crm" element={<CrmPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/memoria" element={<MemoriaPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              </Routes>
            </AppShell>
          </AuthGate>
        }
      />
    </Routes>
  );
}
