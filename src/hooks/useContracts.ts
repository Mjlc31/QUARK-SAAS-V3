import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ContratoData, DocStatus } from '../lib/documents';

export interface DocumentSigner {
  id: string;
  document_id: string;
  role: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  position: number;
  token: string;
  viewed_at?: string | null;
  signed_at?: string | null;
  signed_name?: string | null;
  signature?: string | null;
}

export interface ContractRow {
  id: string;
  kind: 'contrato' | 'procuracao' | 'aluguel';
  title: string;
  lead_id?: string | null;
  data: ContratoData;
  status: DocStatus;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  signers?: DocumentSigner[];
  lead?: { id: string; name: string } | null;
}

const CACHE_KEY = 'quark_contracts_cache';

const withTimeout = <T,>(p: Promise<T>, ms = 8000): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export function useContracts(filterKind: string = 'contrato') {
  return useQuery({
    queryKey: ['contracts', filterKind],
    initialData: () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const list: ContractRow[] = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) {
            return list.filter((c) => c.kind === filterKind);
          }
        }
      } catch (_) {}
      return undefined;
    },
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const queryPromise = supabase
          .from('documents')
          .select('*, signers:document_signers(*)')
          .eq('kind', filterKind)
          .order('updated_at', { ascending: false });

        const res = await withTimeout(queryPromise as any, 8000).catch(() => ({ data: null, error: true }));
        const { data, error } = res as any;

        if (error || !data) {
          throw new Error('Supabase offline');
        }

        const rows: ContractRow[] = (data || []).map((d: any) => ({
          id: d.id,
          kind: d.kind,
          title: d.title,
          lead_id: d.lead_id,
          data: d.data as ContratoData,
          status: d.status as DocStatus,
          completed_at: d.completed_at,
          created_at: d.created_at,
          updated_at: d.updated_at,
          signers: d.signers || [],
          lead: d.lead || null,
        }));

        const cached = localStorage.getItem(CACHE_KEY);
        let localUnsynced: ContractRow[] = [];
        if (cached) {
          try {
            const list: ContractRow[] = JSON.parse(cached);
            localUnsynced = list.filter((c) => c.id.startsWith('doc_') && !rows.some((r) => r.id === c.id));
          } catch (_) {}
        }
        const merged = [...localUnsynced, ...rows];
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
        return merged;
      } catch (e) {
        console.warn('[useContracts] Falha ao consultar Supabase, usando cache local:', e);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const list: ContractRow[] = JSON.parse(cached);
            return list.filter((c) => c.kind === filterKind);
          } catch (_) {}
        }
        return [];
      }
    },
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      lead_id?: string | null;
      data: ContratoData;
      signers?: { name: string; role: string; phone?: string; email?: string; cpf?: string }[];
    }) => {
      let newDoc: any = null;

      try {
        const userAuthRes = await withTimeout(supabase.auth.getUser() as any).catch(() => ({ data: { user: null } }));
        const userAuth = (userAuthRes as any)?.data;

        const docInsert = {
          kind: 'contrato',
          title: payload.title,
          lead_id: payload.lead_id || null,
          opportunity_id: payload.lead_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.lead_id) ? payload.lead_id : null,
          data: payload.data,
          status: 'enviado',
          created_by: userAuth?.user?.id || null,
          user_id: userAuth?.user?.id || '7dacc88f-9ebd-4710-a1be-0647841db24a',
        };

        const insertRes = await withTimeout(
          supabase
            .from('documents')
            .insert(docInsert)
            .select()
            .single() as any
        ).catch(() => ({ data: null, error: true }));

        newDoc = (insertRes as any)?.data;
      } catch (err) {
        console.warn('[useCreateContract] Supabase timeout, falling back to local:', err);
      }

      if (!newDoc) {
        console.warn('[useCreateContract] Supabase indisponível, gerando contrato localmente');
        const mockSigners: DocumentSigner[] = (payload.signers || [
          { name: payload.data.contractor.repName, role: 'contratada', cpf: payload.data.contractor.repDoc },
          { name: payload.data.client.name, role: 'contratante', phone: payload.data.client.phone, cpf: payload.data.client.doc },
        ]).map((s, idx) => ({
          id: `sgn_${Date.now()}_${idx}`,
          document_id: `doc_${Date.now()}`,
          role: s.role,
          name: s.name,
          phone: s.phone || null,
          email: s.email || null,
          cpf: s.cpf || null,
          position: idx,
          token: `tok_${Math.random().toString(36).substring(2, 12)}`,
          signed_at: s.role === 'contratada' ? new Date().toISOString() : null,
          signature: s.role === 'contratada' ? payload.data.contractorSignature || '/brand/assinatura.png' : null,
          signed_name: s.role === 'contratada' ? s.name : null,
        }));

        const localDoc: ContractRow = {
          id: `doc_${Date.now()}`,
          kind: 'contrato',
          title: payload.title,
          lead_id: payload.lead_id || null,
          data: payload.data,
          status: 'enviado',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          signers: mockSigners,
        };

        const cached = localStorage.getItem(CACHE_KEY);
        const list = cached ? JSON.parse(cached) : [];
        list.unshift(localDoc);
        localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        return localDoc;
      }

      // Inserir Signatários
      const signersToInsert = (payload.signers || [
        { name: payload.data.contractor.repName, role: 'contratada', cpf: payload.data.contractor.repDoc },
        { name: payload.data.client.name, role: 'contratante', phone: payload.data.client.phone, cpf: payload.data.client.doc },
      ]).map((s, idx) => ({
        document_id: newDoc.id,
        role: s.role,
        name: s.name,
        phone: s.phone || null,
        email: s.email || null,
        cpf: s.cpf || null,
        position: idx,
        signed_at: s.role === 'contratada' ? new Date().toISOString() : null,
        signature: s.role === 'contratada' ? payload.data.contractorSignature || '/brand/assinatura.png' : null,
        signed_name: s.role === 'contratada' ? s.name : null,
      }));

      const { data: createdSigners } = await supabase
        .from('document_signers')
        .insert(signersToInsert)
        .select();

      return {
        ...newDoc,
        signers: createdSigners || [],
      } as ContractRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useUpdateContractStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DocStatus }) => {
      const { error } = await supabase
        .from('documents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.warn('[useUpdateContractStatus] Fallback local:', error.message);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const list = JSON.parse(cached).map((c: any) =>
            c.id === id ? { ...c, status, updated_at: new Date().toISOString() } : c
          );
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        }
      }
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) {
        console.warn('[useDeleteContract] Erro ao deletar no Supabase, removendo local:', error.message);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const list = JSON.parse(cached).filter((c: any) => c.id !== id);
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        }
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}
