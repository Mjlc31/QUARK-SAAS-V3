import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, Download } from 'lucide-react';

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

const Reports: React.FC = () => {
  return (
    <div className="space-y-8 animate-enter">
      <div className="flex justify-between items-end">
         <div>
            <h2 className="text-3xl font-display font-bold text-white mb-2">Business Intelligence</h2>
            <p className="text-slate-400">Análise detalhada de performance comercial e operacional.</p>
         </div>
         <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white border border-white/10 transition-colors flex items-center gap-2">
            <Download size={16} /> Exportar CSV
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-lime-400" />
            Performance Semanal (Leads vs Vendas)
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
                <Bar dataKey="leads" name="Leads Entrantes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vendas" name="Fechamentos" fill="#84cc16" radius={[4, 4, 0, 0]} />
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

      {/* Advanced Metrics Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
           <h3 className="font-bold text-white">Detalhamento por Vendedor</h3>
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
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">JS</div>
                  João Silva
                </td>
                <td className="px-6 py-4 text-slate-300">42</td>
                <td className="px-6 py-4 text-slate-300">45 min</td>
                <td className="px-6 py-4 text-green-400 font-bold">28%</td>
                <td className="px-6 py-4 text-white">R$ 185.000</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white font-medium flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">AM</div>
                  Arthur Moraes
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