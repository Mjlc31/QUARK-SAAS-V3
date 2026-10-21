import { supabase as _supabase } from "../../lib/supabaseClient";
import type { Proposal } from "../types";

export interface StoredProposal extends Proposal {
  deleted_at?: string | null;
}

export const INITIAL_PROPOSALS: StoredProposal[] = [
  {
    id: "prop_luanda_001",
    number: 4210,
    public_token: "tok_luanda_77kwp",
    lead_id: "lead_luanda_001",
    opportunity_id: null,
    title: "Clínica Vasconcelos — Sistema 7.70 kWp",
    status: "aceita",
    inputs: {
      product: "solar",
      validityDays: 10,
      kitPrice: 13500,
      moduleQty: 14,
      modulePowerW: 550,
      moduleBrand: "Canadian Solar",
      inverterBrand: "Deye",
      inverterPowerKw: 8,
      consumptionKwh: 890,
      tariff: 1.10,
      connectionType: "bi",
      structureType: "Telhado cerâmico",
      laborPerModule: 110,
      electricalPerKwp: 120,
      commission: { mode: "percent", value: 5 },
      tax: { mode: "percent", value: 6 },
      profit: { mode: "percent", value: 20 },
      extraCosts: [],
      financingRate: 1.49,
      financingTerms: [12, 24, 36, 48, 60],
      cardRate: 1.99,
      cardTerms: 12,
      discount: 0,
      publicLighting: 25,
      fioBTariff: 0.28,
      selfConsumption: 30,
      generationFactor: 125,
    },
    power_kwp: 7.7,
    monthly_generation: 962,
    direct_cost: 15964,
    commission_value: 1026.12,
    tax_value: 339.41,
    profit_value: 3192.8,
    final_price: 20522.32,
    valid_until: "2026-11-01T00:00:00.000Z",
    sent_at: "2026-10-15T14:30:00.000Z",
    viewed_at: "2026-10-15T16:45:00.000Z",
    view_count: 5,
    accepted_at: "2026-10-20T10:00:00.000Z",
    accepted_by: "Dra. Luanda Vasconcelos",
    created_by: "usr_admin",
    created_at: "2026-10-15T14:00:00.000Z",
    updated_at: "2026-10-20T10:00:00.000Z",
    lead: { id: "lead_luanda_001", name: "Dra. Luanda Vasconcelos", city: "Maceió - AL", phone: "(82) 98888-1122" },
  },
  {
    id: "prop_silva_002",
    number: 4195,
    public_token: "tok_silva_121kwp",
    lead_id: "lead_silva_001",
    opportunity_id: null,
    title: "Supermercado Silva — Cobertura Comercial",
    status: "enviada",
    inputs: {
      product: "solar",
      validityDays: 10,
      kitPrice: 21900,
      moduleQty: 22,
      modulePowerW: 550,
      moduleBrand: "Canadian Solar",
      inverterBrand: "Sungrow",
      inverterPowerKw: 12,
      consumptionKwh: 1200,
      tariff: 1.10,
      connectionType: "tri",
      structureType: "Telhado metálico",
      laborPerModule: 110,
      electricalPerKwp: 120,
      commission: { mode: "percent", value: 5 },
      tax: { mode: "percent", value: 6 },
      profit: { mode: "percent", value: 20 },
      extraCosts: [],
      financingRate: 1.49,
      financingTerms: [24, 36, 48, 60],
      cardRate: 1.99,
      cardTerms: 12,
      discount: 0,
      publicLighting: 50,
      fioBTariff: 0.28,
      selfConsumption: 60,
      generationFactor: 125,
    },
    power_kwp: 12.1,
    monthly_generation: 1512,
    direct_cost: 25772,
    commission_value: 1945,
    tax_value: 650,
    profit_value: 6200,
    final_price: 38900.0,
    valid_until: "2026-10-30T00:00:00.000Z",
    sent_at: "2026-10-18T10:15:00.000Z",
    viewed_at: "2026-10-18T11:00:00.000Z",
    view_count: 3,
    accepted_at: null,
    accepted_by: null,
    created_by: "usr_admin",
    created_at: "2026-10-18T09:30:00.000Z",
    updated_at: "2026-10-18T10:15:00.000Z",
    lead: { id: "lead_silva_001", name: "Supermercado Silva", city: "Maceió - AL", phone: "(11) 99999-9999" },
  },
  {
    id: "prop_haroldo_003",
    number: 4180,
    public_token: "tok_haroldo_55kwp",
    lead_id: "lead_haroldo_001",
    opportunity_id: null,
    title: "Residência Haroldo Mendonça — Telhado Principal",
    status: "visualizada",
    inputs: {
      product: "solar",
      validityDays: 10,
      kitPrice: 9800,
      moduleQty: 10,
      modulePowerW: 550,
      moduleBrand: "Jinko Solar",
      inverterBrand: "Growatt",
      inverterPowerKw: 5,
      consumptionKwh: 650,
      tariff: 1.10,
      connectionType: "bi",
      structureType: "Telhado cerâmico",
      laborPerModule: 110,
      electricalPerKwp: 120,
      commission: { mode: "percent", value: 5 },
      tax: { mode: "percent", value: 6 },
      profit: { mode: "percent", value: 20 },
      extraCosts: [],
      financingRate: 1.49,
      financingTerms: [12, 24, 36],
      cardRate: 1.99,
      cardTerms: 12,
      discount: 0,
      publicLighting: 25,
      fioBTariff: 0.28,
      selfConsumption: 30,
      generationFactor: 125,
    },
    power_kwp: 5.5,
    monthly_generation: 687,
    direct_cost: 11560,
    commission_value: 822.5,
    tax_value: 280,
    profit_value: 2450,
    final_price: 16450.0,
    valid_until: "2026-10-28T00:00:00.000Z",
    sent_at: "2026-10-17T15:00:00.000Z",
    viewed_at: "2026-10-17T16:20:00.000Z",
    view_count: 2,
    accepted_at: null,
    accepted_by: null,
    created_by: "usr_admin",
    created_at: "2026-10-17T14:00:00.000Z",
    updated_at: "2026-10-17T15:00:00.000Z",
    lead: { id: "lead_haroldo_001", name: "Haroldo Mendonça", city: "Arapiraca - AL", phone: "(82) 99123-4567" },
  },
  {
    id: "prop_save_004",
    number: 4165,
    public_token: "tok_save_7kw",
    lead_id: "lead_luanda_001",
    opportunity_id: null,
    title: "Carregador Veicular Wallbox 7.4 kW",
    status: "rascunho",
    inputs: {
      product: "save",
      validityDays: 10,
      chargerPowerKw: 7.4,
      distanceM: 15,
      cableGaugeMm: 6,
      wallboxPrice: 4200,
      laborPrice: 1200,
      materialsPrice: 450,
      commission: { mode: "percent", value: 5 },
      tax: { mode: "percent", value: 6 },
      profit: { mode: "percent", value: 20 },
      extraCosts: [],
      financingRate: 1.49,
      financingTerms: [12, 18],
      cardRate: 1.99,
      cardTerms: 12,
      discount: 0,
    },
    power_kwp: 7.4,
    monthly_generation: 0,
    direct_cost: 5850,
    commission_value: 410,
    tax_value: 150,
    profit_value: 1200,
    final_price: 8200.0,
    valid_until: "2026-10-29T00:00:00.000Z",
    sent_at: null,
    viewed_at: null,
    view_count: 0,
    accepted_at: null,
    accepted_by: null,
    created_by: "usr_admin",
    created_at: "2026-10-19T11:00:00.000Z",
    updated_at: "2026-10-19T11:00:00.000Z",
    lead: { id: "lead_luanda_001", name: "Dra. Luanda Vasconcelos", city: "Maceió - AL", phone: "(82) 98888-1122" },
  }
];

function resolveLeadForProposal(leadId?: string | null): any {
  if (!leadId) return null;
  try {
    const rawClients = localStorage.getItem("quark_clients_cache");
    if (rawClients) {
      const parsed: any[] = JSON.parse(rawClients);
      const c = parsed.find(x => x.id === leadId);
      if (c) return { id: c.id, name: c.name, city: c.city || "Maceió - AL", phone: c.phone || null };
    }
    const rawLeads = localStorage.getItem("quark_leads");
    if (rawLeads) {
      const parsed: any[] = JSON.parse(rawLeads);
      const l = parsed.find(x => x.id === leadId);
      if (l) return { id: l.id, name: l.name, city: l.city || "Maceió - AL", phone: l.phone || null };
    }
    const rawOpps = localStorage.getItem("quark_opportunities");
    if (rawOpps) {
      const parsed: any[] = JSON.parse(rawOpps);
      const o = parsed.find(x => x.id === leadId);
      if (o) return { id: o.id, name: o.title || o.name, city: o.city || "Maceió - AL", phone: o.phone || null };
    }
  } catch (_) {}
  return null;
}

function getStoredProposals(): StoredProposal[] {
  try {
    const raw = localStorage.getItem("quark_proposals_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  // Salva os iniciais se o cache estiver vazio
  try {
    localStorage.setItem("quark_proposals_cache", JSON.stringify(INITIAL_PROPOSALS));
  } catch (_) {}
  return INITIAL_PROPOSALS;
}

function saveStoredProposals(list: StoredProposal[]) {
  try {
    localStorage.setItem("quark_proposals_cache", JSON.stringify(list));
  } catch (_) {}
}

class ProposalQueryBuilder {
  private filters: { field: string; op: string; value: any }[] = [];
  private orderField?: string;
  private orderAscending?: boolean;
  private limitCount?: number;

  select(_columns = "*") {
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = opts?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: "eq", value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ field, op: "in", value: values });
    return this;
  }

  private filterList(list: StoredProposal[]) {
    return list.filter((item: any) => {
      for (const f of this.filters) {
        if (f.op === "eq" && item[f.field] !== f.value) return false;
        if (f.op === "in" && Array.isArray(f.value) && !f.value.includes(item[f.field])) return false;
      }
      return true;
    });
  }

  async maybeSingle() {
    const res = await this.execute();
    const data = res.data?.[0] ?? null;
    return { data, error: null };
  }

  async single() {
    const res = await this.execute();
    const data = res.data?.[0] ?? null;
    return { data, error: data ? null : { message: "Registro não encontrado" } };
  }

  then(onfulfilled?: (value: { data: any; error: any }) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: StoredProposal[]; error: any }> {
    // 1. Tenta buscar do Supabase com timeout seguro
    try {
      let query = _supabase.from("proposals").select("*");
      for (const f of this.filters) {
        if (f.op === "eq") query = query.eq(f.field, f.value);
        if (f.op === "in") query = query.in(f.field, f.value);
      }
      if (this.orderField) query = query.order(this.orderField, { ascending: this.orderAscending });
      if (this.limitCount) query = query.limit(this.limitCount);

      const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500));
      const res: any = await Promise.race([query, timeoutPromise]);
      if (res?.data && res.data.length > 0) {
        return { data: res.data, error: null };
      }
    } catch (_) {}

    // 2. Fallback para cache local / orçamentos simulados
    let list = getStoredProposals();
    list = this.filterList(list);

    if (this.orderField) {
      const field = this.orderField;
      const asc = this.orderAscending;
      list.sort((a: any, b: any) => {
        if (a[field] < b[field]) return asc ? -1 : 1;
        if (a[field] > b[field]) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount) {
      list = list.slice(0, this.limitCount);
    }

    return { data: list, error: null };
  }
}

class ProposalMutationBuilder {
  constructor(private mode: "insert" | "update" | "delete", private payload?: any) {}

  private filters: { field: string; value: any }[] = [];

  eq(field: string, value: any) {
    this.filters.push({ field, value });
    return this;
  }

  select(_cols?: string) {
    return this;
  }

  async single() {
    const res = await this.execute();
    return { data: res.data, error: res.error };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: any; error: any }> {
    const list = getStoredProposals();

    if (this.mode === "insert") {
      let nextNumber = 4220;
      if (list.length > 0) {
        const maxNum = Math.max(...list.map(p => Number(p.number) || 0));
        nextNumber = maxNum + 1;
      }
      const newProp: StoredProposal = {
        id: this.payload.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        number: this.payload.number || nextNumber,
        public_token: this.payload.public_token || `tok_${Math.random().toString(36).substring(2, 12)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: this.payload.status || "rascunho",
        view_count: 0,
        lead_id: this.payload.lead_id || "lead_001",
        title: this.payload.title || null,
        inputs: this.payload.inputs || {},
        power_kwp: Number(this.payload.power_kwp) || 0,
        monthly_generation: Number(this.payload.monthly_generation) || 0,
        direct_cost: Number(this.payload.direct_cost) || 0,
        commission_value: Number(this.payload.commission_value) || 0,
        tax_value: Number(this.payload.tax_value) || 0,
        profit_value: Number(this.payload.profit_value) || 0,
        final_price: Number(this.payload.final_price) || 0,
        valid_until: this.payload.valid_until || null,
        sent_at: this.payload.sent_at || null,
        viewed_at: this.payload.viewed_at || null,
        accepted_at: this.payload.accepted_at || null,
        accepted_by: this.payload.accepted_by || null,
        created_by: this.payload.created_by || "usr_admin",
        ...this.payload,
        lead: this.payload.lead || resolveLeadForProposal(this.payload.lead_id) || { id: this.payload.lead_id, name: "Cliente Quark", city: "Maceió - AL" },
      };

      // Tenta persistir no Supabase
      try {
        const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500));
        await Promise.race([_supabase.from("proposals").insert(this.payload), timeoutPromise]);
      } catch (_) {}

      const updated = [newProp, ...list];
      saveStoredProposals(updated);
      return { data: newProp, error: null };
    }

    if (this.mode === "update") {
      const idFilter = this.filters.find(f => f.field === "id")?.value;
      let target: StoredProposal | null = null;
      const updated: StoredProposal[] = list.map(item => {
        if (!idFilter || item.id === idFilter) {
          const updatedItem = { ...item, ...this.payload, updated_at: new Date().toISOString() };
          target = updatedItem;
          return updatedItem;
        }
        return item;
      });

      // Tenta persistir no Supabase
      try {
        let q = _supabase.from("proposals").update(this.payload);
        for (const f of this.filters) q = q.eq(f.field, f.value);
        const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500));
        await Promise.race([q, timeoutPromise]);
      } catch (_) {}

      saveStoredProposals(updated);
      return { data: target || this.payload, error: null };
    }

    if (this.mode === "delete") {
      const idFilter = this.filters.find(f => f.field === "id")?.value;
      const updated = list.filter(item => !idFilter || item.id !== idFilter);
      saveStoredProposals(updated);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }
}

export const supabase = () => {
  return new Proxy(_supabase, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) => {
          if (table === "proposals") {
            return {
              select: (cols?: string) => new ProposalQueryBuilder().select(cols),
              insert: (payload: any) => new ProposalMutationBuilder("insert", payload),
              update: (payload: any) => new ProposalMutationBuilder("update", payload),
              delete: () => new ProposalMutationBuilder("delete"),
            };
          }
          return target.from(table as any);
        };
      }

      if (prop === "rpc") {
        return async (fnName: string, params: any) => {
          if (fnName === "get_public_proposal") {
            try {
              const res = await (target.rpc as any)(fnName, params);
              if (res.data) return res;
            } catch (_) {}

            const pToken = params?.p_token;
            const list = getStoredProposals();
            const found = list.find(p => p.public_token === pToken || p.id === pToken);
            if (found) {
              return {
                data: {
                  proposal: {
                    id: found.id,
                    number: found.number,
                    title: found.title,
                    status: found.status,
                    inputs: found.inputs,
                    final_price: found.final_price,
                    power_kwp: found.power_kwp,
                    valid_until: found.valid_until,
                    created_at: found.created_at,
                    accepted_at: found.accepted_at || null,
                    accepted_by: found.accepted_by || null,
                  },
                  lead: found.lead || { name: "Cliente Quark", city: "Maceió", state: "AL", address: null },
                  seller: { name: "Arthur Duda", email: "arthurmoraesp12@gmail.com", phone: "(82) 99424-1835" },
                  settings: {},
                },
                error: null,
              };
            }
          }
          return (target.rpc as any)(fnName, params);
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
};
