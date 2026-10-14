import { Link } from "react-router-dom";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Users, Wallet, FolderKanban, Megaphone, Cpu } from "lucide-react";
import type { DashboardSnapshot } from "@jarvis/shared";

interface QuickAccessCard {
  to: string;
  label: string;
  icon: LucideIcon;
  getHeadline: (snapshot: DashboardSnapshot) => string | null;
}

function spyCount(snapshot: DashboardSnapshot, table: string): string | null {
  const row = snapshot.spy.data?.counts.find((c) => c.table === table);
  return row ? String(row.count) : null;
}

const CARDS: QuickAccessCard[] = [
  { to: "/crm", label: "CRM & Vendas", icon: Users, getHeadline: (s) => spyCount(s, "leads") && `${spyCount(s, "leads")} leads` },
  {
    to: "/directors/cfo",
    label: "Financeiro",
    icon: Wallet,
    getHeadline: (s) => spyCount(s, "finance_entries") && `${spyCount(s, "finance_entries")} lançamentos`,
  },
  {
    to: "/directors/coo",
    label: "Projetos",
    icon: FolderKanban,
    getHeadline: (s) => spyCount(s, "dev_sprint_tasks") && `${spyCount(s, "dev_sprint_tasks")} tarefas de sprint`,
  },
  { to: "/directors/cmo", label: "Marketing", icon: Megaphone, getHeadline: () => null },
  {
    to: "/directors/cto",
    label: "Tecnologia",
    icon: Cpu,
    getHeadline: (s) => (s.n8n.data ? `${s.n8n.data.activeCount} workflows ativos` : null),
  },
];

export function QuickAccessGrid({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => {
        const headline = card.getHeadline(snapshot);
        return (
          <Link
            key={card.to}
            to={card.to}
            className="group rounded-xl border border-jarvis-border bg-jarvis-surface p-3.5 transition-colors hover:border-jarvis-accent/40 hover:bg-jarvis-surfaceHover"
          >
            <div className="mb-2 flex items-center justify-between">
              <card.icon size={16} className="text-jarvis-accent/70" strokeWidth={1.75} />
              <ArrowUpRight size={13} className="text-white/20 transition-colors group-hover:text-jarvis-accentBright" />
            </div>
            <div className="text-xs font-medium text-white/85">{card.label}</div>
            <div className="mt-0.5 text-[10px] text-white/35">{headline ?? "Abrir painel"}</div>
          </Link>
        );
      })}
    </div>
  );
}
