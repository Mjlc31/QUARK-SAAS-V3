"use client";

import { supabase } from "./supabase/client";
import type { Proposal } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Leva o valor do orçamento salvo para a oportunidade no CRM.
 * Se outro orçamento da mesma oportunidade já foi aceito, ele manda no valor e este não sobrescreve.
 */
export async function syncOpportunityAmount(p: Pick<Proposal, "id" | "lead_id" | "status" | "final_price"> & { opportunity_id?: string | null }) {
  const oppId = p.opportunity_id || p.lead_id;
  if (!oppId || !UUID_RE.test(oppId) || !(Number(p.final_price) > 0)) return;
  const sb = supabase();
  if (p.status !== "aceita") {
    const { data: accepted } = await sb.from("proposals").select("*").eq("lead_id", oppId).eq("status", "aceita").limit(1);
    if (accepted?.some((a: any) => a.id !== p.id && !a.deleted_at)) return;
  }
  const { error } = await sb.from("opportunities").update({ amount: Number(p.final_price), updated_at: new Date().toISOString() }).eq("id", oppId);
  if (error) console.warn("[syncOpportunityAmount] CRM não atualizado:", error.message);
}

const LEGACY_CACHE = "quark_proposals_cache";
const RESCUE_FIELDS = ["title", "inputs", "power_kwp", "monthly_generation", "direct_cost", "commission_value", "tax_value", "profit_value", "final_price"] as const;

/**
 * O cliente antigo gravava a edição primeiro no navegador e escondia a falha no banco.
 * Leva para o banco as edições presas nesse cache que são mais novas que o banco; depois apaga o cache.
 */
export async function rescueLocalProposalEdits(): Promise<number> {
  let cached: any[];
  try {
    cached = JSON.parse(localStorage.getItem(LEGACY_CACHE) || "null");
  } catch {
    cached = [];
  }
  if (!Array.isArray(cached)) return 0;
  const sb = supabase();
  const candidates = cached.filter((c) => c && UUID_RE.test(String(c.id)) && c.updated_at && c.inputs);
  let rescued = 0;
  for (const c of candidates) {
    const row: Record<string, unknown> = { system_size_kw: Number(c.power_kwp) || 0 };
    for (const f of RESCUE_FIELDS) if (c[f] !== undefined) row[f] = c[f];
    // Só sobrescreve se o banco for mais antigo que a edição local e o orçamento não estiver aceito/excluído.
    const { data, error } = await sb.from("proposals").update(row).eq("id", c.id).lt("updated_at", c.updated_at)
      .is("deleted_at", null).neq("status", "aceita").select("id, lead_id, opportunity_id, status, final_price");
    if (error) return rescued; // mantém o cache para tentar de novo
    for (const saved of data ?? []) {
      rescued++;
      await syncOpportunityAmount(saved as any);
    }
  }
  localStorage.removeItem(LEGACY_CACHE);
  return rescued;
}

/** Cria uma cópia da proposta como rascunho (novo número e novo link público). */
export async function duplicateProposal(id: string, userId: string): Promise<{ id: string; number: number }> {
  const sb = supabase();
  const validUserId = userId && userId.length === 36 && !userId.includes("offline") ? userId : null;

  // 1. Tenta a procedure nativa e atômica no PostgreSQL (ultra rápida e imune a timeout)
  try {
    const { data: rpcData, error: rpcError } = await sb.rpc("duplicate_proposal", {
      p_proposal_id: id,
      p_user_id: validUserId,
    });
    if (!rpcError && rpcData && typeof rpcData === "object" && "id" in rpcData) {
      return rpcData as { id: string; number: number };
    }
  } catch (rpcEx) {
    console.warn("[duplicateProposal] RPC falhou, tentando fallback direto:", rpcEx);
  }

  // 2. Fallback resiliente
  const { data: p, error } = await sb.from("proposals").select("*").eq("id", id).single();
  if (error || !p) throw new Error(error?.message ?? "Proposta não encontrada");
  const oppId = p.opportunity_id || (p.lead_id && p.lead_id.length === 36 ? p.lead_id : null);
  const targetUserId = validUserId || p.user_id || undefined;

  const { data, error: err } = await sb
    .from("proposals")
    .insert({
      lead_id: p.lead_id,
      opportunity_id: oppId,
      user_id: targetUserId,
      title: p.title ? `${p.title} (cópia)` : "Cópia",
      status: "rascunho",
      inputs: p.inputs,
      blocks: p.blocks,
      theme: p.theme,
      data: p.data,
      power_kwp: p.power_kwp,
      monthly_generation: p.monthly_generation,
      direct_cost: p.direct_cost,
      commission_value: p.commission_value,
      tax_value: p.tax_value,
      profit_value: p.profit_value,
      final_price: p.final_price,
      created_by: targetUserId,
      client_name: p.client_name,
      city: p.city,
      phone: p.phone,
      email: p.email,
      cpf_cnpj: p.cpf_cnpj,
      address: p.address,
      state: p.state,
      roof_type: p.roof_type,
      system_size_kw: p.system_size_kw,
      installation_cost: p.installation_cost,
      version: 1,
    })
    .select("id, number")
    .single();

  if (err || !data) throw new Error(err?.message ?? "Não foi possível duplicar");

  if (oppId) {
    try {
      await sb.from("activities").insert({
        opportunity_id: oppId,
        type: "proposta",
        content: `Orçamento #${data.number} criado a partir do #${p.number}`,
        created_by: targetUserId,
      });
    } catch (actErr) {
      console.warn("[duplicateProposal] Falha ao registrar atividade:", actErr);
    }
  }

  return data as { id: string; number: number };
}

