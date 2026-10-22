import React from 'react';
import { 
  MapPin, CheckCircle2, Clock, Calendar, Navigation, LogOut, 
  Headphones, Zap, ArrowLeft, ShieldCheck, Sparkles, FileText, Download, MessageSquare, ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalContext';
import { useClientProjectTracking, SOLAR_PROJECT_PHASES } from '../../hooks/useProjectTracking';

const PortalTracking: React.FC = () => {
  const navigate = useNavigate();
  const { client, logout } = usePortal();

  // Busca dados reais de tracking do Supabase vinculados ao ID do cliente
  const { data: trackingRecords, isLoading } = useClientProjectTracking(client?.id);

  // Mapeia as 9 fases solares oficiais com os registros reais do banco
  const phases = React.useMemo(() => {
    // Determina a fase ativa oficial do cliente
    const activePhaseKey = trackingRecords?.find(t => t.is_current)?.phase || client?.project_phase || 'compra_kit';
    const activeIdx = SOLAR_PROJECT_PHASES.findIndex(p => p.id === activePhaseKey);
    const targetIdx = activeIdx >= 0 ? activeIdx : 2;

    const recordsMap = new Map(trackingRecords?.map((r) => [r.phase, r]) || []);

    return SOLAR_PROJECT_PHASES.map((config, idx) => {
      const tracked = recordsMap.get(config.id);

      let status: 'completed' | 'current' | 'future' = 'future';
      let date = 'Pendente';

      if (idx < targetIdx) {
        status = 'completed';
        date = tracked?.completed_at
          ? new Date(tracked.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Concluído';
      } else if (idx === targetIdx) {
        status = 'current';
        date = 'Em andamento';
      } else {
        status = 'future';
        date = 'Pendente';
      }

      return {
        id: idx + 1,
        phaseKey: config.id,
        label: tracked?.phase_label || config.label,
        shortLabel: config.shortLabel,
        status,
        date,
        desc: tracked?.notes || config.description,
      };
    });
  }, [trackingRecords, client?.project_phase]);

  // Contagem e porcentagem de progresso
  const currentPhase = phases.find((p) => p.status === 'current') || phases[phases.length - 1];
  const progressPercent = currentPhase.phaseKey === 'finalizado'
    ? 100
    : (SOLAR_PROJECT_PHASES.find(p => p.id === currentPhase.phaseKey)?.percent ?? 38);

  const clientName = client?.name || 'Cliente';
  const systemSize = client?.system_size_kw ? `${client.system_size_kw} kWp` : '3.72 kWp';
  const location = client?.city 
    ? `${client.city}, ${client.state || 'AL'}` 
    : 'Flexeiras, AL';

  React.useEffect(() => {
    if (client && /teste/i.test(client.name || '')) {
      logout().then(() => navigate('/portal/login', { replace: true }));
    }
  }, [client, logout, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-quark-bg text-zinc-200 font-sans pb-16">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-50 bg-zinc-900/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/portal')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-xs font-semibold">Voltar ao Início</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Breadcrumb / Navegação Desktop */}
        <div className="hidden md:flex items-center gap-2 mb-6 text-xs text-zinc-400">
          <button 
            onClick={() => navigate('/portal')}
            className="hover:text-lime-400 transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft size={14} /> Início
          </button>
          <span>/</span>
          <span className="text-zinc-200 font-semibold">Acompanhamento de Obra</span>
        </div>

        {/* Título Principal */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-2xl shadow-lg shadow-orange-500/10">
                <MapPin size={24} />
              </div>
              Acompanhe sua Obra
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Transparência total em cada etapa do seu projeto de energia solar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const text = encodeURIComponent(
                  `Olá engenharia Quark! Sou ${clientName} e gostaria de informações sobre a etapa "${currentPhase.label}" da minha obra de ${systemSize}.`
                );
                window.open(`https://wa.me/5582994241835?text=${text}`, '_blank');
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 transition-colors text-xs sm:text-sm font-semibold active:scale-95 shadow-sm"
            >
              <MessageSquare size={16} />
              Engenharia via WhatsApp
            </button>
            <button 
              onClick={() => navigate('/portal/tickets')}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors text-xs sm:text-sm font-semibold active:scale-95 shadow-sm"
            >
              <Headphones size={16} className="text-lime-400" />
              Abrir Chamado
            </button>
          </div>
        </div>

        {/* Destaque da Fase Atual */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-zinc-900 to-zinc-900 border border-orange-500/30 mb-6 shadow-xl"
        >
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400 block">
                  Etapa em Execução
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {currentPhase.label}
                </h2>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
              <Clock size={12} /> Em andamento
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 mt-2.5 pl-6 sm:pl-6 leading-relaxed">
            {currentPhase.desc}
          </p>
        </motion.div>

        {/* Project Info Card */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/5 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Cliente
              </span>
              <span className="text-xs sm:text-sm text-white font-medium truncate block" title={clientName}>
                {clientName}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Potência
              </span>
              <span className="text-xs sm:text-sm text-white font-medium flex items-center gap-1">
                <Zap size={14} className="text-lime-400" /> {systemSize}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Localização
              </span>
              <span className="text-xs sm:text-sm text-white font-medium flex items-center gap-1 truncate">
                <Navigation size={13} className="text-zinc-400 shrink-0"/> {location}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Status Geral
              </span>
              <span className="text-xs sm:text-sm text-lime-400 font-semibold flex items-center gap-1">
                <ShieldCheck size={14} /> Ativo & Monitorado
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-zinc-400">Evolução Geral da Obra</span>
              <span className="text-lime-400 font-mono font-bold">{progressPercent}% Concluído</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5 p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-lime-500 to-emerald-400 rounded-full shadow-lg shadow-lime-500/20" 
              />
            </div>
          </div>
        </div>

        {/* Linha do Tempo Vertical Oficial */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 relative">
          <div className="absolute left-[39px] sm:left-[47px] top-12 bottom-12 w-0.5 bg-zinc-800 z-0"></div>
          
          <div className="space-y-8 relative z-10">
            {phases.map((phase, index) => (
              <motion.div 
                key={phase.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-4 sm:gap-6 group"
              >
                {/* Node icon */}
                <div className="flex-shrink-0 mt-1">
                  {phase.status === 'completed' ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-lime-500/20 flex items-center justify-center border border-lime-500/50 text-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.2)]">
                      <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />
                    </div>
                  ) : phase.status === 'current' ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/50 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)] relative">
                      <div className="absolute inset-0 rounded-full border border-orange-400 animate-ping opacity-40"></div>
                      <Clock size={18} className="sm:w-5 sm:h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-700 text-zinc-600">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-2 rounded-xl transition-colors ${
                  phase.status === 'current' 
                    ? 'bg-orange-500/10 border border-orange-500/30 p-4 shadow-md' 
                    : 'pt-1 sm:pt-2'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1.5">
                    <h3 className={`font-bold ${
                      phase.status === 'completed' ? 'text-zinc-100' : 
                      phase.status === 'current' ? 'text-orange-400 text-base sm:text-lg' : 'text-zinc-500'
                    }`}>
                      {index + 1}. {phase.label}
                    </h3>
                    <span className={`text-xs font-medium font-mono ${
                      phase.status === 'completed' ? 'text-lime-400' :
                      phase.status === 'current' ? 'text-orange-300 font-semibold' : 'text-zinc-600'
                    }`}>
                      {phase.date}
                    </span>
                  </div>

                  <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                    phase.status === 'current' ? 'text-zinc-200' : 
                    phase.status === 'completed' ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    {phase.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Cofre de Documentos da Obra */}
        <div className="mt-8 glass-panel p-6 sm:p-8 rounded-2xl border border-white/5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-lime-400" />
                Cofre de Documentos do Projeto
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Acesse a documentação técnica, laudos de homologação e garantias da sua usina
              </p>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
              4 documentos registrados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Projeto Elétrico & Diagrama',
                category: 'Engenharia',
                desc: 'Diagrama unifilar, memorial descritivo e planta de locação dos módulos.',
                action: 'Solicitar PDF',
              },
              {
                title: 'Parecer de Acesso Equatorial',
                category: 'Concessionária',
                desc: 'Documento oficial autorizando a conexão e conexão à rede de distribuição.',
                action: 'Solicitar Cópia',
              },
              {
                title: 'ART de Execução (CREA/CFT)',
                category: 'Engenheiro Responsável',
                desc: 'Anotação de Responsabilidade Técnica com assinatura digital do engenheiro.',
                action: 'Solicitar ART',
              },
              {
                title: 'Nota Fiscal & Garantias',
                category: 'Faturamento',
                desc: 'NF-e dos módulos e inversor com certificado de garantia de 12 a 25 anos.',
                action: 'Solicitar NF-e',
              },
            ].map((doc, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 hover:border-lime-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-lime-400 bg-lime-500/10 px-2 py-0.5 rounded-md">
                      {doc.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">{doc.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">{doc.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Olá equipe Quark! Gostaria de receber o documento "${doc.title}" do meu projeto (${clientName}).`
                    );
                    window.open(`https://wa.me/5582994241835?text=${text}`, '_blank');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-lime-500 hover:text-black border border-white/10 text-xs font-semibold text-zinc-200 transition-all flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Download size={13} /> {doc.action} via WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PortalTracking;
