import type { DirectorId, N8nWorkflowSummary } from "@jarvis/shared";

export interface AgentSubordinate {
  label: string;
  /** Substring of the real n8n workflow name (accents stripped, the way n8n titles are written). */
  match: string;
}

export interface AgentVisual {
  key: string;
  /** Set for the Diretoria Executiva — selecting one really scopes chat/voice to it (activeDirectorId). */
  directorId: DirectorId | null;
  short: string;
  name: string;
  role: string;
  description: string;
  subordinates: AgentSubordinate[];
  color: string;
  kind: "director" | "specialist";
  /** Matches this agent's own n8n workflow title, prefix already stripped. */
  matchWorkflow: (title: string) => boolean;
}

const exact = (name: string) => (title: string) => title === name;

export const AGENT_ROSTER: AgentVisual[] = [
  {
    key: "ceo", directorId: "ceo", short: "CEO", name: "CEO AI", kind: "director", color: "#FFC857",
    role: "Estratégia, visão e crescimento",
    description: "Define prioridades entre as áreas e arbitra quando dois diretores discordam sobre um trade-off.",
    subordinates: [],
    matchWorkflow: exact("CEO AI"),
  },
  {
    key: "cto", directorId: "cto", short: "CTO", name: "CTO AI", kind: "director", color: "#3D8BFF",
    role: "Tecnologia, arquitetura e infraestrutura",
    description: "Decisões técnicas: arquitetura, cloud, segurança, IA e integrações.",
    subordinates: [
      { label: "Gerência Tecnologia", match: "Gerencia Tecnologia" },
      { label: "Gerência Inteligência Artificial", match: "Gerencia Inteligencia Artificial" },
      { label: "Robô Pesquisa Tecnológica", match: "Robo Pesquisa Tecnologica" },
    ],
    matchWorkflow: exact("CTO AI"),
  },
  {
    key: "cfo", directorId: "cfo", short: "CFO", name: "CFO AI", kind: "director", color: "#2EE59D",
    role: "Financeiro, custos e precificação",
    description: "Fluxo de caixa, custos, preço, indicadores (MRR, CAC, LTV) e viabilidade financeira.",
    subordinates: [
      { label: "Gerência Financeira", match: "Gerencia Financeira" },
      { label: "Financial Intelligence", match: "Financial Intelligence" },
    ],
    matchWorkflow: exact("CFO AI"),
  },
  {
    key: "cco", directorId: "cco", short: "CCO", name: "CCO AI", kind: "director", color: "#FF8A3D",
    role: "Comercial, vendas e clientes",
    description: "Prospecção, funil, objeções, retenção e leitura dos leads e clientes reais do SPY.",
    subordinates: [
      { label: "Gerência Comercial", match: "Gerencia Comercial" },
      { label: "Gerência Customer Success", match: "Gerencia Customer Success" },
      { label: "CRM & Customer Intelligence", match: "CRM Customer Intelligence" },
      { label: "Robô Pesquisa Comercial", match: "Robo Pesquisa Comercial" },
    ],
    matchWorkflow: exact("CCO AI"),
  },
  {
    key: "coo", directorId: "coo", short: "COO", name: "COO AI", kind: "director", color: "#19D3C5",
    role: "Operações e processos",
    description: "Processos, prazos, SLAs, gargalos de execução e capacidade da equipe.",
    subordinates: [
      { label: "Gerência Projetos", match: "Gerencia Projetos" },
      { label: "Gerência Operações", match: "Gerencia Operacoes" },
    ],
    matchWorkflow: exact("COO AI"),
  },
  {
    key: "cmo", directorId: "cmo", short: "CMO", name: "CMO AI", kind: "director", color: "#FF4FA3",
    role: "Marketing, marca e aquisição",
    description: "Posicionamento, campanhas, tráfego, conteúdo e geração de demanda.",
    subordinates: [
      { label: "Gerência Marketing", match: "Gerencia Marketing" },
      { label: "Marketing Intelligence", match: "Marketing Intelligence" },
    ],
    matchWorkflow: exact("CMO AI"),
  },
  {
    key: "cpo", directorId: "cpo", short: "CPO", name: "CPO AI", kind: "director", color: "#9B6BFF",
    role: "Produto e roadmap",
    description: "O que construir, priorização de roadmap, MVP e validação de produto.",
    subordinates: [
      { label: "Gerência Produto", match: "Gerencia Produto" },
      { label: "Product Intelligence", match: "Product Intelligence" },
    ],
    matchWorkflow: exact("CPO AI"),
  },
  {
    key: "cio", directorId: "cio", short: "CIO", name: "CIO AI", kind: "director", color: "#5FD4FF",
    role: "Dados e governança de informação",
    description: "Ferramentas internas, dados corporativos, backup e LGPD aplicada aos dados internos.",
    subordinates: [{ label: "Knowledge Engine", match: "Knowledge Engine" }],
    matchWorkflow: exact("CIO AI"),
  },
  {
    key: "chro", directorId: "chro", short: "CHRO", name: "CHRO AI", kind: "director", color: "#FF6B6B",
    role: "Pessoas e cultura",
    description: "Contratação, onboarding, desempenho, cultura e retenção.",
    subordinates: [{ label: "Gerência RH", match: "Gerencia RH" }],
    matchWorkflow: exact("CHRO AI"),
  },
  {
    key: "general_counsel", directorId: "general_counsel", short: "Jurídico", name: "General Counsel AI", kind: "director", color: "#C9B8FF",
    role: "Jurídico e compliance",
    description: "Riscos em contratos, LGPD e compliance. Nunca é parecer vinculante: sempre recomenda revisão humana.",
    subordinates: [{ label: "Gerência Jurídica", match: "Gerencia Juridica" }],
    matchWorkflow: exact("General Counsel AI"),
  },
  {
    key: "radar", directorId: null, short: "Radar", name: "Radar", kind: "specialist", color: "#B6FF3B",
    role: "Prospecção de empresas reais",
    description: "Busca empresas no Google Maps e detecta oportunidades em grupos de WhatsApp monitorados.",
    subordinates: [],
    matchWorkflow: exact("Radar"),
  },
  {
    key: "closer", directorId: null, short: "Closer", name: "Closer AI", kind: "specialist", color: "#FF3D5A",
    role: "Negociação e fechamento",
    description: "Tratamento de objeções e técnicas de fechamento, dentro dos limites aprovados pelo CFO.",
    subordinates: [],
    matchWorkflow: exact("Closer AI"),
  },
  {
    key: "sdr", directorId: null, short: "Júlia", name: "Júlia (SDR)", kind: "specialist", color: "#FF9EE5",
    role: "Qualificação de leads no WhatsApp",
    description: "Conversa com leads, qualifica (BANT) e passa para o closer com o contexto registrado.",
    subordinates: [],
    matchWorkflow: (title) => /j[uú]lia/i.test(title) && /sdr/i.test(title),
  },
];

/** n8n titles carry a platform prefix ("[PLUPPEX AI OS] ", formerly "[G-TECH AI OS] "). */
export function stripWorkflowPrefix(name: string): string {
  return name.replace(/^\[[^\]]+\]\s*/, "");
}

export type AgentLiveStatus = "active" | "inactive" | "unknown";

export interface AgentLiveInfo {
  status: AgentLiveStatus;
  lastExecutionStatus: N8nWorkflowSummary["lastExecutionStatus"];
  lastExecutionAt: string | null;
  subordinates: { label: string; status: AgentLiveStatus }[];
}

export function resolveAgentLive(agent: AgentVisual, workflows: N8nWorkflowSummary[] | undefined): AgentLiveInfo {
  if (!workflows || workflows.length === 0) {
    return {
      status: "unknown",
      lastExecutionStatus: null,
      lastExecutionAt: null,
      subordinates: agent.subordinates.map((s) => ({ label: s.label, status: "unknown" })),
    };
  }
  const own = workflows.find((w) => agent.matchWorkflow(stripWorkflowPrefix(w.name)));
  return {
    status: own ? (own.active ? "active" : "inactive") : "unknown",
    lastExecutionStatus: own?.lastExecutionStatus ?? null,
    lastExecutionAt: own?.lastExecutionAt ?? null,
    subordinates: agent.subordinates.map((s) => {
      const wf = workflows.find((w) => stripWorkflowPrefix(w.name).includes(s.match));
      return { label: s.label, status: wf ? (wf.active ? "active" : "inactive") : "unknown" };
    }),
  };
}
