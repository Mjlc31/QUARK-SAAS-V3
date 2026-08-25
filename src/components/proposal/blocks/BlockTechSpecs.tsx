// ============================================================
// BLOCO: FICHA TÉCNICA v2.0 — Tabela Minimalista High Contrast
// ============================================================
import React from 'react';
import { TechSpecsContent, ProposalTheme } from '../types';
import { formatNumber, editable, getWebColors } from '../utils';

interface Props {
  content: TechSpecsContent;
  onUpdate: (content: Partial<TechSpecsContent>) => void;
  theme: ProposalTheme;
}

// Ícones SVG inline
const ZapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
  </svg>
);
const BatteryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="6" width="18" height="12" rx="2" /><line x1="23" y1="13" x2="23" y2="11" />
    <line x1="5" y1="12" x2="9" y2="12" /><line x1="7" y1="10" x2="7" y2="14" />
    <line x1="13" y1="12" x2="17" y2="12" />
  </svg>
);
const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);
const GaugeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 0 1 10 10" /><path d="M12 2a10 10 0 0 0-10 10" />
    <path d="M12 12 8 8" /><circle cx="12" cy="12" r="1.5" />
  </svg>
);

// Linha da tabela minimalista
function SpecRow({ icon, label, value, isAccent, accentColor, C }: {
  icon: React.ReactNode; label: string; value: string;
  isAccent?: boolean; accentColor?: string;
  C: ReturnType<typeof getWebColors>;
}) {
  return (
    <tr style={{ borderBottom: `1px solid ${C.BORDER}` }}>
      <td style={{ padding: '14px 0', width: '44px', verticalAlign: 'middle' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isAccent ? `${accentColor}15` : C.SURFACE,
          color: isAccent ? accentColor : C.MUTED,
          border: isAccent ? `1px solid ${accentColor}25` : `1px solid ${C.BORDER}`,
        }}>
          {icon}
        </div>
      </td>
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: C.TEXT_MUTED }}>{label}</p>
      </td>
      <td style={{ padding: '14px 0', verticalAlign: 'middle', textAlign: 'right' }}>
        <p style={{
          fontSize: '15px', fontWeight: 700,
          color: isAccent ? accentColor : C.TEXT,
          letterSpacing: '-0.2px',
        }}>
          {value}
        </p>
      </td>
    </tr>
  );
}

export function BlockTechSpecs({ content, onUpdate, theme }: Props) {
  const c = content;
  const primary = theme.primaryColor;
  const totalPower = (c.modulesCount * c.modulePower) / 1000;
  const C = getWebColors(theme);

  return (
    <div style={{ padding: '52px 48px', background: C.BACKGROUND }}>
      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: primary, marginBottom: '10px',
        }}>
          Engenharia do Sistema
        </p>
        <h2 style={{ fontSize: '32px', fontWeight: 800, color: C.TEXT, letterSpacing: '-0.7px', lineHeight: 1.1, marginBottom: '12px' }}>
          Ficha Técnica
        </h2>
        <p style={{ fontSize: '13px', color: C.TEXT_MUTED, lineHeight: 1.65, maxWidth: '520px' }}>
          Sistema dimensionado para o perfil de consumo. Equipamentos Tier 1 com garantia de fábrica.
        </p>
      </div>

      {/* ── 3 KPIs em destaque ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '40px' }}>
        {[
          { label: 'Potência Total', value: `${totalPower.toFixed(2)} kWp`, color: primary, field: 'systemPowerKw' },
          { label: 'Consumo de Referência', value: `${c.consumption} kWh/mês`, color: '#3b82f6', field: 'consumption' },
          { label: 'Área Necessária', value: `${c.roofArea} m²`, color: '#10b981', field: 'roofArea' },
        ].map(({ label, value, color, field }) => (
          <div key={label} style={{
            padding: '20px',
            background: C.SURFACE,
            border: `1px solid ${C.BORDER}`,
            borderRadius: '14px',
          }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '6px' }}>
              <span {...editable(field as any, onUpdate)}>{value}</span>
            </p>
            <p style={{ fontSize: '10px', color: C.MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabela minimalista de alto contraste ── */}
      <div style={{ border: `1px solid ${C.BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
        {/* Cabeçalho da tabela */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', background: C.SURFACE,
          borderBottom: `1px solid ${C.BORDER}`,
        }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: C.MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Componente</p>
          <p style={{ fontSize: '10px', fontWeight: 700, color: C.MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Especificação</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', padding: '0 20px' }}>
          <tbody>
            <tr style={{ display: 'block', padding: '0 20px' }}>
              <td colSpan={3} style={{ padding: 0, display: 'block' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <SpecRow C={C} icon={<SunIcon />} label={`Módulos — ${c.moduleBrand}`} value={`${c.modulesCount} × ${c.modulePower}W`} isAccent accentColor={primary} />
                    <SpecRow C={C} icon={<BatteryIcon />} label={`Inversores — ${c.inverterBrand}`} value={`${c.inverterCount} × ${c.inverterPower} kW`} />
                    <SpecRow C={C} icon={<GaugeIcon />} label="Potência Total Instalada" value={`${totalPower.toFixed(2)} kWp`} isAccent accentColor="#3b82f6" />
                    <SpecRow C={C} icon={<ZapIcon />} label="Produção Estimada Mensal" value={`${formatNumber(c.consumption * 1.05, 0)} kWh`} />
                    <SpecRow C={C} icon={<HomeIcon />} label="Área de Telhado Necessária" value={`${c.roofArea} m²`} />
                    <SpecRow C={C} icon={<ShieldIcon />} label="Garantia de Performance" value="25 anos" isAccent accentColor="#10b981" />
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Banner Turn-Key ── */}
      <div style={{
        marginTop: '20px',
        background: C.SURFACE, border: `1px solid ${C.BORDER}`,
        borderRadius: '14px', padding: '22px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: primary, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Escopo Turn-Key Completo
          </p>
          <p style={{ fontSize: '12px', color: C.TEXT_MUTED, lineHeight: 1.5 }}>
            Projeto executivo · Homologação ANEEL · Instalação · Comissionamento · Suporte 24/7
          </p>
        </div>
        <div style={{
          background: `${primary}20`, border: `1px solid ${primary}35`,
          borderRadius: '10px', padding: '12px 20px', textAlign: 'center', flexShrink: 0,
        }}>
          <p style={{ fontSize: '9px', color: primary, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tudo</p>
          <p style={{ fontSize: '22px', fontWeight: 800, color: primary }}>Incluso</p>
        </div>
      </div>
    </div>
  );
}
