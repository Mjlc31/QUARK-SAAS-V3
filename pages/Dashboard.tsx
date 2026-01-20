import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Zap, Activity, TrendingUp, Download, BarChart3, Clock, Users, ArrowUpRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const StatCard: React.FC<{ title: string; value: string; icon: any; trend: string; subtext: string; color?: string }> = ({ title, value, icon: Icon, trend, subtext, color = 'lime' }) => (
  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 bg-zinc-900/80 rounded-xl border border-white/5 text-${color === 'lime' ? 'lime-400' : color === 'blue' ? 'blue-400' : color === 'purple' ? 'purple-400' : 'orange-400'}`}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div className="flex items-center gap-1 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/10">
         <TrendingUp size={12} className="text-green-400" />
         <span className="text-xs font-bold text-green-400">{trend}</span>
      </div>
    </div>
    <div>
       <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
       <p className="text-3xl font-display font-bold text-zinc-100 tracking-tight">{value}</p>
       <p className="text-xs text-zinc-600 mt-2 font-medium">{subtext}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { leads, activities, user } = useApp();

  // --- Real-time Data Calculation ---
  const kpis = useMemo(() => {
    const totalPipeline = leads.reduce((acc, curr) => acc + (curr.status !== 'Fechado' ? curr.value : 0), 0);
    const totalRevenue = leads.filter(l => l.status === 'Fechado').reduce((acc, curr) => acc + curr.value, 0);
    const activeLeads = leads.filter(l => l.status !== 'Fechado').length;
    const closedCount = leads.filter(l => l.status === 'Fechado').length;
    const avgTicket = closedCount > 0 ? totalRevenue / closedCount : 0;

    return { totalPipeline, totalRevenue, activeLeads, avgTicket };
  }, [leads]);

  // --- Chart Data Generation based on Leads ---
  const chartData = useMemo(() => {
    // 1. Initialize last 6 months with Explicit Type to fix Build Error
    const months: { dateObj: Date; name: string; revenue: number; pipeline: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        dateObj: d,
        name: d.toLocaleDateString('pt-BR', { month: 'short' }),
        revenue: 0,
        pipeline: 0
      });
    }

    // 2. Populate with Lead Data
    leads.forEach(lead => {
      const leadDate = new Date(lead.createdAt);
      // Find matching month in our array
      const monthData = months.find(m => 
        m.dateObj.getMonth() === leadDate.getMonth() && 
        m.dateObj.getFullYear() === leadDate.getFullYear()
      );

      if (monthData) {
        if (lead.status === 'Fechado') {
          monthData.revenue += lead.value;
        } else {
          monthData.pipeline += lead.value;
        }
      }
    });

    // 3. Clean up object for Recharts
    return months.map(({ name, revenue, pipeline }) => ({ name, revenue, pipeline }));
  }, [leads]);

  const topPerformer = {
    name: user?.name || 'Vendedor',
    role: 'Sales Executive',
    value: kpis.totalRevenue
  };

  return (
    <div className="space-y-6 animate-enter pb-10">
      {/* Search & Actions Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Visão Geral</h1>
            <p className="text-zinc-500 mt-1">Bem-vindo de volta, {user?.name.split(' ')[0]}.</p>
         </div>
         <div className="flex gap-2">
            <button className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
              Exportar Dados
            </button>
            <button className="h-10 px-4 btn-primary rounded-lg text-sm flex items-center gap-2 shadow-lg shadow-lime-500/10">
              <Download size={16} /> Relatório PDF
            </button>
         </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Row 1: Key Metrics (Connected to Real Data) */}
        <StatCard 
          title="Receita Realizada" 
          value={`R$ ${(kpis.totalRevenue/1000).toFixed(1)}k`} 
          icon={DollarSign} 
          trend="+12.5%" 
          subtext="Vendas Fechadas" 
        />
        <StatCard 
          title="Pipeline Ativo" 
          value={`R$ ${(kpis.totalPipeline/1000).toFixed(1)}k`} 
          icon={Activity} 
          trend="+5.2%" 
          subtext={`${kpis.activeLeads} oportunidades em aberto`} 
          color="blue" 
        />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${(kpis.avgTicket/1000).toFixed(1)}k`} 
          icon={BarChart3} 
          trend="+8.1%" 
          subtext="Baseado em fechamentos" 
          color="purple" 
        />
        <StatCard 
          title="Ciclo Médio" 
          value="18 dias" 
          icon={Clock} 
          trend="-2.4%" 
          subtext="Lead p/ Fechamento" 
          color="orange" 
        />

        {/* Row 2: Main Chart (Span 3) + Activity Feed (Span 1) */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="text-lg font-bold text-white tracking-tight">Performance Financeira</h3>
               <p className="text-xs text-zinc-500">Receita Real vs. Oportunidades (Últimos 6 meses)</p>
             </div>
             <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-2 text-zinc-400"><div className="w-2 h-2 rounded-full bg-lime-500"></div>Receita</span>
                <span className="flex items-center gap-2 text-zinc-400"><div className="w-2 h-2 rounded-full bg-zinc-600"></div>Pipeline</span>
             </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a3e635" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" tickLine={false} axisLine={false} dy={10} fontSize={12} />
                <YAxis stroke="#52525b" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} dx={-10} fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  cursor={{stroke: '#3f3f46', strokeWidth: 1}}
                  formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="#a3e635" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{r: 6, strokeWidth: 0, fill: '#fff'}} />
                <Area type="monotone" dataKey="pipeline" name="Pipeline" stroke="#52525b" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Ao Vivo
            </h3>
            <span className="text-xs text-zinc-500">Hoje</span>
          </div>
          
          <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
             {activities.length === 0 ? (
               <p className="text-xs text-zinc-600">Nenhuma atividade recente.</p>
             ) : (
               activities.map(act => (
                 <div key={act.id} className="relative pl-4 border-l border-zinc-800">
                    <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700"></div>
                    <p className="text-xs text-zinc-300">
                      <span className="font-bold text-white">{act.user}</span> {act.action} <span className="text-lime-400">{act.target}</span>
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">{act.time}</p>
                 </div>
               ))
             )}
          </div>
          <button className="mt-4 w-full py-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 rounded-lg border border-zinc-800 transition-colors">
            Ver Tudo
          </button>
        </div>

        {/* Row 3: Goals & Strategy */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-white/5">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-white">Metas do Trimestre (Q4)</h3>
              <ArrowUpRight size={18} className="text-zinc-500" />
           </div>
           <div className="space-y-5">
             <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                   <span className="text-zinc-400">Receita Recorrente</span>
                   <span className="text-lime-400">82%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                   <div className="h-full bg-lime-500 rounded-full" style={{ width: '82%' }}></div>
                </div>
             </div>
             <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                   <span className="text-zinc-400">Novos Contratos Enterprise</span>
                   <span className="text-blue-400">45%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                </div>
             </div>
           </div>
        </div>

        <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-white/5">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-white">Top Performance</h3>
              <Users size={18} className="text-zinc-500" />
           </div>
           <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-lime-500/20 flex items-center justify-center text-sm font-bold text-white">
                 {topPerformer.name.substring(0, 2).toUpperCase()}
               </div>
               <div className="flex-1">
                 <p className="text-white font-bold">{topPerformer.name}</p>
                 <p className="text-xs text-zinc-500">{topPerformer.role}</p>
               </div>
               <div className="text-right">
                 <p className="text-lime-400 font-bold font-display text-lg">R$ {(topPerformer.value/1000).toFixed(0)}k</p>
                 <p className="text-[10px] text-zinc-600 font-bold uppercase">Volume Fechado</p>
               </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;