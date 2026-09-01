import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Sparkles,
  Crown,
  Handshake,
  Megaphone,
  Wallet,
  Cpu,
  Package,
  FolderKanban,
  Users,
  Workflow,
  Bot,
  Brain,
  BarChart3,
  Settings,
  Scan,
  Coins,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown under the label in the command palette to disambiguate from a similarly named director. */
  hint?: string;
}

/**
 * Single source of truth for top-level navigation — both SideNav and CommandPalette render
 * from this list so the two never drift apart.
 *
 * Not every real director gets a slot here (CIO/CHRO/General Counsel don't, to keep this
 * list close to the 15-16 items of the reference layout) — all ten are still reachable via
 * /agentes (full roster) and the command palette.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, hint: "Central de comando" },
  { to: "/aurora", label: "Aurora", icon: Sparkles, hint: "Interface holográfica, núcleo 3D e voz" },
  { to: "/directors/ceo", label: "CEO", icon: Crown },
  { to: "/directors/cco", label: "Comercial", icon: Handshake, hint: "CCO AI" },
  { to: "/directors/cmo", label: "Marketing", icon: Megaphone, hint: "CMO AI" },
  { to: "/directors/cfo", label: "Financeiro", icon: Wallet, hint: "CFO AI" },
  { to: "/directors/cto", label: "Tecnologia", icon: Cpu, hint: "CTO AI" },
  { to: "/directors/cpo", label: "Produto", icon: Package, hint: "CPO AI" },
  { to: "/directors/coo", label: "Projetos", icon: FolderKanban, hint: "COO AI — operações e processos" },
  { to: "/crm", label: "CRM", icon: Users, hint: "Leads e clientes (Axis)" },
  { to: "/automacoes", label: "Automações", icon: Workflow, hint: "Workflows n8n" },
  { to: "/consumo", label: "Consumo", icon: Coins, hint: "Tokens e custo por agente" },
  { to: "/agentes", label: "Agentes", icon: Bot, hint: "Roster completo da Diretoria" },
  { to: "/memoria", label: "Memória", icon: Brain, hint: "Ainda não conectado" },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];
