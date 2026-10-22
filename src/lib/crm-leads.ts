import { useLive } from "./live";
import type { ConnectionType } from "./pricing";
import { supabase } from "./supabaseClient";
import { SAMPLE_CLIENTS } from "../hooks/useClients";

/** Cliente do CRM (tabela `client_portal_users` ou `opportunities`) no formato usado pelos editores de orçamento. */
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
  isClient?: boolean;
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
    id: String(o.id),
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
    tariff: num(o.tariff) || 1.10,
    connection_type: connection(o.connection_type) || "bi",
    roof_type: o.roof_type ?? "Telhado cerâmico",
    segment: o.segment ?? "residencial",
    services: Array.isArray(o.services) ? o.services : ["solar"],
    isClient: false,
  };
}

export function mapClientUser(c: Record<string, any>): CrmLead {
  const kwh = num(c.monthly_avg_kwh) || (num(c.system_size_kw) ? Math.round(Number(c.system_size_kw) * 135) : null);
  const avgBill = kwh ? Math.round(kwh * 1.10) : num(c.avg_bill) || null;
  const kw = Number(c.system_size_kw) || 0;
  return {
    id: String(c.id),
    name: c.name || "Cliente sem nome",
    phone: c.phone ?? null,
    email: c.email ?? null,
    city: c.city || "Maceió",
    state: c.state || "AL",
    address: c.address ?? null,
    document: c.cpf ?? null,
    status: c.is_active ? "Cliente Ativo" : "Cliente",
    amount: 0,
    avg_bill: avgBill,
    consumption_kwh: kwh,
    tariff: 1.10,
    connection_type: kw > 10 ? "tri" : "bi",
    roof_type: "Telhado cerâmico",
    segment: kw > 15 ? "comercial" : "residencial",
    services: ["solar"],
    isClient: true,
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
    status: "Cliente Ativo",
    amount: 25000,
    avg_bill: 980,
    consumption_kwh: 890,
    tariff: 1.10,
    connection_type: "bi",
    roof_type: "Telhado cerâmico",
    segment: "comercial",
    services: ["solar"],
    isClient: true,
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
    status: "Cliente Ativo",
    amount: 35000,
    avg_bill: 1100,
    consumption_kwh: 980,
    tariff: 1.10,
    connection_type: "tri",
    roof_type: "Telhado cerâmico",
    segment: "residencial",
    services: ["solar"],
    isClient: true,
  },
];

export function saveQuickLead(lead: CrmLead) {
  try {
    const raw = localStorage.getItem("quark_leads");
    const list: any[] = raw ? JSON.parse(raw) : [];
    const exists = list.some((x: any) => x.id === lead.id || (x.name && x.name.toLowerCase() === lead.name.toLowerCase()));
    if (!exists) {
      list.unshift(lead);
      localStorage.setItem("quark_leads", JSON.stringify(list));
    }
  } catch (_) {}
}

export function getLocalLeadById(id: string | null | undefined): CrmLead | null {
  if (!id) return null;
  try {
    // 1. Busca em quark_leads
    const rawLeads = localStorage.getItem("quark_leads");
    if (rawLeads) {
      const parsed: any[] = JSON.parse(rawLeads);
      const found = parsed.find(l => l.id === id);
      if (found) return found;
    }
    // 2. Busca em quark_clients_cache
    const rawClients = localStorage.getItem("quark_clients_cache");
    if (rawClients) {
      const parsed: any[] = JSON.parse(rawClients);
      const found = parsed.find(c => c.id === id);
      if (found) return mapClientUser(found);
    }
    // 3. Busca em quark_opportunities
    const rawOpps = localStorage.getItem("quark_opportunities");
    if (rawOpps) {
      const parsed: any[] = JSON.parse(rawOpps);
      const found = parsed.find((o: any) => o.id === id);
      if (found) return mapOpportunity(found);
    }
    // 4. Busca em SAMPLE_CLIENTS
    const foundSample = SAMPLE_CLIENTS.find(s => s.id === id);
    if (foundSample) return mapClientUser(foundSample);
    // 5. Busca em FALLBACK_LEADS
    const foundFallback = FALLBACK_LEADS.find(f => f.id === id);
    if (foundFallback) return foundFallback;
  } catch (_) {}
  return null;
}

export function useCrmLeads() {
  return useLive(
    async () => {
      let clientsData: any[] = [];
      let oppsData: any[] = [];

      try {
        const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000));
        const [clientsRes, oppsRes] = await Promise.race([
          Promise.allSettled([
            supabase.from("client_portal_users").select("*").is("deleted_at", null).order("name", { ascending: true }).limit(1000),
            supabase.from("opportunities").select("*").order("created_at", { ascending: false }).limit(1000)
          ]),
          timeoutPromise
        ]);

        if (clientsRes.status === "fulfilled" && clientsRes.value.data && clientsRes.value.data.length > 0) {
          clientsData = clientsRes.value.data;
        }

        if (oppsRes.status === "fulfilled" && oppsRes.value.data && oppsRes.value.data.length > 0) {
          oppsData = oppsRes.value.data;
        }
      } catch (e) {
        // Continua com fallbacks locais
      }

      // Se clientes remotos vazios, tenta buscar do backend
      if (clientsData.length === 0) {
        try {
          const res = await fetch('/api/clients');
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.clients)) {
              clientsData = json.clients.filter((c: any) => !c.deleted_at);
            }
          }
        } catch (_) {}
      }

      // Cache local de clientes do portal
      let localClients: any[] = [];
      try {
        const cached = localStorage.getItem("quark_clients_cache");
        if (cached) localClients = JSON.parse(cached);
      } catch (_) {}

      // Cache local de oportunidades
      let localOpps: any[] = [];
      try {
        const cached = localStorage.getItem("quark_opportunities");
        if (cached) localOpps = JSON.parse(cached);
      } catch (_) {}

      // Fallback para API de oportunidades do backend
      if (oppsData.length === 0 && localOpps.length === 0) {
        try {
          const res = await fetch('/api/opportunities');
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.opportunities)) {
              localOpps = json.opportunities;
            }
          }
        } catch (_) {}
      }

      // Montagem do mapa unificado com desduplicação inteligente
      const leadsMap = new Map<string, CrmLead>();
      const seenKeys = new Set<string>();

      const addUnique = (lead: CrmLead) => {
        if (!lead || !lead.name) return;
        const normName = lead.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        const normDoc = lead.document ? lead.document.replace(/\D/g, "") : "";
        const key = (normDoc && normDoc.length >= 11) ? normDoc : normName;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        leadsMap.set(lead.id, lead);
      };

      // 1. Clientes reais remotos (client_portal_users)
      for (const c of clientsData) {
        if (!c.name || c.deleted_at) continue;
        addUnique(mapClientUser(c));
      }

      // 2. Clientes do cache local (SEMPRE preservados)
      for (const c of localClients) {
        if (!c.name || c.deleted_at) continue;
        addUnique(mapClientUser(c));
      }

      // 3. Oportunidades remotas
      for (const o of oppsData) {
        if (!o.title && !o.name) continue;
        addUnique(mapOpportunity(o));
      }

      // 4. Oportunidades locais
      for (const o of localOpps) {
        if (!o.title && !o.name) continue;
        addUnique(mapOpportunity(o));
      }

      // 5. Leads extras gravados no localStorage (quark_leads)
      try {
        const leadsRaw = localStorage.getItem("quark_leads");
        if (leadsRaw) {
          const parsed = JSON.parse(leadsRaw);
          if (Array.isArray(parsed)) {
            for (const l of parsed) {
              const id = String(l.id || l.name);
              if (!leadsMap.has(id)) {
                leadsMap.set(id, {
                  id,
                  name: l.name || l.title || "Sem nome",
                  phone: l.phone || null,
                  email: l.email || null,
                  city: l.city || "Maceió",
                  state: l.state || "AL",
                  address: l.address || null,
                  document: l.cpf_cnpj || l.document || null,
                  status: l.status || "Lead",
                  amount: Number(l.value || l.amount) || 0,
                  avg_bill: l.avg_bill || (l.monthlyConsumption ? l.monthlyConsumption * 0.95 : 650),
                  consumption_kwh: l.monthlyConsumption || l.consumption_kwh || 650,
                  tariff: 1.10,
                  connection_type: "bi",
                  roof_type: "Telhado cerâmico",
                  segment: "residencial",
                  services: ["solar"],
                });
              }
            }
          }
        }
      } catch (_) {}

      // Fallback final caso tudo esteja completamente vazio
      if (leadsMap.size === 0) {
        for (const s of SAMPLE_CLIENTS) {
          const m = mapClientUser(s);
          leadsMap.set(m.id, m);
        }
        for (const f of FALLBACK_LEADS) {
          if (!leadsMap.has(f.id)) leadsMap.set(f.id, f);
        }
      }

      const list = Array.from(leadsMap.values());
      // Ordenação estritamente alfabética A-Z
      list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));
      return list;
    },
    [],
    ["client_portal_users", "opportunities"],
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
