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

export const FALLBACK_LEADS: CrmLead[] = [
  {
    id: "lead_luanda_001",
    name: "Dra. Luanda Vasconcelos",
    phone: "(82) 98888-1122",
    email: "luanda@clinicavasconcelos.med.br",
    city: "Maceió",
    state: "AL",
    address: "Av. Álvaro Otacílio, 3400 - Ponta Verde",
    document: "105.558.774-85",
    status: "Qualificado",
    amount: 25000,
    avg_bill: 980,
    consumption_kwh: 890,
    tariff: 1.10,
    connection_type: "bi",
    roof_type: "Telhado cerâmico",
    segment: "comercial",
    services: ["solar"],
  },
  {
    id: "lead_silva_001",
    name: "Supermercado Silva",
    phone: "(11) 99999-9999",
    email: "contato@supermercadosilva.com.br",
    city: "Maceió",
    state: "AL",
    address: "Rua do Comércio, 120",
    document: "12.345.678/0001-90",
    status: "Lead",
    amount: 45000,
    avg_bill: 1450,
    consumption_kwh: 1200,
    tariff: 1.10,
    connection_type: "tri",
    roof_type: "Telhado metálico",
    segment: "comercial",
    services: ["solar"],
  },
  {
    id: "lead_haroldo_001",
    name: "Haroldo Mendonça",
    phone: "(82) 99123-4567",
    email: "haroldo.mendonca@gmail.com",
    city: "Arapiraca",
    state: "AL",
    address: "Rua São Francisco, 45",
    document: "321.654.987-11",
    status: "Qualificado",
    amount: 35000,
    avg_bill: 1100,
    consumption_kwh: 980,
    tariff: 1.10,
    connection_type: "tri",
    roof_type: "Telhado cerâmico",
    segment: "residencial",
    services: ["solar"],
  },
];

export function useCrmLeads() {
  return useLive(
    async () => {
      let opps: any[] = [];
      try {
        const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500));
        const res: any = await Promise.race([
          supabase.from("opportunities").select("*").order("created_at", { ascending: false }).limit(1000),
          timeoutPromise
        ]);
        if (res.data && res.data.length > 0) {
          opps = res.data;
          try {
            localStorage.setItem("quark_opportunities", JSON.stringify(opps));
          } catch (_) {}
        }
      } catch (e) {
        // Fallback local
      }

      // Fallback 1: cache local de oportunidades
      if (opps.length === 0) {
        try {
          const cached = localStorage.getItem("quark_opportunities");
          if (cached) opps = JSON.parse(cached);
        } catch (_) {}
      }

      // Fallback 2: cache local de leads
      if (opps.length === 0) {
        try {
          const leadsRaw = localStorage.getItem("quark_leads");
          if (leadsRaw) {
            const parsed = JSON.parse(leadsRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              opps = parsed.map((l: any) => ({
                id: String(l.id),
                title: l.name || l.title || "Sem título",
                phone: l.phone || "",
                email: l.email || "",
                city: l.city || "Maceió",
                status: l.status || "Lead",
                amount: l.value || l.amount || 25000,
                avg_bill: l.avg_bill || (l.monthlyConsumption ? l.monthlyConsumption * 0.95 : 650),
                consumption_kwh: l.monthlyConsumption || l.consumption_kwh || 650,
              }));
            }
          }
        } catch (_) {}
      }

      const mapped = opps.map(mapOpportunity);
      return mapped.length > 0 ? mapped : FALLBACK_LEADS;
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
