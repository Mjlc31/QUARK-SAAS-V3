import React from 'react';
import { HowItWorksContent, ProposalTheme } from '../types';
import { Sun, Cpu, Home } from 'lucide-react';
import { editable } from '../utils';

interface Props {
  content: HowItWorksContent;
  onUpdate: (content: Partial<HowItWorksContent>) => void;
  theme: ProposalTheme;
}

export function BlockHowItWorks({ content, onUpdate, theme }: Props) {
  const primary = theme.primaryColor;

  return (
    <div
      style={{
        padding: '60px 52px',
        background: '#0A0A0A',
        color: '#fff',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Background Elements ── */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%',
        background: `radial-gradient(circle, rgba(${hexToRgb(primary)},0.05) 0%, transparent 70%)`,
        zIndex: 0, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <h2 {...editable('title', onUpdate)} style={{
            fontSize: '32px', fontWeight: 800, color: '#fff',
            letterSpacing: '-1px', marginBottom: '12px',
          }}>
            {content.title}
          </h2>
          <p {...editable('subtitle', onUpdate)} style={{
            fontSize: '14px', color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.05em', fontWeight: 400,
          }}>
            {content.subtitle}
          </p>
        </div>

        {/* 3 Icons Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '60px' }}>
          <IconStep icon={<Sun size={32} color={primary} />} label="Captação" desc="Módulos Tier 1 convertem a luz solar em energia." />
          <IconStep icon={<Cpu size={32} color={primary} />} label="Conversão" desc="O inversor transforma a energia para o padrão da rede." />
          <IconStep icon={<Home size={32} color={primary} />} label="Consumo" desc="Energia limpa abastecendo seus equipamentos." />
        </div>

        {/* Gantt Chart Minimalist */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>
            Cronograma de Implantação (4 Semanas)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {content.steps.map((step, index) => {
              // Mocking positions for the Gantt bars (Week 1 to Week 4)
              let left = '0%';
              let width = '25%';
              if (index === 1) { left = '20%'; width = '30%'; }
              if (index === 2) { left = '40%'; width = '20%'; }
              if (index === 3) { left = '50%'; width = '40%'; }
              if (index === 4) { left = '80%'; width = '20%'; }

              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    {step.label}
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left, width,
                      background: primary, borderRadius: '4px',
                      boxShadow: `0 0 10px rgba(${hexToRgb(primary)},0.3)`
                    }} />
                  </div>
                  <div style={{ width: '70px', textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {step.duration}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconStep({ icon, label, desc }: { icon: React.ReactNode, label: string, desc: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ marginBottom: '16px' }}>{icon}</div>
      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '0.05em' }}>{label}</h4>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
