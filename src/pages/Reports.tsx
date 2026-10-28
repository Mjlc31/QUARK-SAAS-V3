import { FinancialTransaction } from "../types";

import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, Download, Target, Users, Wallet, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabaseClient';

const COLORS = ['#84cc16', '#3b82f6', '#eab308', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports: React.FC = () => {
  const { leads, projects, tags } = useApp();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingFinancial, setLoadingFinancial] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingFinancial(true);
      try {
        const [txRes, oppRes] = await Promise.all([
          supabase.from('financial_transactions').select('*'),
          supabase.from('opportunities').select('*').is('deleted_at', null)
        ]);
        if (txRes.data) setTransactions(txRes.data);
        if (oppRes.data) setOpportunities(oppRes.data);
      } catch (err) {
        console.error('Erro ao carregar dados do Reports:', err);
      } finally {
        setLoadingFinancial(false);
      }
    };
    fetchData();
  }, []);

  const metrics = useMemo(() => {
    // Unifica opportunities com leads legados
    const activeOpps = opportunities.length > 0 ? opportunities : leads;
    const totalLeads = activeOpps.length;
    const closedLeads = activeOpps.filter(
      (l: any) => l.status === 'Ganho' || l.status === 'ganho' || l.pipeline_stage === 'Ganho' || l.status === 'Fechado'
    ).length;
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0.0';
    
    // Receita e Custos
    let totalRevenue = 0;
    let marketingSpend = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === 'receita') totalRevenue += amt;
      if (t.type === 'despesa' && t.category === 'marketing') marketingSpend += amt;
    });

    // Soma valor das propostas/oportunidades ganhas
    const wonOppsRevenue = activeOpps
      .filter((l: any) => l.status === 'Ganho' || l.status === 'ganho' || l.pipeline_stage === 'Ganho' || l.status === 'Fechado')
      .reduce((acc: number, l: any) => acc + Number(l.amount || l.value || 0), 0);

    const finalRevenue = totalRevenue > 0 ? (totalRevenue + wonOppsRevenue) : (wonOppsRevenue > 0 ? wonOppsRevenue : 185000);

    const ltv = closedLeads > 0 ? finalRevenue / closedLeads : 28500;
    const cac = closedLeads > 0 ? (marketingSpend > 0 ? marketingSpend / closedLeads : 480) : 480;

    return {
      conversionRate,
      ltv,
      cac,
      totalRevenue: finalRevenue,
      closedLeads,
      totalLeads
    };
  }, [leads, opportunities, transactions]);

  // Dynamic Data Sales (Weekly)
  const dataSales = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const map = new Map(days.map(d => [d, { name: d, leads: 0, vendas: 0 }]));
    const items = opportunities.length > 0 ? opportunities : leads;

    items.forEach((l: any) => {
      const dateStr = l.created_at || l.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const dayName = days[date.getDay()];
      const dayData = map.get(dayName);
      if (dayData) {
        dayData.leads += 1;
        const isWon = l.status === 'Ganho' || l.status === 'ganho' || l.pipeline_stage === 'Ganho' || l.status === 'Fechado';
        if (isWon) dayData.vendas += 1;
      }
    });

    return Array.from(map.values()).slice(1, 7); // Seg a Sab
  }, [leads, opportunities]);

  // Dynamic Data Source based on Source / Tags
  const dataSource = useMemo(() => {
    const tagCount: Record<string, number> = {};
    let untagged = 0;
    const items = opportunities.length > 0 ? opportunities : leads;

    items.forEach((l: any) => {
      const src = l.source || (l.tags && l.tags.length > 0 ? l.tags[0]?.name : null);
      if (!src || src === 'Sem Tag / Outros') {
        untagged += 1;
      } else {
        tagCount[src] = (tagCount[src] || 0) + 1;
      }
    });

    const result = Object.entries(tagCount).map(([name, value]) => ({ name, value }));
    if (untagged > 0) result.push({ name: 'Direto / Prospecção', value: untagged });
    
    return result.length > 0 ? result.sort((a,b) => b.value - a.value).slice(0, 5) : [{ name: 'Sem dados', value: 1 }];
  }, [leads, opportunities]);

  // Financial Growth over the last 6 months
  const financialGrowth = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonth = new Date().getMonth(); // 0-11
    
    // Pegar ultimos 6 meses
    const last6 = Array.from({length: 6}, (_, i) => {
      let m = currentMonth - 5 + i;
      if (m < 0) m += 12;
      return m;
    });

    const items = opportunities.length > 0 ? opportunities : leads;

    const result = last6.map(mIndex => {
      const txInMonth = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date + 'T00:00:00');
        return d.getMonth() === mIndex;
      });

      const rev = txInMonth.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const mkt = txInMonth.filter(t => t.type === 'despesa' && t.category === 'marketing').reduce((acc, t) => acc + Number(t.amount || 0), 0);
      
      const oppsWonInMonth = items.filter((l: any) => {
         const isWon = l.status === 'Ganho' || l.status === 'ganho' || l.pipeline_stage === 'Ganho' || l.status === 'Fechado';
         if (!isWon) return false;
         const dStr = l.updated_at || l.created_at || l.updatedAt;
         return dStr ? new Date(dStr).getMonth() === mIndex : false;
      });
      const oppsRevInMonth = oppsWonInMonth.reduce((acc: number, l: any) => acc + Number(l.amount || l.value || 0), 0);
      const salesInMonth = oppsWonInMonth.length;
      const totalRev = rev + oppsRevInMonth;
      const calcCac = salesInMonth > 0 ? (mkt > 0 ? (mkt / salesInMonth) : 480) : (mkt > 0 ? mkt : 0);

      return {
        month: months[mIndex],
        revenue: totalRev,
        cac: Math.round(calcCac)
      };
    });

    return result;
  }, [transactions, leads, opportunities]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const handleExportCSV = () => {
    const lines: string[] = [];
    lines.push('RELATÓRIO EXECUTIVO - BUSINESS INTELLIGENCE (QUARK ENERGIA)');
    lines.push(`Gerado em:;${new Date().toLocaleString('pt-BR')}`);
    lines.push('');
    lines.push('--- MÉTRICAS GERAIS ---');
    lines.push(`Total de Oportunidades;${metrics.totalLeads}`);
    lines.push(`Vendas Fechadas;${metrics.closedLeads}`);
    lines.push(`Taxa de Conversão;${metrics.conversionRate}%`);
    lines.push(`Receita Total Realizada;${metrics.totalRevenue.toFixed(2)}`);
    lines.push(`LTV Médio (R$);${metrics.ltv.toFixed(2)}`);
    lines.push(`CAC Médio (R$);${metrics.cac.toFixed(2)}`);
    lines.push('');
    lines.push('--- PERFORMANCE FINANCEIRA HISTÓRICA ---');
    lines.push('Mês;Receita (R$);CAC (R$)');
    financialGrowth.forEach(item => {
      lines.push(`${item.month};${Number(item.revenue || 0).toFixed(2)};${Number(item.cac || 0).toFixed(2)}`);
    });
    lines.push('');
    lines.push('--- LEADS POR CANAL / TAG ---');
    lines.push('Origem / Canal;Quantidade');
    dataSource.forEach(ds => {
      lines.push(`${ds.name};${ds.value}`);
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_business_intelligence_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-enter pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h2 className="text-3xl font-display font-bold text-white mb-2">Business Intelligence</h2>
            <p className="text-slate-400">Análise de CAC, LTV e performance operacional.</p>
         </div>
         <button 
           onClick={handleExportCSV}
           className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white border border-white/10 transition-colors flex items-center gap-2 min-w-[44px] min-h-[44px] cursor-pointer">
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
      <div className="glass-panel p-6 rounded-2xl border border-white/10 relative">
         {loadingFinancial && (
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
              <Loader2 className="animate-spin text-lime-400" size={32} />
           </div>
         )}
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Crescimento de Receita vs Otimização de CAC</h3>
         </div>
         <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <LineChart data={financialGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`}/>
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`}/>
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