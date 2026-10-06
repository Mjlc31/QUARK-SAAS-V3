import { BarChart3, BatteryCharging, Droplets, FileStack, PlugZap, Sun, type LucideIcon } from "lucide-react";

/**
 * Catálogo único dos serviços da Quark. Usado no CRM (badges, filtros),
 * na página de bio do Instagram, na anamnese e nas ferramentas.
 */
export type ServiceId = "solar" | "save" | "eletroposto" | "manutencao" | "projeto" | "gestao";

export interface ServiceDef {
  id: ServiceId;
  label: string;
  short: string;
  pitch: string;
  icon: LucideIcon;
  /** Cor de destaque (hex) para gradientes e anéis. */
  color: string;
  /** Classes do badge no tema escuro. */
  badge: string;
  gradient: string;
}

export const SERVICES: ServiceDef[] = [
  {
    id: "solar",
    label: "Energia solar",
    short: "Solar",
    pitch: "Reduza até 95% da conta de luz",
    icon: Sun,
    color: "#F5B83D",
    badge: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    gradient: "linear-gradient(145deg,#FFD84D 0%,#F3A33B 100%)",
  },
  {
    id: "save",
    label: "Carregador veicular (S.A.V.E)",
    short: "S.A.V.E",
    pitch: "Carregue seu carro elétrico em casa",
    icon: PlugZap,
    color: "#4C9BFF",
    badge: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
    gradient: "linear-gradient(145deg,#7CC4FF 0%,#2F7BF6 100%)",
  },
  {
    id: "eletroposto",
    label: "Instalação de eletroposto",
    short: "Eletroposto",
    pitch: "Recarga rápida para o seu negócio faturar",
    icon: BatteryCharging,
    color: "#2BB673",
    badge: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
    gradient: "linear-gradient(145deg,#8FE3B0 0%,#1FA36A 100%)",
  },
  {
    id: "manutencao",
    label: "Manutenção do sistema solar",
    short: "Manutenção",
    pitch: "Limpeza, inspeção e reparo da sua usina",
    icon: Droplets,
    color: "#22B8CF",
    badge: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/25",
    gradient: "linear-gradient(145deg,#7DE3F0 0%,#1A9FC0 100%)",
  },
  {
    id: "projeto",
    label: "Projeto fotovoltaico",
    short: "Projeto",
    pitch: "Projeto, ART e homologação na Equatorial",
    icon: FileStack,
    color: "#9B7BFF",
    badge: "bg-violet-400/10 text-violet-300 ring-violet-400/25",
    gradient: "linear-gradient(145deg,#B38CFF 0%,#5B34D6 100%)",
  },
  {
    id: "gestao",
    label: "Gestão de fatura, créditos e rateio",
    short: "Gestão",
    pitch: "Titularidade, rateio de créditos e auditoria",
    icon: BarChart3,
    color: "#F0679A",
    badge: "bg-pink-400/10 text-pink-300 ring-pink-400/25",
    gradient: "linear-gradient(145deg,#FF9DB8 0%,#E0457B 100%)",
  },
];

const BY_ID = new Map(SERVICES.map((s) => [s.id, s]));

/** Normaliza valores antigos ("ambos", "carregador"…) para um serviço do catálogo. */
export function serviceOf(v: string | null | undefined): ServiceDef | null {
  if (!v) return null;
  const key = v.toLowerCase().trim();
  if (key === "ambos") return BY_ID.get("solar")!;
  if (key === "carregador" || key === "ev") return BY_ID.get("save")!;
  return BY_ID.get(key as ServiceId) ?? null;
}

/** Lista de serviços de um negócio: aceita o campo `services` (array) e/ou `segment`. */
export function servicesOf(opp: { segment?: string | null; services?: string[] | null }): ServiceDef[] {
  const ids = new Set<string>();
  for (const s of opp.services ?? []) if (s) ids.add(s);
  if (opp.segment) ids.add(opp.segment === "ambos" ? "solar" : opp.segment);
  if (opp.segment === "ambos") ids.add("save");
  return [...ids].map(serviceOf).filter((s): s is ServiceDef => !!s);
}

/** Origens de lead mais comuns. */
export const LEAD_SOURCES = ["Instagram", "Indicação", "Google", "WhatsApp", "Site", "Anamnese", "Bio Instagram", "Prospecção", "Evento", "Outro"];
