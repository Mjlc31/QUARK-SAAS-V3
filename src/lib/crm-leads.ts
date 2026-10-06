import { useLive } from "./live";
import type { ConnectionType } from "./pricing";
import { supabase } from "./supabaseClient";

/** Cliente do CRM (tabela `opportunities`) no formato usado pelos editores de orçamento. */
export interface CrmLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  document: string | null;
  status: string;
  amount: number;
  avg_bill: number | null;
  consumption_kwh: number | null;
  tariff: number | null;
  connection_type: ConnectionType | null;
  roof_type: string | null;
  segment: string | null;
  services: string[];
}

function connection(v: unknown): ConnectionType | null {
  const s = String(v ?? "").toLowerCase();
  if (s.startsWith("mono")) return "mono";
  if (s.startsWith("bi")) return "bi";
  if (s.startsWith("tri")) return "tri";
  return null;
}

const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) || Number(v) <= 0 ? null : Number(v));

export function mapOpportunity(o: Record<string, any>): CrmLead {
  return {
    id: o.id,
    name: o.title || "Sem nome",
    phone: o.phone ?? null,
    email: o.email ?? null,
    city: o.city ?? null,
    state: o.state ?? null,
    address: o.address ?? null,
    document: o.cpf_cnpj ?? null,
    status: o.status || "Lead",
    amount: Number(o.amount) || 0,
    // Conta de luz e consumo vêm dos campos próprios — nunca do valor do negócio.
    avg_bill: num(o.avg_bill),
    consumption_kwh: num(o.consumption_kwh),
    tariff: num(o.tariff),
    connection_type: connection(o.connection_type),
    roof_type: o.roof_type ?? null,
    segment: o.segment ?? null,
    services: Array.isArray(o.services) ? o.services : [],
  };
}

export function useCrmLeads() {
  return useLive(
    async () => {
      const { data } = await supabase.from("opportunities").select("*").order("created_at", { ascending: false }).limit(1000);
      return (data ?? []).map(mapOpportunity);
    },
    [],
    ["opportunities"],
  );
}

/** Registra um evento na linha do tempo do cliente no CRM. */
export async function logCrmNote(opportunityId: string | null | undefined, note: string) {
  if (!opportunityId) return;
  await supabase
    .from("agent_notes")
    .insert({ entity_type: "opportunity", entity_id: opportunityId, note, created_by_ai: false })
    .then(() => {}, () => {});
}
