export const SYSTEM_CONSTANTS = {
  // Configurações do Sistema
  APP_NAME: 'Quark OS',
  VERSION: '3.0.0',
  DEFAULT_CURRENCY: 'BRL',
  LOCALE: 'pt-BR',

  // Configurações Técnicas de Engenharia
  HSP_CONVERSION_FACTOR: 123, // Horas de Sol Pleno Anualizado estimativa padrão
  DEFAULT_SYSTEM_SIZE_KW: 5,

  // Configurações de Senhas e Segurança
  MIN_PASSWORD_LENGTH: 6,
};

export const FINANCIAL_CONSTANTS = {
  // Proporções para DRE Minuciosa e Custo (Em %)
  COST_KIT_PERCENTAGE: 0.45,       // Custo de Kit (45%)
  COST_LABOR_PERCENTAGE: 0.10,     // Mão de Obra (10%)
  COST_TAX_PERCENTAGE: 0.10,       // Impostos (10%)
  COST_ENGINEERING_PERCENTAGE: 0.03, // Engenharia/Homologação (3%)
  COST_FREIGHT_PERCENTAGE: 0.02,   // Frete (2%)
  COST_COMMISSION_PERCENTAGE: 0.05, // Comissão (5%)
  
  // Categorias de Lançamento
  CATEGORY_RESIDENTIAL: 'instalacao_residencial',
  CATEGORY_EQUIPMENT: 'equipamentos',
  CATEGORY_LABOR: 'mao_de_obra',
  CATEGORY_TAX: 'imposto',
  CATEGORY_OTHER_CPV: 'outros_cpv',
  CATEGORY_FREIGHT: 'frete',
  CATEGORY_SALARIES: 'salarios'
};

export const PIPELINE_CONSTANTS = {
  DEFAULT_FALLBACK: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Geral', type: 'Geral', color: '#a3e635' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Evento — Tênis', type: 'Evento', color: '#38bdf8' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Evento — Poker', type: 'Evento', color: '#f472b6' },
    { id: '00000000-0000-0000-0000-000000000004', name: 'Evento — Ritmo', type: 'Evento', color: '#fb923c' },
  ],
  DEFAULT_TAGS: [
    { id: 'tag-1', name: 'Anúncios', color: '#f59e0b' },
    { id: 'tag-2', name: 'Indicação', color: '#10b981' },
    { id: 'tag-3', name: 'Instagram orgânico', color: '#8b5cf6' },
    { id: 'tag-4', name: 'Google Ads', color: '#3b82f6' },
    { id: 'tag-5', name: 'Indicação interna', color: '#ec4899' },
  ]
};
import type { LeadStatus, Priority, Product, ProposalStatus, Segment, TaskType } from "./types";

export const STAGES: { id: LeadStatus; label: string; dot: string; soft: string }[] = [
  { id: "novo", label: "Novo lead", dot: "bg-sky-500", soft: "bg-sky-50 text-sky-700 ring-sky-600/15" },
  { id: "contato", label: "Em contato", dot: "bg-indigo-500", soft: "bg-indigo-50 text-indigo-700 ring-indigo-600/15" },
  { id: "visita", label: "Visita técnica", dot: "bg-violet-500", soft: "bg-violet-50 text-violet-700 ring-violet-600/15" },
  { id: "proposta", label: "Proposta enviada", dot: "bg-amber-500", soft: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  { id: "negociacao", label: "Negociação", dot: "bg-orange-500", soft: "bg-orange-50 text-orange-700 ring-orange-600/15" },
  { id: "ganho", label: "Fechado", dot: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700 ring-emerald-600/15" },
  { id: "perdido", label: "Perdido", dot: "bg-rose-500", soft: "bg-rose-50 text-rose-700 ring-rose-600/15" },
];
export const stageOf = (id: string) => STAGES.find((s) => s.id === id) ?? STAGES[0];
export const OPEN_STAGES: LeadStatus[] = ["novo", "contato", "visita", "proposta", "negociacao"];

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "bg-ink-100 text-ink-600 ring-ink-500/15" },
  enviada: { label: "Enviada", cls: "bg-sky-50 text-sky-700 ring-sky-600/15" },
  visualizada: { label: "Visualizada", cls: "bg-violet-50 text-violet-700 ring-violet-600/15" },
  aceita: { label: "Aceita", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/15" },
  recusada: { label: "Recusada", cls: "bg-rose-50 text-rose-700 ring-rose-600/15" },
};

export const TASK_TYPES: Record<TaskType, string> = {
  tarefa: "Tarefa",
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  visita: "Visita",
  email: "E-mail",
  reuniao: "Reunião",
};

export const PRIORITIES: Record<Priority, { label: string; cls: string }> = {
  baixa: { label: "Baixa", cls: "bg-ink-100 text-ink-600 ring-ink-500/15" },
  media: { label: "Média", cls: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  alta: { label: "Alta", cls: "bg-rose-50 text-rose-700 ring-rose-600/15" },
};

export const SOURCES = ["Indicação", "Instagram", "Facebook", "Google", "Site", "WhatsApp", "Porta a porta", "Prospecção ativa", "Evento", "Outro"];
export const ROOF_TYPES = ["Telhado cerâmico", "Telhado fibrocimento", "Telhado metálico", "Laje", "Solo", "Carport"];
export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export const SEGMENTS: Record<Segment, { label: string; short: string; cls: string }> = {
  solar: { label: "Energia solar", short: "Solar", cls: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  save: { label: "Carregador veicular", short: "S.A.V.E", cls: "bg-sky-50 text-sky-800 ring-sky-600/20" },
  ambos: { label: "Solar + carregador", short: "Solar + S.A.V.E", cls: "bg-violet-50 text-violet-800 ring-violet-600/20" },
  eletroposto: { label: "Eletroposto (investimento)", short: "Eletroposto", cls: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  manutencao: { label: "Limpeza e manutenção de usina", short: "Manutenção", cls: "bg-cyan-50 text-cyan-800 ring-cyan-600/20" },
  gestao: { label: "Gestão energética", short: "Gestão", cls: "bg-rose-50 text-rose-800 ring-rose-600/20" },
};

/** Segmentos que usam os dados de conta de luz / energia solar. */
export const SOLAR_SEGMENTS: Segment[] = ["solar", "ambos", "manutencao", "gestao"];
/** Segmentos ligados a recarga veicular (orçamento S.A.V.E). */
export const CHARGER_SEGMENTS: Segment[] = ["save", "ambos", "eletroposto"];

export const PRODUCTS: Record<Product, { label: string; short: string; cls: string }> = {
  solar: { label: "Energia solar", short: "Solar", cls: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  save: { label: "S.A.V.E · Recarga veicular", short: "S.A.V.E", cls: "bg-sky-50 text-sky-800 ring-sky-600/20" },
};

export const productOf = (inputs: { product?: unknown } | null | undefined): Product => (inputs?.product === "save" ? "save" : "solar");
