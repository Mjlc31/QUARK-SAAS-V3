import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ReceiptData, ReceiptRow } from '../lib/receipt';

export function useReceipts() {
  return useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      const local = localStorage.getItem('quark_receipts_cache');
      let localList: ReceiptRow[] = [];
      if (local) {
        try {
          localList = JSON.parse(local);
        } catch {}
      }

      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[useReceipts] Falha ao buscar receipts do Supabase:', error.message);
        return localList;
      }

      const rows: ReceiptRow[] = (data || []).map((r: any) => ({
        id: r.id,
        number: Number(r.number),
        payerName: r.payer_name,
        payerDoc: r.payer_doc || '',
        amount: Number(r.amount),
        description: r.description,
        method: r.method || 'PIX',
        installment: r.installment || '',
        paidAt: r.paid_at,
        city: r.city || 'Maceió/AL',
        lead_id: r.lead_id,
        user_id: r.user_id,
        created_at: r.created_at,
      }));

      // Merge local items not in remote
      localList.forEach((item) => {
        if (!rows.some((r) => r.id === item.id)) {
          rows.unshift(item);
        }
      });

      localStorage.setItem('quark_receipts_cache', JSON.stringify(rows));
      return rows;
    },
  });
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReceiptData & { lead_id?: string | null }) => {
      const { data: userAuth } = await supabase.auth.getUser();

      const insertData = {
        payer_name: payload.payerName,
        payer_doc: payload.payerDoc || null,
        amount: payload.amount,
        description: payload.description,
        method: payload.method,
        installment: payload.installment || null,
        paid_at: payload.paidAt,
        city: payload.city,
        lead_id: payload.lead_id || null,
        user_id: userAuth.user?.id || null,
      };

      const { data, error } = await supabase
        .from('receipts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.warn('[useCreateReceipt] Erro ao salvar no Supabase, salvando local:', error.message);
        // Fallback local
        const localReceipt: ReceiptRow = {
          ...payload,
          id: `rc_${Date.now()}`,
          number: payload.number || Math.floor(1000 + Math.random() * 9000),
          created_at: new Date().toISOString(),
        };
        const local = localStorage.getItem('quark_receipts_cache');
        const list = local ? JSON.parse(local) : [];
        list.unshift(localReceipt);
        localStorage.setItem('quark_receipts_cache', JSON.stringify(list));
        return localReceipt;
      }

      return {
        id: data.id,
        number: Number(data.number),
        payerName: data.payer_name,
        payerDoc: data.payer_doc || '',
        amount: Number(data.amount),
        description: data.description,
        method: data.method || 'PIX',
        installment: data.installment || '',
        paidAt: data.paid_at,
        city: data.city || 'Maceió/AL',
        lead_id: data.lead_id,
        user_id: data.user_id,
        created_at: data.created_at,
      } as ReceiptRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

export function useUpdateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ReceiptData> & { id: string; lead_id?: string | null }) => {
      const updateData: any = {};
      if (payload.payerName !== undefined) updateData.payer_name = payload.payerName;
      if (payload.payerDoc !== undefined) updateData.payer_doc = payload.payerDoc || null;
      if (payload.amount !== undefined) updateData.amount = payload.amount;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.method !== undefined) updateData.method = payload.method;
      if (payload.installment !== undefined) updateData.installment = payload.installment || null;
      if (payload.paidAt !== undefined) updateData.paid_at = payload.paidAt;
      if (payload.city !== undefined) updateData.city = payload.city;
      if (payload.lead_id !== undefined) updateData.lead_id = payload.lead_id || null;

      const { data, error } = await supabase
        .from('receipts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('[useUpdateReceipt] Fallback local:', error.message);
        const local = localStorage.getItem('quark_receipts_cache');
        if (local) {
          const list = JSON.parse(local).map((r: any) => (r.id === id ? { ...r, ...payload } : r));
          localStorage.setItem('quark_receipts_cache', JSON.stringify(list));
        }
        return { id, ...payload } as ReceiptRow;
      }

      return {
        id: data.id,
        number: Number(data.number),
        payerName: data.payer_name,
        payerDoc: data.payer_doc || '',
        amount: Number(data.amount),
        description: data.description,
        method: data.method || 'PIX',
        installment: data.installment || '',
        paidAt: data.paid_at,
        city: data.city || 'Maceió/AL',
        lead_id: data.lead_id,
        user_id: data.user_id,
        created_at: data.created_at,
      } as ReceiptRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) {
        console.warn('[useDeleteReceipt] Erro ao deletar no Supabase, removendo local:', error.message);
        const local = localStorage.getItem('quark_receipts_cache');
        if (local) {
          const list = JSON.parse(local).filter((r: any) => r.id !== id);
          localStorage.setItem('quark_receipts_cache', JSON.stringify(list));
        }
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

