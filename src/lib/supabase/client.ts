import { supabase as _supabase, supabaseAnon as _supabaseAnon } from "../../lib/supabaseClient";
import type { Proposal } from "../types";

export interface StoredProposal extends Proposal {
  deleted_at?: string | null;
  client_name?: string | null;
  city?: string | null;
  phone?: string | null;
}

const MOCK_PROPOSAL_NUMBERS = new Set([4202, 4203, 4204, 4205, 4206, 4207, 4208, 4209, 4210]);

export function filterRealProposals(list: any[]): StoredProposal[] {
  if (!Array.isArray(list)) return [];
  return list.filter(p => {
    if (!p || !p.id || p.deleted_at) return false;
    const name = `${p.client_name || ''} ${p.lead?.name || ''} ${p.title || ''}`.toLowerCase();

    // Propostas de clientes reais NUNCA são filtradas
    if (
      name.includes('cassiano') || 
      name.includes('hugo') || 
      name.includes('gabriel conde') || 
      name.includes('conde') || 
      name.includes('flexeiras') || 
      name.includes('simonato') || 
      name.includes('engenharq') ||
      name.includes('charles') ||
      name.includes('antonio nelson') ||
      name.includes('andré') ||
      name.includes('josé dinario') ||
      name.includes('thiago amorim')
    ) {
      return true;
    }

    if (MOCK_PROPOSAL_NUMBERS.has(Number(p.number))) {
      if (name.includes('haroldo') || name.includes('santo antônio') || name.includes('santo antonio') || name.includes('samuel vasconcelos - sítio') || name.includes('supermercado silva')) {
        return false;
      }
    }
    return true;
  });
}

/** Cliente Supabase. Propostas vêm sempre do banco — sem cache local nem JSON do backend. */
export const supabase = () => _supabase;
export const supabaseAnon = () => _supabaseAnon;
