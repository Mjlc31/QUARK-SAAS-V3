import React from 'react';
import { MapPin, CheckCircle2, Clock, Calendar, Navigation, LogOut, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { usePortal } from '../../contexts/PortalContext';

const mockPhases = [
  { id: 1, label: 'Venda Confirmada', status: 'completed', date: '01 Set, 2026', desc: 'Contrato assinado e pagamento inicial aprovado.' },
  { id: 2, label: 'Elaboração de Projeto', status: 'completed', date: '05 Set, 2026', desc: 'Engenharia dimensionou e desenhou o sistema.' },
  { id: 3, label: 'Envio à Concessionária', status: 'completed', date: '10 Set, 2026', desc: 'Projeto protocolado na concessionária de energia.' },
  { id: 4, label: 'Aprovação da Concessionária', status: 'completed', date: '15 Set, 2026', desc: 'Parecer de acesso liberado pela concessionária.' },
  { id: 5, label: 'Logística de Entrega', status: 'current', date: 'Em andamento', desc: 'Equipamentos em trânsito para o local da obra. Previsão de chegada: 18 Set, 2026.' },
  { id: 6, label: 'Instalação', status: 'future', date: 'Pendente', desc: 'Montagem das estruturas e fixação dos módulos.' },
  { id: 7, label: 'Homologação', status: 'future', date: 'Pendente', desc: 'Vistoria da concessionária e troca do medidor.' },
  { id: 8, label: 'Comissionamento', status: 'future', date: 'Pendente', desc: 'Testes finais e ativação do sistema.' },
  { id: 9, label: 'Finalizado', status: 'future', date: 'Pendente', desc: 'Sistema gerando energia! Entrega do manual do usuário.' },
];

const PortalTracking: React.FC = () => {
  const navigate = useNavigate();
  const { client, logout } = usePortal();
  const completedCount = mockPhases.filter(p => p.status === 'completed').length;
  const progressPercent = Math.round((completedCount / (mockPhases.length - 1)) * 100);

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-quark-bg text-zinc-200 font-sans pb-10">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/portal/dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/30 text-lime-400 font-display font-bold">
              Q
            </div>
            <span className="font-display font-bold text-white tracking-tight hidden sm:block">Portal Quark Energia</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl">
                <MapPin size={24} />
              </div>
              Acompanhe sua Obra
            </h1>
            <p className="text-zinc-500 text-sm">Transparência total em cada etapa do seu projeto.</p>
          </div>
          <button 
            onClick={() => navigate('/portal/tickets')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors text-sm font-medium"
          >
            <Headphones size={18} />
            Falar com Suporte
          </button>
        </div>

        {/* Project Info Card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cliente</span>
              <span className="text-sm text-white font-medium">{client?.name || 'Cliente'}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-zinc-500 uppercase mb-1">Sistema</span>
              <span className="text-sm text-white font-medium">8.5 kWp</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-zinc-500 uppercase mb-1">Local</span>
              <span className="text-sm text-white font-medium flex items-center gap-1"><Navigation size={14} className="text-zinc-400"/> São Paulo, SP</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-zinc-500 uppercase mb-1">Início</span>
              <span className="text-sm text-white font-medium flex items-center gap-1"><Calendar size={14} className="text-zinc-400"/> 01/09/2026</span>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-zinc-400">Progresso Geral</span>
              <span className="text-lime-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-lime-500 rounded-full" 
              />
            </div>
          </div>
        </div>

        {/* Vertical Timeline */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 relative">
          <div className="absolute left-[39px] sm:left-[47px] top-10 bottom-10 w-0.5 bg-zinc-800 z-0"></div>
          
          <div className="space-y-8 relative z-10">
            {mockPhases.map((phase, index) => (
              <motion.div 
                key={phase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
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
                      <div className="absolute inset-0 rounded-full border border-orange-400 animate-ping opacity-50"></div>
                      <Clock size={18} className="sm:w-5 sm:h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-700 text-zinc-600">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-2 ${phase.status === 'current' ? 'bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl' : 'pt-1 sm:pt-2'}`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1.5">
                    <h3 className={`font-bold ${
                      phase.status === 'completed' ? 'text-zinc-100' : 
                      phase.status === 'current' ? 'text-orange-400 text-lg' : 'text-zinc-500'
                    }`}>
                      {phase.label}
                    </h3>
                    <span className={`text-xs font-medium ${phase.status === 'future' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {phase.date}
                    </span>
                  </div>
                  {(phase.status === 'completed' || phase.status === 'current') && (
                    <p className={`text-sm mt-1 ${phase.status === 'current' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      {phase.desc}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PortalTracking;
