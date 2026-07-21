// ============================================================
// BLOCO: ANÁLISE FINANCEIRA v2.0 — Dark Luxury
// KPIs gigantes editorial + painel de reajuste iOS-style
// ============================================================
import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { FinancialContent, ProposalTheme } from '../types';
import { formatCurrency, editable, getWebColors } from '../utils';

interface Props {
  content: FinancialContent;
  onUpdate: (content: Partial<FinancialContent>) => void;
  theme: ProposalTheme;
}

function buildProjection(content: FinancialContent) {
  const { finalPrice, monthlyBill, tariffRate, tariffAdjustmentRate, systemLifeYears } = content;
  const annualAdjust = tariffAdjustmentRate / 100;
  let cumulativeSavings = 0;
  let cumulativeCost = -finalPrice;
  const data = [];
  for (let year = 1; year <= systemLifeYears; year++) {
    const currentTariff = tariffRate * Math.pow(1 + annualAdjust, year - 1);
    const annualSavings = monthlyBill * (currentTariff / tariffRate) * 12;
    cumulativeSavings += annualSavings;
    cumulativeCost += annualSavings;
    data.push({
      year: `${year}`,
      economiaAno: Math.round(annualSavings),
      economiaAcumulada: Math.round(cumulativeSavings),
      fluxoCaixa: Math.round(cumulativeCost),
    });
  }
  return data;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px', padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '5px' }}>Ano {label}</p>
      {payload.map((e: any) => (
        <p key={e.name} style={{ fontSize: '12px', color: e.color ?? '#fff', marginBottom: '2px' }}>
          {formatCurrency(e.value)}
        </p>
      ))}
    </div>
  );
}

export function BlockFinancial({ content, onUpdate, theme }: Props) {
  const c = content;
  const primary = theme.primaryColor;
  const C = getWebColors(theme);

  const projection = useMemo(() => buildProjection(c), [
    c.finalPrice, c.monthlyBill, c.tariffRate, c.tariffAdjustmentRate, c.systemLifeYears,
  ]);

  const paybackYear = projection.findIndex((d) => d.fluxoCaixa >= 0) + 1;
  const totalSavings = projection[projection.length - 1]?.economiaAcumulada ?? 0;
  const roi = c.finalPrice > 0 ? ((totalSavings / c.finalPrice - 1) * 100) : 0;
  const paybackChartData = projection.slice(0, Math.min(paybackYear + 5, projection.length));

  return (
    <div style={{ background: C.BACKGROUND, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '52px 48px 0' }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: primary, marginBottom: '10px',
        }}>
          Análise de Investimento
        </p>
        <h2 {...editable('title', onUpdate)} style={{ fontSize: '32px', fontWeight: 800, color: C.TEXT, letterSpacing: '-0.7px', marginBottom: '8px', outline: 'none', cursor: 'text' }}>
          Retorno sobre o Investimento
        </h2>
        <p {...editable('description', onUpdate)} style={{ fontSize: '13px', color: C.TEXT_MUTED, lineHeight: 1.65, maxWidth: '540px', marginBottom: '40px', outline: 'none', cursor: 'text' }}>
          Projeção baseada no consumo histórico e reajuste tarifário ANEEL. Seu caixa protegido pelas próximas décadas.
        </p>

        {/* ── KPIs GIGANTES — atração principal ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', marginBottom: '0', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${C.BORDER}` }}>
          {[
            { label: 'Payback', value: `${paybackYear}`, unit: 'anos', sub: 'Retorno do capital', color: primary },
            { label: `Economia em ${c.systemLifeYears} Anos`, value: formatCurrency(totalSavings), unit: '', sub: 'Economia acumulada projetada', color: '#10b981' },
            { label: 'ROI Total', value: `${roi.toFixed(0)}%`, unit: '', sub: 'Sobre o investimento', color: '#6366f1' },
          ].map(({ label, value, unit, sub, color }, i) => (
            <div key={label} style={{
              padding: '28px 24px',
              borderRight: i < 2 ? `1px solid ${C.BORDER}` : 'none',
              background: i === 0 ? `${primary}10` : C.SURFACE,
            }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.MUTED, marginBottom: '10px' }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <p style={{ fontSize: '42px', fontWeight: 800, color, letterSpacing: '-1.5px', lineHeight: 1 }}>{value}</p>
                {unit && <p style={{ fontSize: '16px', fontWeight: 600, color, opacity: 0.7 }}>{unit}</p>}
              </div>
              <p style={{ fontSize: '11px', color: C.MUTED }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Painel de Reajuste — iOS-style ── */}
      <div style={{ padding: '32px 48px 0' }}>
        <div style={{
          background: C.SURFACE,
          border: `1px solid ${C.BORDER}`,
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}>
          {/* Ícone */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: `${primary}15`, border: `1px solid ${primary}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          {/* Info */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: C.TEXT, marginBottom: '2px' }}>Taxa de Reajuste Tarifário</p>
            <p style={{ fontSize: '11px', color: C.TEXT_MUTED, lineHeight: 1.4 }}>
              Média histórica ANEEL: 7% a.a. — Ajuste para recalcular toda a projeção.
            </p>
          </div>
          {/* Input nativo estilizado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <div style={{
              background: theme.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.5)', border: `1px solid ${C.BORDER_STRONG}`,
              borderRadius: '12px', padding: '2px',
              boxShadow: theme.mode === 'light' ? 'inset 0 1px 4px rgba(0,0,0,0.05)' : 'inset 0 1px 4px rgba(0,0,0,0.5)',
            }}>
              <input
                type="number"
                value={c.tariffAdjustmentRate}
                min={0} max={30} step={0.5}
                onChange={(e) => onUpdate({ tariffAdjustmentRate: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '60px', padding: '8px 10px',
                  borderRadius: '10px', border: 'none',
                  background: 'transparent',
                  fontSize: '22px', fontWeight: 800, color: C.TEXT,
                  textAlign: 'center', outline: 'none',
                }}
              />
            </div>
            <span style={{ fontSize: '22px', fontWeight: 800, color: C.TEXT }}>%</span>
          </div>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div style={{ padding: '28px 48px 0' }}>
        {/* Payback */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: C.TEXT, marginBottom: '4px', letterSpacing: '0.02em' }}>
            Curva de Payback — Fluxo de Caixa Acumulado
          </p>
          <p style={{ fontSize: '11px', color: C.MUTED, marginBottom: '12px' }}>
            Ponto de equilíbrio no <strong style={{ color: primary }}>Ano {paybackYear}</strong>
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={paybackChartData} margin={{ top: 8, right: 16, bottom: 0, left: 50 }}>
              <defs>
                <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.BORDER} vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.MUTED }} axisLine={false} tickLine={false} tickFormatter={(v) => `A${v}`} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: C.MUTED }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={primary} strokeWidth={1.5} strokeDasharray="5 4" />
              <Area type="monotone" dataKey="fluxoCaixa" name="Fluxo de Caixa" stroke="#10b981" strokeWidth={2} fill="url(#gPos)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Economia Anual */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: C.TEXT, marginBottom: '12px' }}>
            Economia Anual Projetada ({c.tariffAdjustmentRate}% a.a.)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={projection} margin={{ top: 8, right: 16, bottom: 0, left: 50 }}>
              <defs>
                <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.BORDER} vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.MUTED }} axisLine={false} tickLine={false} interval={4} tickFormatter={(v) => `A${v}`} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: C.MUTED }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="economiaAno" name="Economia" fill="url(#bGrad)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Painel de Investimento Final ── */}
      <div style={{ padding: '0 48px 52px' }}>
        <div style={{
          background: C.SURFACE,
          border: `1px solid ${C.BORDER}`,
          borderRadius: '18px', padding: '36px 40px',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          {/* Orb decorativo */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '180px', height: '180px', borderRadius: '50%',
            background: `radial-gradient(circle, ${primary}20 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <p style={{
            fontSize: '10px', fontWeight: 700, color: primary,
            letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '14px',
          }}>
            Aporte Financeiro Total (Turn-Key)
          </p>
          <p style={{
            fontSize: '56px', fontWeight: 800, color: C.TEXT,
            letterSpacing: '-2px', lineHeight: 1, marginBottom: '24px',
          }}>
            {formatCurrency(c.finalPrice)}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'À Vista (−5%)', value: formatCurrency(c.finalPrice * 0.95) },
              { label: `${c.installmentCount}× de`, value: formatCurrency(c.finalPrice / c.installmentCount) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: theme.mode === 'light' ? '#ffffff' : 'rgba(255,255,255,0.05)', border: `1px solid ${C.BORDER}`,
                borderRadius: '12px', padding: '14px 24px',
              }}>
                <p style={{ fontSize: '9px', color: C.MUTED, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: primary }}>{value}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: C.MUTED, marginTop: '18px' }}>
            Sistema entregue completamente funcional. Zero surpresas.
          </p>
        </div>
      </div>
    </div>
  );
}
