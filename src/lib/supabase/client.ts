import { supabase as _supabase } from "../../lib/supabaseClient";
import type { Proposal } from "../types";

export interface StoredProposal extends Proposal {
  deleted_at?: string | null;
  client_name?: string | null;
  city?: string | null;
  phone?: string | null;
}

export const INITIAL_PROPOSALS: StoredProposal[] = [];

const MOCK_PROPOSAL_NUMBERS = new Set([4202, 4203, 4204, 4205, 4206, 4207, 4208, 4209, 4210, 4211, 4212]);

export function filterRealProposals(list: any[]): StoredProposal[] {
  if (!Array.isArray(list)) return [];
  return list.filter(p => {
    if (!p || !p.id || p.deleted_at) return false;
    const num = Number(p.number);
    if (MOCK_PROPOSAL_NUMBERS.has(num)) return false;
    const name = `${p.client_name || ''} ${p.lead?.name || ''} ${p.title || ''}`.toLowerCase();
    if (name.includes('haroldo mendonça') || name.includes('santo antônio de pádua') || name.includes('samuel vasconcelos - sítio')) {
      return false;
    }
    return true;
  });
}

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
      const real = filterRealProposals(parsed);
      // Atualiza o cache local expurgando dados fictícios legados
      if (real.length !== parsed.length) {
        localStorage.setItem("quark_proposals_cache", JSON.stringify(real));
      }
      return real;
    }
  } catch (_) {}
  return [];
}

function saveStoredProposals(list: StoredProposal[]) {
  try {
    const clean = filterRealProposals(list);
    localStorage.setItem("quark_proposals_cache", JSON.stringify(clean));
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
    // 1. Tenta buscar da API Backend /api/proposals (persistência garantida no servidor)
    try {
      const res = await fetch("/api/proposals", { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.proposals) && json.proposals.length > 0) {
          saveStoredProposals(json.proposals);
          let list = [...json.proposals];
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
          if (this.limitCount) list = list.slice(0, this.limitCount);
          return { data: list, error: null };
        }
      }
    } catch (_) {}

    // 2. Tenta buscar do Supabase com timeout seguro
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

    // 3. Fallback para cache local / orçamentos simulados
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
      let nextNumber = 42;
      if (list.length > 0) {
        const validNumbers = list.map(p => Number(p.number) || 0).filter(n => n < 1000);
        const maxNum = validNumbers.length > 0 ? Math.max(...validNumbers) : 41;
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

      // Tenta persistir no Supabase com payload sanitizado compatível com o schema
      try {
        const isUuid = (val?: string | null) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        const dbRow: Record<string, any> = {
          client_name: this.payload.client_name || this.payload.lead?.name || "Cliente",
          city: this.payload.city || this.payload.lead?.city || null,
          phone: this.payload.phone || this.payload.lead?.phone || null,
          system_size_kw: Number(this.payload.power_kwp) || 0,
          final_price: Number(this.payload.final_price) || 0,
          status: this.payload.status === "enviada" ? "sent" : this.payload.status === "ganho" ? "approved" : "draft",
          data: {
            inputs: this.payload.inputs,
            power_kwp: this.payload.power_kwp,
            monthly_generation: this.payload.monthly_generation,
            direct_cost: this.payload.direct_cost,
            commission_value: this.payload.commission_value,
            tax_value: this.payload.tax_value,
            profit_value: this.payload.profit_value,
            valid_until: this.payload.valid_until,
            title: this.payload.title,
            number: newProp.number,
            public_token: newProp.public_token,
            lead: newProp.lead,
          }
        };
        if (isUuid(this.payload.id)) dbRow.id = this.payload.id;
        if (isUuid(this.payload.user_id)) dbRow.user_id = this.payload.user_id;
        if (this.payload.lead_id) dbRow.lead_id = this.payload.lead_id;

        const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500));
        await Promise.race([_supabase.from("proposals").insert(dbRow), timeoutPromise]);
      } catch (_) {}

      // Sincroniza com o servidor backend
      try {
        fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProp),
        }).catch(() => {});
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

      // Sincroniza com o servidor backend
      try {
        const itemToSync = target || this.payload;
        if (itemToSync) {
          fetch("/api/proposals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemToSync),
          }).catch(() => {});
        }
      } catch (_) {}

      // Tenta persistir no Supabase com payload sanitizado
      try {
        const isUuid = (val?: string | null) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        const idFilter = this.filters.find(f => f.field === "id")?.value;
        if (isUuid(idFilter)) {
          const dbUpdate: Record<string, any> = {};
          if (this.payload.client_name || this.payload.lead?.name) dbUpdate.client_name = this.payload.client_name || this.payload.lead?.name;
          if (this.payload.city !== undefined) dbUpdate.city = this.payload.city;
          if (this.payload.phone !== undefined) dbUpdate.phone = this.payload.phone;
          if (this.payload.power_kwp !== undefined) dbUpdate.system_size_kw = Number(this.payload.power_kwp) || 0;
          if (this.payload.final_price !== undefined) dbUpdate.final_price = Number(this.payload.final_price) || 0;
          if (this.payload.status !== undefined) dbUpdate.status = this.payload.status === "enviada" ? "sent" : this.payload.status === "ganho" ? "approved" : "draft";
          dbUpdate.data = {
            inputs: this.payload.inputs,
            power_kwp: this.payload.power_kwp,
            monthly_generation: this.payload.monthly_generation,
            direct_cost: this.payload.direct_cost,
            commission_value: this.payload.commission_value,
            tax_value: this.payload.tax_value,
            profit_value: this.payload.profit_value,
            valid_until: this.payload.valid_until,
            title: this.payload.title,
            lead: this.payload.lead,
          };
          let q = _supabase.from("proposals").update(dbUpdate).eq("id", idFilter);
          const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500));
          await Promise.race([q, timeoutPromise]);
        }
      } catch (_) {}

      saveStoredProposals(updated);
      return { data: target || this.payload, error: null };
    }

    if (this.mode === "delete") {
      const idFilter = this.filters.find(f => f.field === "id")?.value;
      const updated = list.filter(item => !idFilter || item.id !== idFilter);
      saveStoredProposals(updated);
      try {
        if (idFilter) {
          fetch(`/api/proposals/${idFilter}`, { method: "DELETE" }).catch(() => {});
        }
      } catch (_) {}
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
            const pToken = params?.p_token;

            // 1. Tenta cache local primeiro (0ms)
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
                  lead: found.lead || { name: found.client_name || "Cliente Quark", city: found.city || "Maceió - AL", state: "AL", address: null },
                  seller: { name: "Arthur Duda", email: "arthurmoraesp12@gmail.com", phone: "(82) 99424-1835" },
                  settings: {},
                },
                error: null,
              };
            }

            // 2. Tenta servidor backend /api/proposals/:token (garante funcionamento para links compartilhados)
            try {
              const res = await fetch(`/api/proposals/${pToken}`);
              if (res.ok) {
                const json = await res.json();
                if (json.success && json.proposal) {
                  return {
                    data: {
                      proposal: json.proposal,
                      lead: json.lead,
                      seller: json.seller,
                      settings: json.settings || {},
                    },
                    error: null,
                  };
                }
              }
            } catch (_) {}

            // 3. Tenta Supabase RPC com timeout de 1500ms
            try {
              const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500));
              const res = await Promise.race([(target.rpc as any)(fnName, params), timeoutPromise]);
              if (res?.data) return res;
            } catch (_) {}
          }

          if (fnName === "accept_public_proposal") {
            const pToken = params?.p_token;
            const pName = params?.p_name;
            const now = new Date().toISOString();

            // 1. Atualiza no cache local
            const list = getStoredProposals();
            let targetItem: any = null;
            const updated = list.map(item => {
              if (item.public_token === pToken || item.id === pToken) {
                targetItem = { ...item, status: "aceita", accepted_at: now, accepted_by: pName, updated_at: now };
                return targetItem;
              }
              return item;
            });

            if (targetItem) {
              saveStoredProposals(updated);
              // Sincroniza com o servidor backend
              try {
                fetch("/api/proposals", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(targetItem),
                }).catch(() => {});
              } catch (_) {}
            }

            // 2. Tenta no Supabase RPC remoto com timeout seguro
            try {
              const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500));
              const res = await Promise.race([(target.rpc as any)(fnName, params), timeoutPromise]);
              if (res?.data) return res;
            } catch (_) {}

            return { data: { ok: true, accepted_at: now }, error: null };
          }
          return (target.rpc as any)(fnName, params);
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
};
