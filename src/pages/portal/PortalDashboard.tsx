import React from 'react';
import { Sun, TrendingUp, Wrench, HardHat, Headphones, MapPin, CreditCard, ShoppingBag, LogOut } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { usePortal } from '../../contexts/PortalContext';
import { useClientTelemetry } from '../../hooks/useClientTelemetry';

const mockChartData = [
  { month: 'Abr', geracao: 450 },
  { month: 'Mai', geracao: 480 },
  { month: 'Jun', geracao: 410 },
  { month: 'Jul', geracao: 520 },
  { month: 'Ago', geracao: 490 },
  { month: 'Set', geracao: 520 },
];

const mockActivities = [
  { id: 1, text: 'Ticket #123 resolvido', date: 'Hoje, 10:30' },
  { id: 2, text: 'Fatura de setembro capturada', date: 'Ontem, 14:15' },
  { id: 3, text: 'Status atualizado para: Em Instalação', date: '15 de Setembro' },
  { id: 4, text: 'Pagamento de Manutenção Confirmado', date: '10 de Setembro' },
];

const PortalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { client, logout } = usePortal();
  const clientName = client?.name || 'Cliente';
  const { data: telemetry } = useClientTelemetry();

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

  return (
    <div className="min-h-screen bg-quark-bg text-zinc-200 font-sans pb-10">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/30 text-lime-400 font-display font-bold">
              Q
            </div>
            <span className="font-display font-bold text-white tracking-tight hidden sm:block">Portal Quark Energia</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-400">{clientName}</span>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Olá, {clientName}! 👋
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Geração Mensal', value: telemetry?.monthly_generation_kwh ? `${telemetry.monthly_generation_kwh} kWh` : '0 kWh', icon: Sun, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            { title: 'Economia Acumulada', value: formatCurrency(telemetry?.total_savings_brl || 0), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { title: 'Próxima Manutenção', value: formatDate(telemetry?.next_maintenance_date || ''), icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { title: 'Tamanho do Sistema', value: telemetry?.system_size_kw ? `${telemetry.system_size_kw} kWp` : 'N/A', icon: HardHat, color: 'text-lime-400', bg: 'bg-lime-400/10' },
          ].map((kpi, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-panel p-5 rounded-2xl flex items-center gap-4"
            >
              <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon size={24} />
              </div>
              <div>
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{kpi.title}</h3>
                <p className="text-xl font-display font-bold text-zinc-100">{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Meus Chamados', icon: Headphones, path: '/portal/tickets', color: 'hover:border-purple-500/50', iconColor: 'text-purple-400' },
            { title: 'Acompanhar Obra', icon: MapPin, path: '/portal/tracking', color: 'hover:border-orange-500/50', iconColor: 'text-orange-400' },
            { title: 'Serviços & Pagamentos', icon: CreditCard, path: '/portal/payments', color: 'hover:border-blue-500/50', iconColor: 'text-blue-400' },
            { title: 'Loja Quark', icon: ShoppingBag, path: '/portal/ecommerce', color: 'hover:border-lime-500/50', iconColor: 'text-lime-400' },
          ].map((link, idx) => (
            <motion.button
              key={idx}
              onClick={() => navigate(link.path)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className={`glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 ${link.color} group active:scale-95`}
            >
              <div className={`p-4 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors ${link.iconColor}`}>
                <link.icon size={28} />
              </div>
              <span className="font-bold text-zinc-300 group-hover:text-white">{link.title}</span>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-panel p-6 rounded-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-white tracking-tight">Geração de Energia</h3>
                <p className="text-xs text-zinc-500">Últimos 6 meses (kWh)</p>
              </div>
            </div>
            <div className="h-[250px] w-full -ml-4 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#52525b" tickLine={false} axisLine={false} dy={10} fontSize={12} />
                  <YAxis stroke="#52525b" tickLine={false} axisLine={false} dx={-10} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#a3e635' }}
                    cursor={{stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '5 5'}}
                  />
                  <Line type="monotone" dataKey="geracao" name="Geração (kWh)" stroke="#a3e635" strokeWidth={3} dot={{r: 4, fill: '#18181b', strokeWidth: 2}} activeDot={{r: 6, fill: '#a3e635', strokeWidth: 0}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-panel p-6 rounded-2xl flex flex-col"
          >
            <h3 className="font-bold text-white tracking-tight mb-6">Atividades Recentes</h3>
            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 max-h-[250px]">
              {mockActivities.map(act => (
                <div key={act.id} className="relative pl-4 border-l border-zinc-800">
                  <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-lime-500"></div>
                  <p className="text-sm text-zinc-300 font-medium">{act.text}</p>
                  <p className="text-xs text-zinc-500 mt-1">{act.date}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PortalDashboard;
