import React from 'react';
import { 
  Sun, TrendingUp, Wrench, HardHat, Headphones, MapPin, CreditCard, 
  ShoppingBag, LogOut, CheckCircle2, AlertTriangle, Activity, ChevronRight,
  ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, 
  Line, Legend 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { usePortal } from '../../contexts/PortalContext';
import { useClientTelemetry } from '../../hooks/useClientTelemetry';

const fallbackChartData = [
  { month: 'Mai/26', geracao: 480, consumo: 390 },
  { month: 'Jun/26', geracao: 450, consumo: 370 },
  { month: 'Jul/26', geracao: 510, consumo: 410 },
  { month: 'Ago/26', geracao: 530, consumo: 430 },
  { month: 'Set/26', geracao: 495, consumo: 405 },
  { month: 'Out/26', geracao: 520, consumo: 420 },
];

const PortalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { client, logout } = usePortal();
  const clientName = client?.name || 'Cliente';
  const clientId = client?.id;

  // Telemetria Solar
  const { data: telemetry, isLoading: loadingTelemetry } = useClientTelemetry(clientId);

  // Status da Obra / Projeto
  const { data: projectData, isLoading: loadingProject } = useQuery({
    queryKey: ['portal-project-status', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      try {
        const res = await fetch(`/api/portal/project/${clientId}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.success) return json;
        }
      } catch (err) {
        console.warn('[PortalDashboard] Erro ao carregar projeto:', err);
      }
      return null;
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2, // 2 min
  });

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Não agendada';
    return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const chartData = (telemetry?.chart_data && telemetry.chart_data.length > 0) 
    ? telemetry.chart_data 
    : fallbackChartData;

  const systemHealth = telemetry?.system_health || 'Operação Normal - Eficiência 98%';
  const isHealthWarning = systemHealth.toLowerCase().includes('limpeza') || systemHealth.toLowerCase().includes('atenção');

  const completionPercent = projectData?.completion_percent ?? 70;
  const currentPhaseLabel = projectData?.current_phase?.label || projectData?.current_phase?.phase_label || 'Em Instalação e Montagem';

  return (
    <div className="min-h-screen bg-[#090d16] text-zinc-200 font-sans pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#0c1222]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/40 text-lime-400 font-display font-bold">
              Q
            </div>
            <span className="font-display font-bold text-white tracking-tight hidden sm:block">
              Portal Quark Energia
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs sm:text-sm font-medium text-zinc-400">{clientName}</span>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Sair do Portal"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Greeting & Health Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Olá, {clientName}! 👋
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Badge de Saúde da Usina Dinâmico */}
          <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 shadow-lg ${
            isHealthWarning 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isHealthWarning ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                isHealthWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </span>
            <div className="text-left">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                Saúde do Sistema Solar
              </span>
              <span className="text-xs font-semibold">
                {systemHealth}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Status da Obra / Instalação */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 block">
                  Status da Sua Usina Solar
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Fase atual: <span className="text-orange-300">{currentPhaseLabel}</span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => navigate('/portal/tracking')}
              className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center gap-1 group py-1.5 px-3 rounded-lg hover:bg-lime-500/10 transition-colors"
            >
              Acompanhar Linha do Tempo
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400 font-medium">
              <span>Evolução do Projeto</span>
              <span className="text-lime-400 font-mono font-bold">{completionPercent}% Concluído</span>
            </div>
            <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5 p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-lime-500 to-emerald-400 rounded-full shadow-lg shadow-lime-500/20"
              />
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              title: 'Geração Mensal', 
              value: telemetry?.monthly_generation_kwh ? `${telemetry.monthly_generation_kwh} kWh` : '0 kWh', 
              icon: Sun, 
              color: 'text-yellow-400', 
              bg: 'bg-yellow-400/10' 
            },
            { 
              title: 'Economia Acumulada', 
              value: formatCurrency(telemetry?.total_savings_brl || 0), 
              icon: TrendingUp, 
              color: 'text-emerald-400', 
              bg: 'bg-emerald-400/10' 
            },
            { 
              title: 'Próxima Manutenção', 
              value: formatDate(telemetry?.next_maintenance_date || ''), 
              icon: Wrench, 
              color: 'text-blue-400', 
              bg: 'bg-blue-400/10' 
            },
            { 
              title: 'Tamanho do Sistema', 
              value: telemetry?.system_size_kw ? `${telemetry.system_size_kw} kWp` : '6.6 kWp', 
              icon: HardHat, 
              color: 'text-lime-400', 
              bg: 'bg-lime-400/10' 
            },
          ].map((kpi, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08 }}
              className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon size={22} />
              </div>
              <div>
                <h3 className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider mb-1">
                  {kpi.title}
                </h3>
                <p className="text-xl font-display font-bold text-zinc-100">{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              title: 'Meus Chamados', 
              icon: Headphones, 
              path: '/portal/tickets', 
              color: 'hover:border-purple-500/50', 
              iconColor: 'text-purple-400',
              desc: 'Suporte técnico direto'
            },
            { 
              title: 'Acompanhar Obra', 
              icon: MapPin, 
              path: '/portal/tracking', 
              color: 'hover:border-orange-500/50', 
              iconColor: 'text-orange-400',
              desc: 'Etapas da instalação'
            },
            { 
              title: 'Serviços & Pagamentos', 
              icon: CreditCard, 
              path: '/portal/payments', 
              color: 'hover:border-blue-500/50', 
              iconColor: 'text-blue-400',
              desc: 'Manutenção e vistorias'
            },
            { 
              title: 'Loja & Fidelidade', 
              icon: ShoppingBag, 
              path: '/portal/ecommerce', 
              color: 'hover:border-lime-500/50', 
              iconColor: 'text-lime-400',
              desc: 'Pontos e indicações'
            },
          ].map((link, idx) => (
            <motion.button
              key={idx}
              onClick={() => navigate(link.path)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.05 }}
              className={`glass-panel p-5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${link.color} group active:scale-98 text-left border border-white/5`}
            >
              <div className={`p-3.5 rounded-xl bg-zinc-900 group-hover:bg-zinc-800 transition-colors ${link.iconColor} shrink-0`}>
                <link.icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm text-zinc-200 group-hover:text-white block truncate">
                  {link.title}
                </span>
                <span className="text-xs text-zinc-500 block truncate">
                  {link.desc}
                </span>
              </div>
              <ArrowUpRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
            </motion.button>
          ))}
        </div>

        {/* Charts & Live Feed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dynamic Recharts Chart */}
          <motion.div 
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
              <div>
                <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                  <Activity size={18} className="text-lime-400" /> Histórico de Geração & Eficiência
                </h3>
                <p className="text-xs text-zinc-400">
                  Valores mensais de energia gerada (kWh) capturados pela inteligência Quark
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-lime-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400" /> Geração Real
                </span>
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Consumo Médio
                </span>
              </div>
            </div>

            <div className="h-[270px] w-full -ml-3 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b" 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10} 
                    fontSize={11} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tickLine={false} 
                    axisLine={false} 
                    dx={-8} 
                    fontSize={11} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '12px', 
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                    cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="geracao" 
                    name="Geração (kWh)" 
                    stroke="#a3e635" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, fill: '#0f172a', strokeWidth: 2, stroke: '#a3e635' }} 
                    activeDot={{ r: 6, fill: '#a3e635', strokeWidth: 0 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="consumo" 
                    name="Consumo (kWh)" 
                    stroke="#60a5fa" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#0f172a', strokeWidth: 1.5, stroke: '#60a5fa' }} 
                    activeDot={{ r: 5, fill: '#60a5fa', strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div 
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-panel p-6 rounded-2xl flex flex-col border border-white/10"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white tracking-tight text-sm">
                Atualizações do Sistema
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Em tempo real</span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1 max-h-[270px]">
              {/* Evento 1: Fase da Obra */}
              <div className="relative pl-4 border-l border-orange-500/40">
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-orange-400" />
                <p className="text-xs text-zinc-200 font-semibold">{currentPhaseLabel}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Etapa em andamento na concessionária</p>
              </div>

              {/* Evento 2: Telemetria */}
              <div className="relative pl-4 border-l border-lime-500/40">
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-lime-400" />
                <p className="text-xs text-zinc-200 font-semibold">{systemHealth}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Auditoria contínua de eficiência solar</p>
              </div>

              {/* Evento 3: Manutenção */}
              <div className="relative pl-4 border-l border-blue-500/40">
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-blue-400" />
                <p className="text-xs text-zinc-200 font-semibold">
                  Próxima revisão agendada: {formatDate(telemetry?.next_maintenance_date || '')}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Inspeção periódica recomendada</p>
              </div>

              {/* Evento 4: Fidelidade */}
              <div className="relative pl-4 border-l border-purple-500/40">
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-purple-400" />
                <p className="text-xs text-zinc-200 font-semibold">Programa Quark Points Ativo</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Indique amigos e ganhe 1.000 pts por usina</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PortalDashboard;
