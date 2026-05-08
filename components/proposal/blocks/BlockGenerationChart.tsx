import React from 'react';
import { GenerationChartContent, ProposalTheme } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { editable } from '../utils';

interface Props {
  content: GenerationChartContent;
  onUpdate: (content: Partial<GenerationChartContent>) => void;
  theme: ProposalTheme;
}

export function BlockGenerationChart({ content, onUpdate, theme }: Props) {
  const primary = theme.primaryColor;

  return (
    <div
      style={{
        padding: '60px 52px',
        background: '#0A0A0A',
        color: '#fff',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ marginBottom: '40px' }}>
        <h2 {...editable('title', onUpdate)} style={{
          fontSize: '28px', fontWeight: 800, color: '#fff',
          letterSpacing: '-1px', marginBottom: '8px',
        }}>
          {content.title}
        </h2>
        <p {...editable('subtitle', onUpdate)} style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          Projeção Anual de Energia (kWh)
        </p>
      </div>

      {/* Chart Container */}
      <div style={{
        height: '320px', width: '100%', marginBottom: '48px',
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={content.data}
            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.02)' }}
              contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: 'rgba(255,255,255,0.6)' }} />
            <Bar dataKey="generation" name="Geração (kWh)" fill={primary} radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="consumption" name="Consumo (kWh)" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table Container */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Mês</th>
              <th style={{ padding: '16px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Geração</th>
              <th style={{ padding: '16px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Consumo</th>
              <th style={{ padding: '16px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {content.data.map((row, i) => (
              <tr key={row.month} style={{ borderBottom: i === content.data.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#fff' }}>{row.month}</td>
                <td style={{ padding: '12px 16px', color: primary, fontWeight: 600 }}>{row.generation}</td>
                <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)' }}>{row.consumption}</td>
                <td style={{ padding: '12px 16px', color: row.balance >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
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
