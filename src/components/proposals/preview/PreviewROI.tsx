import React from 'react';
import { ROIContent, ProposalTheme } from '../../proposal/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Calculator, Leaf, TreePine } from 'lucide-react';

interface Props {
  content: ROIContent;
  theme: ProposalTheme;
}

export default function PreviewROI({ content, theme }: Props) {
  const isDark = theme.mode !== 'light';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

  const paybackPoint = content.cashFlowData?.find(d => d.cumulative > 0);

  return (
    <div className={`w-full aspect-[1/1.414] rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col gap-8 shadow-xl`}>
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="p-3 bg-lime-400/10 rounded-xl">
          <Calculator className="w-8 h-8 text-lime-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-lime-400">Retorno do Investimento</h2>
          <p className="text-zinc-500">Análise financeira e impacto ambiental.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Payback</p>
          <p className="text-xl md:text-2xl font-bold truncate text-lime-400">{(content.paybackYears || 0).toFixed(1)} anos</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">ROI</p>
          <p className="text-xl md:text-2xl font-bold truncate text-lime-400">{(content.roi || 0).toFixed(1)}%</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">TIR (a.a.)</p>
          <p className="text-xl md:text-2xl font-bold truncate text-lime-400">{(content.tir || 0).toFixed(1)}%</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">VPL</p>
          <p className="text-xl md:text-2xl font-bold truncate text-lime-400">{formatCurrency(content.vpl)}</p>
        </div>
      </div>

      <div className={`w-full h-64 p-6 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
        <h3 className="text-sm font-semibold mb-4 text-zinc-400">Fluxo de Caixa Acumulado (R$)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={content.cashFlowData || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#3f3f46' : '#e4e4e7'} vertical={false} />
            <XAxis dataKey="year" stroke={isDark ? '#a1a1aa' : '#71717a'} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={isDark ? '#a1a1aa' : '#71717a'} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
            <RechartsTooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Ano ${label}`}
              contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', border: isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7', borderRadius: '0.5rem' }}
            />
            <Area type="monotone" dataKey="cumulative" stroke="#a3e635" strokeWidth={3} fillOpacity={1} fill="url(#colorCum)" />
            {paybackPoint && (
              <ReferenceDot x={paybackPoint.year} y={paybackPoint.cumulative} r={6} fill="#a3e635" stroke="#18181b" strokeWidth={2} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-6">
        <div className={`p-6 rounded-xl border flex items-center gap-6 ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="w-14 h-14 rounded-full bg-lime-400/10 flex items-center justify-center shrink-0">
            <Leaf className="w-7 h-7 text-lime-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-1">CO₂ Evitado (25 anos)</p>
            <p className="text-xl md:text-2xl font-bold truncate">{(content.co2EvitedTon25Years || 0).toFixed(1)} toneladas</p>
          </div>
        </div>
        <div className={`p-6 rounded-xl border flex items-center gap-6 ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="w-14 h-14 rounded-full bg-lime-400/10 flex items-center justify-center shrink-0">
            <TreePine className="w-7 h-7 text-lime-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-1">Árvores Equivalentes</p>
            <p className="text-xl md:text-2xl font-bold truncate">{Math.round(content.treesEquivalent || 0)} árvores</p>
          </div>
        </div>
      </div>
    </div>
  );
}
