import React from 'react';
import { GenerationChartContent, ProposalTheme } from '../../proposal/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity } from 'lucide-react';

interface Props {
  content: GenerationChartContent;
  theme: ProposalTheme;
}

export default function PreviewGenerationChart({ content, theme }: Props) {
  const isDark = theme.mode !== 'light';

  const chartData = content.data || [];

  return (
    <div className={`w-full aspect-[1/1.414] rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col gap-8 shadow-xl`}>
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="p-3 bg-lime-400/10 rounded-xl">
          <Activity className="w-8 h-8 text-lime-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-lime-400">{content.title || 'Geração vs Consumo'}</h2>
          <p className="text-zinc-500">{content.subtitle || 'Estimativa mensal no primeiro ano de operação (kWh).'}</p>
        </div>
      </div>

      <div className={`w-full h-80 p-6 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#3f3f46' : '#e4e4e7'} vertical={false} />
            <XAxis dataKey="month" stroke={isDark ? '#a1a1aa' : '#71717a'} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={isDark ? '#a1a1aa' : '#71717a'} fontSize={12} tickLine={false} axisLine={false} />
            <RechartsTooltip 
              cursor={{ fill: isDark ? '#27272a' : '#f4f4f5' }}
              contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', border: isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7', borderRadius: '0.5rem', color: isDark ? '#ffffff' : '#09090b' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="generation" name="Geração (kWh)" fill="#a3e635" radius={[4, 4, 0, 0]} />
            <Bar dataKey="consumption" name="Consumo (kWh)" fill={isDark ? '#71717a' : '#d4d4d8'} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={`flex-1 rounded-xl border overflow-hidden ${isDark ? 'border-white/5' : 'border-zinc-200'}`}>
        <table className="w-full text-sm text-left">
          <thead className={`text-xs uppercase ${isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
            <tr>
              <th className="px-6 py-4 font-semibold">Mês</th>
              <th className="px-6 py-4 font-semibold text-right">Geração</th>
              <th className="px-6 py-4 font-semibold text-right">Consumo</th>
              <th className="px-6 py-4 font-semibold text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i} className={`border-b ${isDark ? 'border-zinc-800 bg-[#18181b]' : 'border-zinc-200 bg-white'}`}>
                <td className="px-6 py-3 font-medium">{row.month}</td>
                <td className="px-6 py-3 text-right">{row.generation}</td>
                <td className="px-6 py-3 text-right">{row.consumption}</td>
                <td className={`px-6 py-3 text-right font-bold ${row.balance >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                  {row.balance > 0 ? '+' : ''}{row.balance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
