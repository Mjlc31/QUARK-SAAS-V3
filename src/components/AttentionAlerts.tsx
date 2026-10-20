import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  EyeOff,
  Hourglass,
  UserX,
  Route,
  AlarmClock,
  FileSignature,
  KeyRound,
  ChevronRight,
  MessageCircle,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { computeAlerts, type SmartAlert, type AlertKind } from '../lib/alerts';
import { useLeads } from '../hooks/useLeads';
import { useApp } from '../contexts/AppContext';

const SNOOZE_KEY = 'quark_attention_snooze';

const ALERT_CONFIG: Record<
  AlertKind,
  { icon: React.ComponentType<{ className?: string }>; tone: string; badge: string }
> = {
  viewed: {
    icon: BellRing,
    tone: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
    badge: 'Proposta Aberta',
  },
  unopened: {
    icon: EyeOff,
    tone: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    badge: 'Não Visualizada',
  },
  expiring: {
    icon: Hourglass,
    tone: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    badge: 'Vencendo',
  },
  'no-contact': {
    icon: UserX,
    tone: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    badge: 'Sem Contato',
  },
  'no-next-step': {
    icon: Route,
    tone: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    badge: 'Sem Próximo Passo',
  },
  overdue: {
    icon: AlarmClock,
    tone: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    badge: 'Atrasada',
  },
  signature: {
    icon: FileSignature,
    tone: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    badge: 'Assinatura',
  },
  procuracao: {
    icon: KeyRound,
    tone: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    badge: 'Procuração',
  },
};

export const AttentionAlerts: React.FC<{ maxItems?: number; className?: string }> = ({
  maxItems = 6,
  className = '',
}) => {
  const { data: leads = [] } = useLeads();
  const { tasks = [] } = useApp();
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-for-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('proposals').select('*');
      if (error) return [];
      return data || [];
    },
  });

  const [snoozed, setSnoozed] = useState<Record<string, number>>(() => {
    try {
      const local = localStorage.getItem(SNOOZE_KEY);
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  });

  const alerts = useMemo(() => {
    const all = computeAlerts({ leads, proposals, tasks });
    const now = Date.now();
    return all.filter((a) => !(snoozed[a.id] && snoozed[a.id] > now));
  }, [leads, proposals, tasks, snoozed]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = { ...snoozed, [id]: Date.now() + 24 * 60 * 60 * 1000 };
    setSnoozed(next);
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage private mode errors
    }
    toast.info('Alerta adiado por 24 horas.');
  };

  const handleSendWhatsApp = (alert: SmartAlert, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!alert.suggest) return;

    const phoneRaw = alert.clientPhone?.replace(/\D/g, '') || '';
    const text = alert.suggest.copy;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Mensagem de follow-up copiada para a área de transferência!');
    }

    const waUrl = phoneRaw
      ? `https://wa.me/55${phoneRaw}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  if (!alerts.length) return null;

  const topAlerts = alerts.slice(0, maxItems);

  return (
    <div
      className={`glass-panel p-5 sm:p-6 rounded-2xl relative overflow-hidden border border-white/5 bg-zinc-900/60 backdrop-blur-xl shadow-xl ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Precisa de Atenção
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {alerts.length} pendências críticas
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Oportunidades em risco de esfriar e ações recomendadas para fechamento rápido
            </p>
          </div>
        </div>

        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-lime-400 hover:text-lime-300 transition"
        >
          Central de Follow-up
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid de Cards de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {topAlerts.map((a) => {
          const config = ALERT_CONFIG[a.kind];
          const Icon = config.icon;

          return (
            <div
              key={a.id}
              className="relative p-4 rounded-xl bg-zinc-950/70 border border-white/5 hover:border-zinc-700/80 transition-all flex flex-col justify-between gap-3 group shadow-md"
            >
              {/* Botão de Adiar/Fechar */}
              <button
                onClick={(e) => handleDismiss(a.id, e)}
                title="Adiar por 24h"
                className="absolute top-3 right-3 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition opacity-0 group-hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${config.tone}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {config.badge}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-zinc-100 line-clamp-1">{a.title}</h3>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {a.text}
                </p>
              </div>

              {/* Ação: Disparar WhatsApp ou Navegar */}
              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                {a.suggest ? (
                  <button
                    onClick={(e) => handleSendWhatsApp(a, e)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Enviar WhatsApp Pronto
                  </button>
                ) : a.cta ? (
                  <Link
                    to={a.cta.href}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 text-xs font-semibold border border-lime-500/20 transition"
                  >
                    {a.cta.label}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    to={a.href}
                    className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                  >
                    Ver Detalhes
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
