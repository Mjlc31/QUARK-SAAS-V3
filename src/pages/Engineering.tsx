import React, { useState } from 'react';
import { 
  HardHat, Loader2, Calendar, User, ArrowRight, X, Zap, 
  MapPin, Phone, MessageCircle, CheckCircle2, Clock 
} from 'lucide-react';
import { 
  useActiveProjectsTracking, 
  useAdvancePhase, 
  useSetClientPhase, 
  SOLAR_PROJECT_PHASES 
} from '../hooks/useProjectTracking';
import type { ProjectPhase } from '../types';
import toast from 'react-hot-toast';
import { whatsappUrl, formatPhone } from '../lib/format';

export default function EngineeringNew() {
  const { data: activeTrackings, isLoading } = useActiveProjectsTracking();
  const advancePhase = useAdvancePhase();
  const setClientPhase = useSetClientPhase();
  const [selectedTracking, setSelectedTracking] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
      </div>
    );
  }

  const handleAdvance = async (tracking: any) => {
    const config = SOLAR_PROJECT_PHASES.find((c) => c.id === tracking.phase);
    if (!config?.next) return;

    const nextConfig = SOLAR_PROJECT_PHASES.find((c) => c.id === config.next);

    try {
      await advancePhase.mutateAsync({
        currentPhaseId: tracking.id,
        projectId: tracking.project_id,
        clientId: tracking.client_id || tracking.client?.id,
        nextPhase: config.next,
        nextPhaseLabel: nextConfig?.label || '',
        notes: nextConfig?.description,
      });
      toast.success(`Obra avançada para: ${nextConfig?.shortLabel || nextConfig?.label}!`);
    } catch (err: any) {
      toast.error('Erro ao avançar fase: ' + (err.message || err));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <HardHat className="h-8 w-8 text-lime-500" />
            Engenharia e Obras
          </h1>
          <p className="mt-2 text-zinc-400">
            Acompanhamento de obras integrado em tempo real ao Portal do Cliente (9 etapas solares).
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex h-full gap-4 min-w-max pb-4">
          {SOLAR_PROJECT_PHASES.map((col, colIdx) => {
            const trackings = activeTrackings?.filter((t: any) => t.phase === col.id) || [];
            
            return (
              <div 
                key={col.id} 
                className={`flex h-full w-80 flex-col rounded-2xl border-t-4 bg-zinc-900/50 p-4 ${col.color} border border-white/5 backdrop-blur-xl`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-500">{colIdx + 1}</span>
                    <h3 className="font-semibold text-zinc-100 text-sm">{col.shortLabel}</h3>
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                    {trackings.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 pb-2">
                  {trackings.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800/80 bg-zinc-900/20 p-5 text-center text-xs text-zinc-500">
                      Nenhuma obra nesta etapa
                    </div>
                  ) : (
                    trackings.map((tracking: any) => {
                      const clientName = tracking.client?.name || tracking.opportunities?.client_name || 'Cliente';
                      const title = tracking.opportunities?.title || (tracking.client ? `Instalação Solar - ${tracking.client.name}` : 'Obra Solar');
                      const power = tracking.client?.system_size_kw || tracking.opportunities?.system_power;
                      const phone = tracking.client?.phone || tracking.opportunities?.phone;

                      return (
                        <div 
                          key={tracking.id}
                          className="group relative cursor-pointer rounded-xl border border-white/5 bg-zinc-850 p-4 transition-all hover:border-lime-500/40 hover:bg-zinc-800/80 shadow-sm"
                          onClick={() => setSelectedTracking({ ...tracking, clientName, title, power, phone })}
                        >
                          <div className="mb-2">
                            <h4 className="font-semibold text-zinc-100 text-sm truncate group-hover:text-lime-300 transition-colors">
                              {title}
                            </h4>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                              <User className="h-3 w-3 text-zinc-500 shrink-0" />
                              {clientName}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 my-2 text-[11px] text-zinc-400">
                            {power && (
                              <span className="flex items-center gap-1 bg-lime-500/10 text-lime-400 px-2 py-0.5 rounded-md font-medium">
                                <Zap className="h-3 w-3" /> {power} kWp
                              </span>
                            )}
                            <span className="flex items-center gap-1 bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
                              <Calendar className="h-3 w-3" />
                              {new Date(tracking.started_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          {tracking.notes && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2 italic mb-3 bg-zinc-900/60 p-2 rounded-lg border border-white/5">
                              "{tracking.notes}"
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                            {phone ? (
                              <a
                                href={whatsappUrl(phone, `Olá ${clientName.split(' ')[0]}, seu projeto solar avançou para a etapa: ${col.shortLabel}!`)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                title="Notificar via WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            ) : <span />}
                            
                            {col.next && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdvance(tracking);
                                }}
                                disabled={advancePhase.isPending}
                                className="flex items-center gap-1 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 px-2.5 py-1 text-xs font-semibold text-lime-400 transition-all active:scale-95 border border-lime-500/20"
                                title="Avançar para a próxima fase"
                              >
                                Avançar <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Quick Modal View */}
      {selectedTracking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedTracking(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h2 className="text-xl font-bold text-white mb-1">
              {selectedTracking.title || 'Detalhes da Obra'}
            </h2>
            <p className="text-xs text-zinc-400 mb-5">
              Sincronizado automaticamente com o Portal do Cliente
            </p>

            <div className="space-y-4">
              <div className="rounded-xl bg-orange-500/10 p-4 border border-orange-500/30">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Etapa Atual</p>
                  <span className="text-xs font-semibold text-orange-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Em andamento
                  </span>
                </div>
                <p className="text-lg font-bold text-white">{selectedTracking.phase_label}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Iniciada em: {new Date(selectedTracking.started_at).toLocaleString('pt-BR')}
                </p>
                {selectedTracking.notes && (
                  <p className="text-xs text-zinc-300 mt-2 bg-black/30 p-2.5 rounded-lg border border-white/5">
                    {selectedTracking.notes}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-900 p-3.5 border border-white/5">
                  <p className="text-[11px] text-zinc-500 font-semibold uppercase mb-1">Cliente</p>
                  <p className="text-sm font-semibold text-zinc-200 truncate">{selectedTracking.clientName}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-3.5 border border-white/5">
                  <p className="text-[11px] text-zinc-500 font-semibold uppercase mb-1">Potência</p>
                  <p className="text-sm font-semibold text-lime-400">
                    {selectedTracking.power ? `${selectedTracking.power} kWp` : '6.60 kWp'}
                  </p>
                </div>
              </div>

              {selectedTracking.phone && (
                <div className="rounded-xl bg-zinc-900 p-3.5 border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-zinc-500 font-semibold uppercase mb-0.5">Contato do Cliente</p>
                    <p className="text-xs font-mono text-zinc-200">{formatPhone(selectedTracking.phone)}</p>
                  </div>
                  <a
                    href={whatsappUrl(selectedTracking.phone, `Olá ${selectedTracking.clientName.split(' ')[0]}, tudo bem? Acompanhe o status da sua usina solar em tempo real pelo Portal Quark!`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              <button 
                onClick={() => setSelectedTracking(null)} 
                className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Fechar
              </button>

              <button
                onClick={async () => {
                  await handleAdvance(selectedTracking);
                  setSelectedTracking(null);
                }}
                disabled={advancePhase.isPending}
                className="px-5 py-2.5 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-lime-500/20"
              >
                Avançar Obra <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
