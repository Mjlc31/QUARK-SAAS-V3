import React, { useState } from 'react';
import { HardHat, Link as WebhookIcon, Plus, Loader2, Calendar, FileText, X, User, ArrowRight } from 'lucide-react';
import { useActiveProjectsTracking, useAdvancePhase } from '../hooks/useProjectTracking';
import type { ProjectPhase, ProjectTrackingPhase } from '../types';
import toast from 'react-hot-toast';

const PHASES_CONFIG: { id: ProjectPhase; label: string; color: string; next?: ProjectPhase }[] = [
  { id: 'venda_confirmada', label: 'Venda Confirmada', color: 'border-blue-500', next: 'projeto_elaboracao' },
  { id: 'projeto_elaboracao', label: 'Elaboração Projeto', color: 'border-yellow-500', next: 'projeto_enviado' },
  { id: 'projeto_enviado', label: 'Projeto Enviado', color: 'border-orange-500', next: 'aprovacao_concessionaria' },
  { id: 'aprovacao_concessionaria', label: 'Aprov. Concessionária', color: 'border-purple-500', next: 'logistica_entrega' },
  { id: 'logistica_entrega', label: 'Logística & Entrega', color: 'border-indigo-500', next: 'instalacao' },
  { id: 'instalacao', label: 'Instalação Física', color: 'border-red-500', next: 'homologacao' },
  { id: 'homologacao', label: 'Homologação', color: 'border-pink-500', next: 'comissionamento' },
  { id: 'comissionamento', label: 'Comissionamento', color: 'border-teal-500', next: 'finalizado' },
  { id: 'finalizado', label: 'Finalizado', color: 'border-lime-500' }
];

export default function EngineeringNew() {
  const { data: activeTrackings, isLoading } = useActiveProjectsTracking();
  const advancePhase = useAdvancePhase();
  const [selectedTracking, setSelectedTracking] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
      </div>
    );
  }

  const handleAdvance = async (tracking: any) => {
    const config = PHASES_CONFIG.find(c => c.id === tracking.phase);
    if (!config?.next) return;

    const nextConfig = PHASES_CONFIG.find(c => c.id === config.next);

    try {
      await advancePhase.mutateAsync({
        currentPhaseId: tracking.id,
        projectId: tracking.project_id,
        nextPhase: config.next,
        nextPhaseLabel: nextConfig?.label || ''
      });
      toast.success('Fase avançada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao avançar fase: ' + err.message);
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
            Acompanhamento de obras integrado ao Portal do Cliente (9 etapas).
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex h-full gap-4 min-w-max pb-4">
          {PHASES_CONFIG.map((col) => {
            const trackings = activeTrackings?.filter((t: any) => t.phase === col.id) || [];
            
            return (
              <div 
                key={col.id} 
                className={`flex h-full w-80 flex-col rounded-xl border-t-4 bg-zinc-900/50 p-4 ${col.color} border border-white/5 backdrop-blur-xl`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-100">{col.label}</h3>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
                    {trackings.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 pb-2">
                  {trackings.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-4 text-center text-sm text-zinc-500">
                      Fase Vazia
                    </div>
                  ) : (
                    trackings.map((tracking: any) => (
                      <div 
                        key={tracking.id}
                        className="group relative cursor-pointer rounded-xl border border-white/5 bg-zinc-800/50 p-4 transition-all hover:border-lime-500/30 hover:bg-zinc-800"
                        onClick={() => setSelectedTracking(tracking)}
                      >
                        <div className="mb-3">
                          <h4 className="font-medium text-zinc-100 truncate">
                            {tracking.opportunities?.title || 'Obra sem nome'}
                          </h4>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                            <User className="h-3 w-3" />
                            {tracking.opportunities?.client_name || 'Desconhecido'}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-xs text-zinc-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(tracking.started_at).toLocaleDateString('pt-BR')}
                          </div>
                          
                          {col.next && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvance(tracking);
                              }}
                              disabled={advancePhase.isPending}
                              className="flex items-center gap-1 rounded bg-lime-500/10 px-2 py-1 text-xs font-medium text-lime-400 hover:bg-lime-500/20 transition-colors"
                              title="Avançar Fase"
                            >
                              Avançar <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Quick Modal View */}
      {selectedTracking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedTracking(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">
              {selectedTracking.opportunities?.title || 'Detalhes da Obra'}
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-800/50 p-4 border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Fase Atual</p>
                <p className="font-medium text-lime-400">{selectedTracking.phase_label}</p>
                <p className="text-xs text-zinc-500 mt-2">Iniciada em: {new Date(selectedTracking.started_at).toLocaleString('pt-BR')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-zinc-800/50 p-4 border border-white/5">
                  <p className="text-xs text-zinc-400 mb-1">Cliente</p>
                  <p className="text-sm text-zinc-200">{selectedTracking.opportunities?.client_name || '-'}</p>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-4 border border-white/5">
                  <p className="text-xs text-zinc-400 mb-1">Telefone / WhatsApp</p>
                  <p className="text-sm text-zinc-200">{selectedTracking.opportunities?.phone || '-'}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
               <button onClick={() => setSelectedTracking(null)} className="px-4 py-2 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors">
                 Fechar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
