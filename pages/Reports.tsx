import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, Download, Target, Users, Wallet } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const COLORS = ['#84cc16', '#3b82f6', '#eab308', '#ef4444'];

const dataSales = [
  { name: 'Seg', leads: 4, vendas: 1 },
  { name: 'Ter', leads: 7, vendas: 2 },
  { name: 'Qua', leads: 5, vendas: 1 },
  { name: 'Qui', leads: 9, vendas: 3 },
  { name: 'Sex', leads: 12, vendas: 5 },
  { name: 'Sáb', leads: 3, vendas: 0 },
];

const dataSource = [
  { name: 'Google Ads', value: 45 },
  { name: 'Orgânico', value: 25 },
  { name: 'Indicação', value: 20 },
  { name: 'Outros', value: 10 },
];

// Mock Data for advanced metrics
const financialGrowth = [
    { month: 'Jan', revenue: 150000, cac: 200 },
    { month: 'Fev', revenue: 180000, cac: 180 },
    { month: 'Mar', revenue: 220000, cac: 190 },
    { month: 'Abr', revenue: 200000, cac: 175 },
    { month: 'Mai', revenue: 260000, cac: 160 },
    { month: 'Jun', revenue: 310000, cac: 155 },
];

const Reports: React.FC = () => {
  const { leads, projects } = useApp();

  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const closedLeads = leads.filter(l => l.status === 'Fechado').length;
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0.0';
    
    // Calcula LTV via ticket médio dos projetos/leads fechados
    const totalRevenue = leads.filter(l => l.status === 'Fechado').reduce((acc, l) => acc + (l.value || 0), 0);
    const mockRevenueIfZero = closedLeads * 35000; // Mock se não tiver valor customizado
    const finalRevenue = totalRevenue > 0 ? totalRevenue : mockRevenueIfZero;
    const ltv = closedLeads > 0 ? finalRevenue / closedLeads : 0;

    // CAC fictício baseado em um investimento fixo de marketing (R$5.000) dividido por vendas
    const fixedMarketingSpend = 5000;
    const cac = closedLeads > 0 ? fixedMarketingSpend / closedLeads : fixedMarketingSpend;

    return {
      conversionRate,
      ltv,
      cac,
      totalRevenue: finalRevenue
    };
  }, [leads, projects]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-8 animate-enter pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h2 className="text-3xl font-display font-bold text-white mb-2">Business Intelligence</h2>
            <p className="text-slate-400">Análise de CAC, LTV e performance operacional.</p>
         </div>
         <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white border border-white/10 transition-colors flex items-center gap-2">
            <Download size={16} /> Exportar CSV
         </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-t-2 border-lime-500">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-lime-500/10 rounded-lg text-lime-400">
                 <Wallet size={20} />
              </div>
              <span className="text-xs font-bold bg-green-500/10 text-green-400 px-2 py-1 rounded-full">Tempo Real</span>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase mb-1">CAC (Custo Aquisição)</p>
           <p className="text-3xl font-bold text-white">{formatCurrency(metrics.cac)}</p>
           <p className="text-xs text-slate-500 mt-2">Baseado no Funil Atual</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-2 border-blue-500">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                 <Users size={20} />
              </div>
              <span className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">Tempo Real</span>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase mb-1">LTV (Lifetime Value)</p>
           <p className="text-3xl font-bold text-white">{formatCurrency(metrics.ltv)}</p>
           <p className="text-xs text-slate-500 mt-2">Valor médio de contrato fechado</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-2 border-purple-500">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                 <Target size={20} />
              </div>
              <span className="text-xs font-bold bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full">Tempo Real</span>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase mb-1">Taxa de Conversão</p>
           <p className="text-3xl font-bold text-white">{metrics.conversionRate}%</p>
           <p className="text-xs text-slate-500 mt-2">Leads para Venda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-lime-400" />
            Performance Semanal
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                <Tooltip 
                   cursor={{fill: '#1e293b'}}
                   contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vendas" name="Vendas" fill="#84cc16" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <PieChartIcon size={18} className="text-blue-400" />
            Origem de Tráfego
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataSource}
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataSource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Advanced Financial Growth */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Crescimento de Receita vs Otimização de CAC</h3>
         </div>
         <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <LineChart data={financialGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`}/>
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="Receita" stroke="#84cc16" strokeWidth={3} dot={{r:4}} />
                  <Line yAxisId="right" type="monotone" dataKey="cac" name="Custo Aquisição (CAC)" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
               </LineChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Advanced Metrics Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
           <h3 className="font-bold text-white">Performance Individual</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-slate-400">
                <th className="px-6 py-4 font-semibold">Vendedor</th>
                <th className="px-6 py-4 font-semibold">Leads Ativos</th>
                <th className="px-6 py-4 font-semibold">Tempo Médio Resposta</th>
                <th className="px-6 py-4 font-semibold">Taxa Conversão</th>
                <th className="px-6 py-4 font-semibold">Receita Gerada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white font-medium flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-white/10">AD</div>
                  Arthur Duda
                </td>
                <td className="px-6 py-4 text-slate-300">42</td>
                <td className="px-6 py-4 text-slate-300">45 min</td>
                <td className="px-6 py-4 text-green-400 font-bold">28%</td>
                <td className="px-6 py-4 text-white">R$ 185.000</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white font-medium flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-white/10">AA</div>
                  Anderson Alves
                </td>
                <td className="px-6 py-4 text-slate-300">35</td>
                <td className="px-6 py-4 text-slate-300">1h 20m</td>
                <td className="px-6 py-4 text-green-400 font-bold">22%</td>
                <td className="px-6 py-4 text-white">R$ 142.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;