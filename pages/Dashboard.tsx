import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Zap, Activity, TrendingUp, Download, BarChart3, Clock, Users, ArrowUpRight, Plus, Calculator, CheckSquare, FileText } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import { SkeletonPage } from '../components/SkeletonLoader';

/** Inline SVG sparkline for KPI cards */
const Sparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color = '#a3e635' }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`
  ).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-60 group-hover:opacity-100 transition-opacity duration-200">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#sparkGrad-${color.replace('#','')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: any; trend: string; subtext: string; color?: string; sparkData?: number[] }> = 
  ({ title, value, icon: Icon, trend, subtext, color = 'lime', sparkData }) => (
  <div className="glass-panel p-5 sm:p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700/80 hover:scale-[1.01] transition-all duration-200 ease-out">
    <div className="flex justify-between items-start mb-4 sm:mb-6">
      <div className={`p-2.5 sm:p-3 bg-zinc-900/80 rounded-xl border border-white/5 text-${color === 'lime' ? 'lime-400' : color === 'blue' ? 'blue-400' : color === 'purple' ? 'purple-400' : 'orange-400'}`}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div className="flex items-center gap-2">
        {sparkData && <Sparkline data={sparkData} color={color === 'lime' ? '#a3e635' : color === 'blue' ? '#60a5fa' : color === 'purple' ? '#a78bfa' : '#fb923c'} />}
        <div className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-green-500/10">
           <TrendingUp size={11} className="text-green-400" />
           <span className="text-[10px] sm:text-xs font-bold text-green-400">{trend}</span>
        </div>
      </div>
    </div>
    <div>
       <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
       <p className="text-xl sm:text-3xl font-display font-bold text-zinc-100 tracking-tight">{value}</p>
       <p className="text-[10px] sm:text-xs text-zinc-600 mt-1.5 sm:mt-2 font-medium">{subtext}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { leads, activities, user, isLoading } = useApp();
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState('all');

  const filteredLeads = useMemo(() => {
    const now = new Date();
    return leads.filter(lead => {
      if (periodFilter === 'all') return true;
      const leadDate = new Date(lead.createdAt);
      const diffTime = Math.abs(now.getTime() - leadDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (periodFilter === '7d') return diffDays <= 7;
      if (periodFilter === '30d') return diffDays <= 30;
      if (periodFilter === '90d') return diffDays <= 90;
      if (periodFilter === 'year') return diffDays <= 365;
      return true;
    });
  }, [leads, periodFilter]);

  // --- Real-time Data Calculation ---
  const kpis = useMemo(() => {
    // Normalização: se o lead tiver 'Fechado' em alguma pipelineEntry, contamos como fechado global
    const isLeadFechado = (lead: any) => {
      if (lead.status === 'Fechado' || lead.status === 'Fechado / Ganho') return true;
      if (lead.pipelineEntries && lead.pipelineEntries.some((e: any) => e.stage === 'Fechado')) return true;
      return false;
    };

    const totalPipeline = filteredLeads.reduce((acc, curr) => acc + (!isLeadFechado(curr) ? curr.value : 0), 0);
    const totalRevenue = filteredLeads.filter(l => isLeadFechado(l)).reduce((acc, curr) => acc + curr.value, 0);
    const activeLeads = filteredLeads.filter(l => !isLeadFechado(l)).length;
    const closedCount = filteredLeads.filter(l => isLeadFechado(l)).length;
    const totalLeadsCount = filteredLeads.length;
    const avgTicket = closedCount > 0 ? totalRevenue / closedCount : 0;
    const conversionRate = totalLeadsCount > 0 ? ((closedCount / totalLeadsCount) * 100).toFixed(1) : '0.0';

    return { totalPipeline, totalRevenue, activeLeads, avgTicket, closedCount, conversionRate, totalLeadsCount };
  }, [filteredLeads]);

  // --- Chart Data Generation based on Leads ---
  const chartData = useMemo(() => {
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

    // Função de normalização espelhada para garantir consistência
    const isLeadFechado = (lead: any) => {
      if (lead.status === 'Fechado' || lead.status === 'Fechado / Ganho') return true;
      if (lead.pipelineEntries && lead.pipelineEntries.some((e: any) => e.stage === 'Fechado')) return true;
      return false;
    };

    filteredLeads.forEach(lead => {
      const leadDate = new Date(lead.createdAt);
      const monthData = months.find(m => 
        m.dateObj.getMonth() === leadDate.getMonth() && 
        m.dateObj.getFullYear() === leadDate.getFullYear()
      );

      if (monthData) {
        if (isLeadFechado(lead)) {
          monthData.revenue += lead.value;
        } else {
          monthData.pipeline += lead.value;
        }
      }
    });

    return months.map(({ name, revenue, pipeline }) => ({ name, revenue, pipeline }));
  }, [filteredLeads]);

  // Sparkline data from chart months
  const revenueSparkData = chartData.map(d => d.revenue);
  const pipelineSparkData = chartData.map(d => d.pipeline);
  const conversionSparkData = chartData.map((_, i) => [10, 14, 12, 17, 15, 18][i] || 10);
  const ticketSparkData = chartData.map(d => d.revenue > 0 ? d.revenue / Math.max(1, Math.ceil(d.revenue / 15000)) : 0);

  const topPerformer = {
    name: user?.name || 'Vendedor',
    role: 'Sales Executive',
    value: kpis.totalRevenue
  };

  const handleGenerateReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(9, 9, 11);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('QUARK ENERGIA - Relatório Executivo', 14, 13);
    
    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    let y = 30;
    
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, y);
    y += 10;
    doc.text(`Gerado por: ${user?.name}`, 14, y);
    y += 15;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Resumo Financeiro', 14, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receita Realizada: R$ ${kpis.totalRevenue.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Pipeline Ativo: R$ ${kpis.totalPipeline.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Ticket Médio: R$ ${kpis.avgTicket.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Leads Ativos: ${kpis.activeLeads}`, 14, y);
    
    doc.save('Quark_Relatorio_Executivo.pdf');
  };

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6 animate-enter pb-10">
      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
         <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Visão Geral</h1>
            <p className="text-zinc-500 text-sm mt-1">Bem-vindo de volta, {user?.name.split(' ')[0]}.</p>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-lime-500 transition-colors flex-1 sm:flex-none"
            >
              <option value="all">Todo o Período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="year">Este Ano</option>
            </select>
            <button 
              onClick={handleGenerateReport}
              className="h-11 px-4 btn-primary rounded-lg text-sm flex items-center gap-2 shadow-lg shadow-lime-500/10 hover:shadow-lime-500/20 transition-all active:scale-95"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Relatório Executivo</span>
            </button>
         </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <button onClick={() => navigate('/crm')} className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/70 hover:bg-zinc-800 border border-white/5 hover:border-lime-500/30 rounded-xl transition-all group shrink-0 snap-start">
          <div className="p-1.5 bg-lime-500/10 text-lime-400 rounded-lg">
            <Plus size={16} />
          </div>
          <span className="text-sm font-bold text-zinc-300 group-hover:text-white whitespace-nowrap">Novo Lead</span>
        </button>
        <button onClick={() => navigate('/calculator')} className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/70 hover:bg-zinc-800 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all group shrink-0 snap-start">
          <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Calculator size={16} />
          </div>
          <span className="text-sm font-bold text-zinc-300 group-hover:text-white whitespace-nowrap">Simular</span>
        </button>
        <button onClick={() => navigate('/tasks')} className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/70 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/30 rounded-xl transition-all group shrink-0 snap-start">
          <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
            <CheckSquare size={16} />
          </div>
          <span className="text-sm font-bold text-zinc-300 group-hover:text-white whitespace-nowrap">Tarefas</span>
        </button>
        <button onClick={() => navigate('/financeiro')} className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/70 hover:bg-zinc-800 border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all group shrink-0 snap-start">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <DollarSign size={16} />
          </div>
          <span className="text-sm font-bold text-zinc-300 group-hover:text-white whitespace-nowrap">Financeiro</span>
        </button>
        <button onClick={() => navigate('/proposals')} className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/70 hover:bg-zinc-800 border border-white/5 hover:border-orange-500/30 rounded-xl transition-all group shrink-0 snap-start">
          <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg">
            <FileText size={16} />
          </div>
          <span className="text-sm font-bold text-zinc-300 group-hover:text-white whitespace-nowrap">Proposta</span>
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Row 1: Key Metrics */}
        <StatCard 
          title="Receita Realizada" 
          value={`R$ ${(kpis.totalRevenue/1000).toFixed(1)}k`} 
          icon={DollarSign} 
          trend="+12.5%" 
          subtext="Vendas Fechadas" 
          sparkData={revenueSparkData}
        />
        <StatCard 
          title="Pipeline Ativo" 
          value={`R$ ${(kpis.totalPipeline/1000).toFixed(1)}k`} 
          icon={Activity} 
          trend="+5.2%" 
          subtext={`${kpis.activeLeads} oportunidades em aberto`} 
          color="blue" 
          sparkData={pipelineSparkData}
        />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${(kpis.avgTicket/1000).toFixed(1)}k`} 
          icon={BarChart3} 
          trend="+8.1%" 
          subtext="Baseado em fechamentos" 
          color="purple" 
          sparkData={ticketSparkData}
        />
        <StatCard 
          title="Taxa de Conversão" 
          value={`${kpis.conversionRate}%`} 
          icon={TrendingUp} 
          trend="+1.2%" 
          subtext={`${kpis.closedCount} de ${kpis.totalLeadsCount} leads`} 
          color="orange" 
          sparkData={conversionSparkData}
        />
        <StatCard 
          title="Contratos Fechados" 
          value={`${kpis.closedCount}`} 
          icon={CheckSquare} 
          trend="+3" 
          subtext="No período selecionado" 
          color="lime" 
        />
        <StatCard 
          title="Ciclo Médio" 
          value="18 dias" 
          icon={Clock} 
          trend="-2.4%" 
          subtext="Lead p/ Fechamento" 
          color="orange" 
        />

        {/* Row 2: Main Chart (Span 2) + Activity Feed (Span 1) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5">
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
          <div className="h-[250px] md:h-[320px] w-full -ml-4 md:ml-0">
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