import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

const withTimeout = <T,>(p: PromiseLike<T> | Promise<T>, ms = 1200): Promise<T> =>
  Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);

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

      // 2. Fallback direto no Supabase com timeout
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
      let clientUser: any = null;
      let refList: ClientReferral[] = [];
      let transList: PointsTransaction[] = [];
      let redList: PointsRedemption[] = [];

      try {
        let clientQuery = supabase.from('client_portal_users').select('*');
        if (isUuid) {
          clientQuery = clientQuery.or(`id.eq.${clientId},auth_user_id.eq.${clientId}`);
        } else {
          clientQuery = clientQuery.eq('id', clientId);
        }

        const clientRes: any = await withTimeout(Promise.resolve(clientQuery.maybeSingle()), 1000);
        clientUser = clientRes?.data;
        const actualClientId = clientUser?.id || clientId;

        const [refRes, transRes, redRes]: any = await withTimeout(
          Promise.all([
            Promise.resolve(
              supabase
                .from('client_referrals')
                .select('*')
                .eq('referrer_client_id', actualClientId)
                .order('created_at', { ascending: false })
            ),
            Promise.resolve(
              supabase
                .from('quark_points_transactions')
                .select('*')
                .eq('client_id', actualClientId)
                .order('created_at', { ascending: false })
            ),
            Promise.resolve(
              supabase
                .from('quark_points_redemptions')
                .select('*')
                .eq('client_id', actualClientId)
                .order('created_at', { ascending: false })
            ),
          ]),
          1200
        );

        if (refRes?.data) refList = refRes.data as ClientReferral[];
        if (transRes?.data) transList = transRes.data as PointsTransaction[];
        if (redRes?.data) redList = redRes.data as PointsRedemption[];
      } catch (err) {
        console.warn('[useQuarkPoints] Timeout/erro no Supabase, usando cache local:', err);
      }

      // 3. Mescla com dados do cache local (offline-first)
      let localBalance = 1000; // Padrão de boas-vindas
      try {
        const cachedPoints = localStorage.getItem(`quark_client_points_${clientId}`);
        if (cachedPoints !== null) {
          localBalance = Number(cachedPoints);
        } else if (clientUser?.quark_points !== undefined && clientUser?.quark_points !== null) {
          localBalance = Number(clientUser.quark_points);
        }

        const cachedRefs = localStorage.getItem(`quark_client_referrals_${clientId}`);
        if (cachedRefs) {
          const parsed = JSON.parse(cachedRefs);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: any) => {
              if (!refList.some(r => r.id === p.id)) refList.unshift(p);
            });
          }
        }

        const cachedTrans = localStorage.getItem(`quark_client_transactions_${clientId}`);
        if (cachedTrans) {
          const parsed = JSON.parse(cachedTrans);
          if (Array.isArray(parsed)) {
            parsed.forEach((t: any) => {
              if (!transList.some(tr => tr.id === t.id)) transList.unshift(t);
            });
          }
        }

        const cachedRedemptions = localStorage.getItem(`quark_client_redemptions_${clientId}`);
        if (cachedRedemptions) {
          const parsed = JSON.parse(cachedRedemptions);
          if (Array.isArray(parsed)) {
            parsed.forEach((rd: any) => {
              if (!redList.some(r => r.id === rd.id)) redList.unshift(rd);
            });
          }
        }
      } catch (e) {}

      const actualClientId = clientUser?.id || clientId;
      const fallbackCode = clientUser?.referral_code || `QUARK-${String(actualClientId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;

      return {
        balance: localBalance,
        referral_code: fallbackCode,
        referrals: refList,
        transactions: transList,
        redemptions: redList,
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

      // 2. Fallback direto Supabase com timeout
      const cleanPhone = payload.referred_phone.replace(/\D/g, '');
      const leadId = `lead_ref_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const newReferral: ClientReferral = {
        id: `ref_${Date.now()}`,
        referrer_client_id: clientId,
        referred_name: payload.referred_name,
        referred_phone: cleanPhone,
        referred_city: payload.referred_city || null,
        status: 'pendente',
        reward_points: 1000,
        points_credited: false,
        notes: payload.notes || 'Indicação enviada pelo portal do cliente',
        created_at: nowIso,
      };

      // Salva localmente
      try {
        const cachedRefs = localStorage.getItem(`quark_client_referrals_${clientId}`);
        const list = cachedRefs ? JSON.parse(cachedRefs) : [];
        localStorage.setItem(`quark_client_referrals_${clientId}`, JSON.stringify([newReferral, ...list]));
      } catch (e) {}

      try {
        await withTimeout(
          Promise.resolve(
            supabase.from('leads').insert({
              id: leadId,
              data: {
                name: `Indicação: ${payload.referred_name}`,
                phone: cleanPhone,
                city: payload.referred_city || '',
                origin: 'indicacao_portal',
                status: 'Novo',
                referrer_client_id: clientId,
                notes: payload.notes || 'Indicação enviada pelo portal do cliente',
                createdAt: nowIso,
              },
            })
          ),
          1000
        );

        const refRes: any = await withTimeout(
          Promise.resolve(
            supabase
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
              .single()
          ),
          1000
        );

        if (refRes?.data) return { success: true, referral: refRes.data };
      } catch (dbErr) {
        console.warn('[useReferFriend] Banco offline, indicação salva localmente');
      }

      return { success: true, referral: newReferral };
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
        if (httpErr.message && !httpErr.message.includes('fetch')) {
          throw httpErr;
        }
        console.warn('[useRedeemPoints] Falha HTTP, tentando RPC Supabase:', httpErr);
      }

      // 2. Fallback direto Supabase RPC com timeout
      try {
        const rpcRes: any = await withTimeout(
          Promise.resolve(
            supabase.rpc('redeem_quark_points', {
              p_client_id: clientId,
              p_reward_id: payload.reward_id,
              p_reward_title: payload.reward_title,
              p_points_spent: payload.points_spent,
              p_notes: payload.notes || null,
            })
          ),
          1200
        );

        if (!rpcRes?.error && rpcRes?.data) return rpcRes.data;
      } catch (rpcErr) {
        console.warn('[useRedeemPoints] RPC offline, aplicando dedução local:', rpcErr);
      }

      // 3. Fallback Local / Offline
      const nowIso = new Date().toISOString();
      const currentPtsRaw = localStorage.getItem(`quark_client_points_${clientId}`);
      let currentPts = currentPtsRaw !== null ? Number(currentPtsRaw) : 1000;

      if (currentPts < payload.points_spent) {
        throw new Error(`Saldo insuficiente! Você possui ${currentPts} pontos e precisa de ${payload.points_spent} pontos.`);
      }

      const newBalance = currentPts - payload.points_spent;
      localStorage.setItem(`quark_client_points_${clientId}`, String(newBalance));

      // Registra transação de débito
      const newTransaction: PointsTransaction = {
        id: `txn_${Date.now()}`,
        client_id: clientId,
        type: 'debito',
        points: payload.points_spent,
        description: `Resgate: ${payload.reward_title}`,
        created_at: nowIso,
      };
      try {
        const cachedTx = localStorage.getItem(`quark_client_transactions_${clientId}`);
        const txList = cachedTx ? JSON.parse(cachedTx) : [];
        localStorage.setItem(`quark_client_transactions_${clientId}`, JSON.stringify([newTransaction, ...txList]));
      } catch (e) {}

      // Registra resgate
      const newRedemption: PointsRedemption = {
        id: `rdm_${Date.now()}`,
        client_id: clientId,
        reward_id: payload.reward_id,
        reward_title: payload.reward_title,
        points_spent: payload.points_spent,
        status: 'solicitado',
        notes: payload.notes || 'Resgate realizado no Portal do Cliente',
        created_at: nowIso,
      };
      try {
        const cachedRdm = localStorage.getItem(`quark_client_redemptions_${clientId}`);
        const rdmList = cachedRdm ? JSON.parse(cachedRdm) : [];
        localStorage.setItem(`quark_client_redemptions_${clientId}`, JSON.stringify([newRedemption, ...rdmList]));
      } catch (e) {}

      // Se for serviço técnico (limpeza ou manutenção), abre ordem de serviço técnica no /maintenance
      if (payload.reward_id.includes('limpeza') || payload.reward_id.includes('manutencao') || payload.reward_id.includes('inspecao')) {
        try {
          const rawMaint = localStorage.getItem('quark_maintenance_services');
          const maintList = rawMaint ? JSON.parse(rawMaint) : [];
          maintList.unshift({
            id: `srv_rdm_${Date.now()}`,
            client_id: clientId,
            client_name: 'Cliente Fidelidade Quark',
            service_type: payload.reward_id.includes('limpeza') ? 'limpeza' : 'manutencao',
            status: 'pendente',
            price: 0,
            cost: 0,
            technician: 'Equipe Técnica Quark',
            notes: `[Resgate Fidelidade Quark] ${payload.reward_title}. ${payload.notes || ''}`,
            created_at: nowIso,
            updated_at: nowIso,
          });
          localStorage.setItem('quark_maintenance_services', JSON.stringify(maintList));
        } catch (e) {}
      }

      return {
        success: true,
        new_balance: newBalance,
        redemption_id: newRedemption.id,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-points', clientId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_services'] });
      queryClient.invalidateQueries({ queryKey: ['portal-client-services'] });
    },
  });
}
