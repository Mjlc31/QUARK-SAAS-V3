import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Zap, Activity, Target, TrendingUp, Download, Calendar, BarChart3, Clock, Users } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const initialData = [
  { name: 'Jan', revenue: 42000, pipeline: 65000 },
  { name: 'Fev', revenue: 35000, pipeline: 58000 },
  { name: 'Mar', revenue: 68000, pipeline: 85000 },
  { name: 'Abr', revenue: 52000, pipeline: 72000 },
  { name: 'Mai', revenue: 78000, pipeline: 95000 },
  { name: 'Jun', revenue: 85000, pipeline: 120000 },
];

const StatCard: React.FC<{ title: string; value: string; icon: any; trend: string; subtext: string; color?: string }> = ({ title, value, icon: Icon, trend, subtext, color = 'lime' }) => (
  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-lime-500/30 transition-all duration-300">
    <div className={`absolute right-0 top-0 w-32 h-32 bg-${color}-500/5 rounded-full blur-3xl group-hover:bg-${color}-500/10 transition-all`}></div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-3 bg-white/5 rounded-xl border border-white/5 text-${color}-400`}>
        <Icon size={24} />
      </div>
      <div className="flex flex-col items-end">
         <span className="text-xs font-bold text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
           <TrendingUp size={10} /> {trend}
         </span>
      </div>
    </div>
    <div className="relative z-10">
       <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
       <p className="text-3xl font-display font-bold text-white tracking-tight">{value}</p>
       <p className="text-xs text-slate-500 mt-2">{subtext}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { leads } = useApp();
  const [timeRange, setTimeRange] = useState('30d');

  // Calculate KPIs dynamically
  const totalPipelineValue = leads.reduce((acc, curr) => acc + curr.value, 0);
  const activeLeads = leads.length;
  const closedLeads = leads.filter(l => l.status === 'Fechado').length;
  const avgTicket = closedLeads > 0 ? (leads.filter(l => l.status === 'Fechado').reduce((acc, curr) => acc + curr.value, 0) / closedLeads) : 0;

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-enter pb-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h2 className="text-3xl font-display font-bold text-white mb-2">Visão Estratégica</h2>
            <p className="text-slate-400">Performance comercial e projeções de crescimento.</p>
         </div>
         <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <button 
              onClick={() => setTimeRange(timeRange === '30d' ? '90d' : '30d')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white border border-white/10 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
               <Calendar size={16} />
               {timeRange === '30d' ? '30 Dias' : 'Trimestre'}
            </button>
            <button 
              onClick={handlePrintReport}
              className="px-4 py-2 bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/20 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
               <Download size={16} /> Relatório
            </button>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Receita Realizada" 
          value="R$ 360k" 
          icon={DollarSign} 
          trend="+12.5%" 
          subtext="Meta: R$ 400k (90%)"
        />
        <StatCard 
          title="Pipeline Ponderado" 
          value={`R$ ${(totalPipelineValue/1000).toFixed(0)}k`} 
          icon={Activity} 
          trend="+5.2%" 
          subtext={`${activeLeads} oportunidades ativas`}
          color="blue"
        />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${(avgTicket/1000).toFixed(1)}k`} 
          icon={BarChart3} 
          trend="+8.1%" 
          subtext="Vendas Enterprise"
          color="purple"
        />
        <StatCard 
          title="Ciclo de Vendas" 
          value="24 dias" 
          icon={Clock} 
          trend="-2.4%" 
          subtext="Tempo médio fechamento"
          color="orange"
        />
      </div>

      {/* Strategic Goals & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-white">Curva de Crescimento</h3>
             <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-2 text-slate-400"><div className="w-2 h-2 rounded-full bg-lime-500"></div>Realizado</span>
                <span className="flex items-center gap-2 text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-500"></div>Forecast</span>
             </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={initialData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#84cc16" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="pipeline" stroke="#475569" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goals Progress */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Metas Trimestrais</h3>
            <div className="space-y-6">
               <div>
                  <div className="flex justify-between text-sm mb-2">
                     <span className="text-slate-300">Faturamento (R$ 1.2M)</span>
                     <span className="text-lime-400 font-bold">75%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-lime-500 rounded-full" style={{ width: '75%' }}></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-sm mb-2">
                     <span className="text-slate-300">Novos Contratos (15)</span>
                     <span className="text-blue-400 font-bold">60%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-sm mb-2">
                     <span className="text-slate-300">Potência (500 kWp)</span>
                     <span className="text-purple-400 font-bold">90%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-purple-500 rounded-full" style={{ width: '90%' }}></div>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10">
            <h4 className="text-sm font-bold text-slate-400 mb-3">Top Performance</h4>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-lime-500/50">AA</div>
               <div>
                 <p className="text-white font-semibold text-sm">Anderson Alves</p>
                 <p className="text-xs text-lime-400">R$ 185k (51%)</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;