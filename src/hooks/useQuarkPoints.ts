import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export interface QuarkReward {
  id: string;
  title: string;
  points: number;
  icon: string;
  desc: string;
  value_brl?: number;
}

export interface ClientReferral {
  id: string;
  referrer_client_id: string;
  referred_name: string;
  referred_phone: string;
  referred_city?: string | null;
  status: 'pendente' | 'em_contato' | 'proposta_enviada' | 'contrato_assinado' | 'instalado' | 'rejeitado' | 'indicado';
  reward_points: number;
  points_credited: boolean;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PointsTransaction {
  id: string;
  client_id: string;
  type: 'credito' | 'debito';
  points: number;
  description: string;
  reference_id?: string | null;
  created_at: string;
}

export interface PointsRedemption {
  id: string;
  client_id: string;
  reward_id: string;
  reward_title: string;
  points_spent: number;
  status: 'solicitado' | 'aprovado' | 'agendado' | 'concluido' | 'cancelado';
  scheduled_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface QuarkPointsData {
  balance: number;
  referral_code: string;
  referrals: ClientReferral[];
  transactions: PointsTransaction[];
  redemptions: PointsRedemption[];
}

export const FALLBACK_REWARDS: QuarkReward[] = [
  { id: 'limpeza_paineis', title: 'Limpeza Técnica de Painéis', points: 500, icon: 'Droplets', desc: 'Lavagem com água desmineralizada e relatório fotográfico.', value_brl: 250 },
  { id: 'desconto_fatura', title: 'Desconto de R$ 100 em Serviços', points: 300, icon: 'Tag', desc: 'Abatimento direto na contratação de manutenções ou reparos.', value_brl: 100 },
  { id: 'inspecao_termografica', title: 'Inspeção Termográfica Completa', points: 800, icon: 'ShieldCheck', desc: 'Varredura com câmera térmica FLIR para identificar hotspots.', value_brl: 450 },
  { id: 'manutencao_preventiva', title: 'Manutenção Preventiva Geral', points: 1000, icon: 'Wrench', desc: 'Revisão dos inversores, reaperto de conexões CA/CC e análise de integridade.', value_brl: 350 },
  { id: 'kit_quark', title: 'Kit Exclusivo Quark Energia', points: 250, icon: 'Gift', desc: 'Garrafa térmica inox personalizada + Boné oficial Quark.', value_brl: 90 },
];

/**
 * Hook para obter saldo, código de indicação, lista de indicados, transações e resgates do cliente
 */
export function useQuarkPoints(clientId?: string | null) {
  return useQuery<QuarkPointsData>({
    queryKey: ['portal-points', clientId],
    queryFn: async () => {
      if (!clientId) {
        return {
          balance: 0,
          referral_code: 'QUARK-POINTS',
          referrals: [],
          transactions: [],
          redemptions: [],
        };
      }

      // 1. Tenta API HTTP do backend
      try {
        const response = await fetch(`/api/portal/points/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.success) {
            return {
              balance: Number(data.balance) || 0,
              referral_code: data.referral_code || `QUARK-${String(clientId).slice(0, 6).toUpperCase()}`,
              referrals: (data.referrals as ClientReferral[]) || [],
              transactions: (data.transactions as PointsTransaction[]) || [],
              redemptions: (data.redemptions as PointsRedemption[]) || [],
            };
          }
        }
      } catch (err) {
        console.warn('[useQuarkPoints] Falha na rota HTTP, usando fallback Supabase:', err);
      }

      // 2. Fallback direto no Supabase
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
      let clientQuery = supabase.from('client_portal_users').select('*');
      if (isUuid) {
        clientQuery = clientQuery.or(`id.eq.${clientId},auth_user_id.eq.${clientId}`);
      } else {
        clientQuery = clientQuery.eq('id', clientId);
      }

      const { data: clientUser } = await clientQuery.maybeSingle();
      const actualClientId = clientUser?.id || clientId;
      const fallbackCode = clientUser?.referral_code || `QUARK-${String(actualClientId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;

      // Busca dados relacionados em paralelo
      const [refRes, transRes, redRes] = await Promise.all([
        supabase
          .from('client_referrals')
          .select('*')
          .eq('referrer_client_id', actualClientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('quark_points_transactions')
          .select('*')
          .eq('client_id', actualClientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('quark_points_redemptions')
          .select('*')
          .eq('client_id', actualClientId)
          .order('created_at', { ascending: false }),
      ]);

      return {
        balance: Number(clientUser?.quark_points) || 0,
        referral_code: fallbackCode,
        referrals: (refRes.data as ClientReferral[]) || [],
        transactions: (transRes.data as PointsTransaction[]) || [],
        redemptions: (redRes.data as PointsRedemption[]) || [],
      };
    },
    enabled: !!clientId,
    staleTime: 1000 * 30, // 30s
  });
}

/**
 * Hook para obter o catálogo oficial de recompensas
 */
export function useQuarkRewards() {
  return useQuery<QuarkReward[]>({
    queryKey: ['portal-rewards'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/portal/points/rewards');
        if (response.ok) {
          const data = await response.json();
          if (data && data.success && Array.isArray(data.rewards) && data.rewards.length > 0) {
            return data.rewards;
          }
        }
      } catch (err) {
        console.warn('[useQuarkRewards] Erro ao buscar via HTTP, usando fallback estático:', err);
      }
      return FALLBACK_REWARDS;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export interface ReferFriendPayload {
  referred_name: string;
  referred_phone: string;
  referred_city?: string;
  notes?: string;
}

/**
 * Hook para mutação de indicação de amigo
 */
export function useReferFriend(clientId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReferFriendPayload) => {
      if (!clientId) throw new Error('Cliente não identificado para indicação');

      // 1. Tenta HTTP backend
      try {
        const response = await fetch(`/api/portal/points/${clientId}/refer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) return result;
        }
      } catch (httpErr) {
        console.warn('[useReferFriend] Falha no backend HTTP, executando fallback Supabase:', httpErr);
      }

      // 2. Fallback direto Supabase
      const cleanPhone = payload.referred_phone.replace(/\D/g, '');
      const leadId = `lead_ref_${Date.now()}`;

      // Cria lead no CRM
      await supabase.from('leads').insert({
        id: leadId,
        data: {
          name: `Indicação: ${payload.referred_name}`,
          phone: cleanPhone,
          city: payload.referred_city || '',
          origin: 'indicacao_portal',
          status: 'Novo',
          referrer_client_id: clientId,
          notes: payload.notes || 'Indicação enviada pelo portal do cliente',
          createdAt: new Date().toISOString(),
        },
      });

      // Cria registro de indicação
      const { data: referral, error: refError } = await supabase
        .from('client_referrals')
        .insert({
          referrer_client_id: clientId,
          referred_name: payload.referred_name,
          referred_phone: cleanPhone,
          referred_city: payload.referred_city || null,
          status: 'indicado',
          reward_points: 1000,
          points_credited: false,
          lead_id: leadId,
          notes: payload.notes || null,
        })
        .select()
        .single();

      if (refError) throw refError;
      return { success: true, referral };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-points', clientId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export interface RedeemPointsPayload {
  reward_id: string;
  reward_title: string;
  points_spent: number;
  notes?: string;
}

/**
 * Hook para resgatar benefício usando pontos
 */
export function useRedeemPoints(clientId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RedeemPointsPayload) => {
      if (!clientId) throw new Error('Cliente não identificado para resgate');

      // 1. Tenta HTTP backend
      try {
        const response = await fetch(`/api/portal/points/${clientId}/redeem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) return result;
          throw new Error(result.error || 'Erro ao resgatar pontos');
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Falha ao processar resgate');
        }
      } catch (httpErr: any) {
        // Se a mensagem for de saldo insuficiente ou erro de validação, propaga o erro
        if (httpErr.message && !httpErr.message.includes('fetch')) {
          throw httpErr;
        }
        console.warn('[useRedeemPoints] Falha HTTP, tentando RPC Supabase:', httpErr);
      }

      // 2. Fallback direto Supabase RPC
      const { data, error } = await supabase.rpc('redeem_quark_points', {
        p_client_id: clientId,
        p_reward_id: payload.reward_id,
        p_reward_title: payload.reward_title,
        p_points_spent: payload.points_spent,
        p_notes: payload.notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-points', clientId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_services'] });
      queryClient.invalidateQueries({ queryKey: ['portal-client-services'] });
    },
  });
}
