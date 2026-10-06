import { supabase } from "./supabaseClient";

/** Etapas do funil (coluna `status` da tabela opportunities). */
export const OPPORTUNITY_STAGES = [
  { id: "Lead", name: "Lead", color: "#60A5FA", weight: 0.1 },
  { id: "Qualificado", name: "Qualificado", color: "#FACC15", weight: 0.3 },
  { id: "Proposta", name: "Proposta", color: "#A78BFA", weight: 0.7 },
  { id: "Ganho", name: "Ganho", color: "#A3E635", weight: 1 },
  { id: "Perdido", name: "Perdido", color: "#F87171", weight: 0 },
] as const;

export type StageId = (typeof OPPORTUNITY_STAGES)[number]["id"];

export const LOSS_REASONS = ["Preço muito alto", "Fechou com a concorrência", "Projeto inviável (telhado/estrutura)", "Parou de responder", "Apenas curioso", "Outro"];

export interface Opportunity {
  id: string;
  title: string;
  status: string;
  amount: number;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
  birth_date?: string | null;
  system_power?: number | null;
  installation_date?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
  loss_reason?: string | null;
  next_action_date?: string | null;
  next_action_text?: string | null;
  segment?: string | null;
  services?: string[] | null;
  source?: string | null;
  temperature?: "frio" | "morno" | "quente" | null;
  avg_bill?: number | null;
  consumption_kwh?: number | null;
  roof_type?: string | null;
  connection_type?: string | null;
  notes?: string | null;
  anamnese?: Record<string, unknown> | null;
}

/** Proposta resumida, para os cards do CRM. */
export interface OppProposal {
  id: string;
  number: number;
  lead_id: string;
  status: string;
  final_price: number;
  power_kwp: number | null;
  public_token: string;
  created_at: string;
  inputs?: { product?: string } | null;
}

/** Pontuação simples: valor, temperatura, conta de luz e engajamento com a proposta. */
export function leadScore(o: Opportunity, views = 0) {
  let score = 30;
  score += Math.min(25, Math.floor((o.amount || 0) / 2000));
  if (o.temperature === "quente") score += 20;
  else if (o.temperature === "morno") score += 8;
  if ((o.avg_bill ?? 0) >= 800) score += 10;
  else if ((o.avg_bill ?? 0) >= 400) score += 5;
  score += Math.min(15, views * 5);
  return Math.max(5, Math.min(100, score));
}

export const isCold = (o: Opportunity) =>
  !!o.updated_at && Date.now() - new Date(o.updated_at).getTime() > 7 * 86400000 && o.status !== "Ganho" && o.status !== "Perdido";

export function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1000) return `R$ ${Math.round(value / 1000)}k`;
  return `R$ ${Math.round(value)}`;
}

/** Ao ganhar o negócio, cria o cliente no portal (e a ficha técnica, se houver dados). */
export async function convertToClient(o: Opportunity) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;
    const { data: client, error } = await supabase
      .from("client_portal_users")
      .insert({
        user_id: auth.user.id,
        name: o.title || "Cliente sem nome",
        email: o.email || "",
        phone: o.phone || "",
        cpf: o.cpf_cnpj || "",
        birth_date: o.birth_date || null,
        is_active: true,
      })
      .select()
      .single();
    if (!error && client && (o.installation_date || o.system_power)) {
      await supabase.from("client_intelligence").insert({
        user_id: auth.user.id,
        client_id: client.id,
        client_name: client.name,
        install_start_date: o.installation_date || null,
        system_size_kw: o.system_power || 0,
        is_active: true,
      });
    }
  } catch (err) {
    console.error("Erro ao converter lead em cliente:", err);
  }
}

/** Rótulos amigáveis para as chaves da anamnese. */
export const ANAMNESE_LABELS: Record<string, string> = {
  objetivo: "Objetivo",
  imovel: "Tipo de imóvel",
  propriedade: "Imóvel próprio?",
  conta: "Conta de luz média",
  consumo: "Consumo (kWh)",
  ligacao: "Tipo de ligação",
  telhado: "Telhado",
  sombra: "Sombreamento",
  prazo: "Prazo para decidir",
  pagamento: "Forma de pagamento",
  veiculo: "Veículo elétrico",
  vagas: "Vagas / pontos de recarga",
  local_carregador: "Local do carregador",
  negocio: "Tipo de negócio",
  potencia_usina: "Potência da usina",
  ultima_limpeza: "Última limpeza",
  problema: "Problema relatado",
  uc_count: "Unidades consumidoras",
  gestao_servicos: "Serviços de gestão",
  titular: "Titular da conta",
  concessionaria: "Concessionária",
  observacoes: "Observações",
  indicacao: "Indicação",
  melhor_horario: "Melhor horário para contato",
};
