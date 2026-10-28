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
  deleted_at?: string | null;
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

/** Ao ganhar o negócio, cria o cliente no portal, adiciona ao catálogo de clientes, inicializa a engenharia e registra no financeiro. */
export async function convertToClient(o: Opportunity) {
  try {
    let currentUserId = '7dacc88f-9ebd-4710-a1be-0647841db24a';
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user?.id) currentUserId = auth.user.id;
    } catch {}

    const contractAmount = Number(o.amount || (o as any).value || 0);
    const cleanPhone = o.phone ? o.phone.trim() : null;
    const cleanEmail = o.email ? o.email.trim().toLowerCase() : null;
    const cleanCpf = o.cpf_cnpj ? o.cpf_cnpj.trim() : null;

    const isUuid = (val?: string | null): val is string =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const validOppId = o.id && isUuid(o.id) ? o.id : null;

    const clientPayload: Record<string, any> = {
      name: o.title || "Cliente sem nome",
      email: cleanEmail,
      phone: cleanPhone,
      cpf: cleanCpf,
      birth_date: o.birth_date || null,
      city: o.city || "Maceió",
      state: "AL",
      address: o.address || null,
      system_size_kw: o.system_power || 0,
      contract_value: contractAmount,
      system_cost: contractAmount,
      notes: o.notes || `Cliente originado do CRM (Venda Fechada - ${o.system_power || 0} kWp).`,
      opportunity_id: validOppId,
      is_active: true,
      user_id: currentUserId,
    };

    // 1. Tenta persistência direta no Supabase Cloud (garante persistência imediata)
    let createdClient: any = null;
    try {
      const { data: client, error } = await supabase
        .from("client_portal_users")
        .insert({
          ...clientPayload,
          created_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();
      if (!error && client) createdClient = client;
    } catch (sbErr) {
      console.warn('[convertToClient] Supabase direto aviso:', sbErr);
    }

    // 2. Sincroniza via API do backend em background
    try {
      fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdClient || clientPayload)
      }).catch(() => {});
    } catch (apiErr) {
      console.warn('[convertToClient] /api/clients aviso:', apiErr);
    }

    // 3. Salva no cache local de clientes para exibição imediata
    const clientId = createdClient?.id || `cli_opp_${o.id}`;
    const fullClient = {
      ...clientPayload,
      id: clientId,
      created_at: createdClient?.created_at || new Date().toISOString(),
      deleted_at: null,
      ...createdClient
    };

    try {
      const cachedRaw = localStorage.getItem('quark_clients_cache');
      let cachedList = cachedRaw ? JSON.parse(cachedRaw) : [];
      if (!Array.isArray(cachedList)) cachedList = [];
      const idx = cachedList.findIndex((c: any) => c.id === clientId || (c.name && c.name.toLowerCase() === fullClient.name.toLowerCase()));
      if (idx >= 0) {
        cachedList[idx] = { ...cachedList[idx], ...fullClient };
      } else {
        cachedList.unshift(fullClient);
      }
      localStorage.setItem('quark_clients_cache', JSON.stringify(cachedList));
      window.dispatchEvent(new CustomEvent('quark_client_updated', { detail: fullClient }));
    } catch (_) {}

    // 4. Cria registros associados (Inteligência, Tracking de Obra e Financeiro)
    if (fullClient.id) {
      if (o.installation_date || o.system_power) {
        try {
          await supabase.from("client_intelligence").insert({
            user_id: currentUserId,
            client_id: fullClient.id,
            client_name: fullClient.name,
            install_start_date: o.installation_date || null,
            system_size_kw: o.system_power || 0,
            is_active: true,
          });
        } catch (_) {}
      }

      try {
        await supabase.from('project_tracking').insert({
          client_id: fullClient.id,
          opportunity_id: o.id,
          user_id: currentUserId,
          phase: 'venda_confirmada',
          phase_label: 'Venda Confirmada & Contrato',
          started_at: new Date().toISOString(),
          is_current: true,
          notes: `Venda concluída no CRM (${o.system_power || 0} kWp). Início do processo de engenharia.`
        });
      } catch (trkErr) {
        console.warn('Erro ao criar tracking de engenharia:', trkErr);
      }

      if (contractAmount > 0) {
        try {
          await supabase.from('financial_transactions').insert({
            description: `Venda Solar — ${fullClient.name}`,
            type: 'receita',
            category: (o.system_power && o.system_power > 10) ? 'instalacao_comercial' : 'instalacao_residencial',
            amount: contractAmount,
            date: new Date().toISOString().split('T')[0],
            status: 'pago',
            opportunity_id: o.id,
            user_id: currentUserId,
            note: `Fechamento no CRM (${o.system_power || 0} kWp). Cidade: ${o.city || 'N/A'}`
          });
        } catch (finErr) {
          console.warn('Erro ao criar receita no financeiro:', finErr);
        }
      }
    }

    return fullClient;
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
