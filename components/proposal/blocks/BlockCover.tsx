// ============================================================
// BLOCO: CAPA v2.0 — Dark Luxury / Editorial
// Foto de fundo (painéis solares) + overlay gradiente escuro
// Glassmorphism em cards de info + logo dinâmico do tema
// ============================================================
import React, { useRef } from 'react';
import { CoverContent, ProposalTheme } from '../types';
import { formatCurrency } from '../utils';

interface Props {
  content: CoverContent;
  onUpdate: (content: Partial<CoverContent>) => void;
  theme: ProposalTheme;
}

// Helper contentEditable
const editable = (
  field: keyof CoverContent,
  onUpdate: (c: Partial<CoverContent>) => void
) => ({
  contentEditable: true as const,
  suppressContentEditableWarning: true,
  onBlur: (e: React.FocusEvent<HTMLElement>) =>
    onUpdate({ [field]: e.currentTarget.innerText } as any),
  style: { outline: 'none', cursor: 'text' } as React.CSSProperties,
});

export function BlockCover({ content, onUpdate, theme }: Props) {
  const c = content;
  const primary = theme.primaryColor;
  const secondary = theme.secondaryColor;
  const imageInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        minHeight: '680px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'inherit',
        backgroundColor: '#0A0A0A',
      }}
    >
      {/* ── Foto de fundo (painéis solares Unsplash) ── */}
      <img
        src="https://images.unsplash.com/photo-1509391366360-1e97b524c5bb?auto=format&fit=crop&q=85&w=1600"
        alt="Painéis solares"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          display: 'block',
          opacity: 0.15,
          mixBlendMode: 'luminosity',
        }}
      />

      {/* ── Overlay gradiente sutil para escurecer as bordas ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at center, transparent 0%, rgba(10,10,10,0.8) 100%)`,
        zIndex: 1,
      }} />

      {/* ── Grain / Noise sutil ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.4, pointerEvents: 'none',
      }} />

      {/* ── Botão flutuante Trocar Foto ── */}
      <button
        onClick={() => imageInputRef.current?.click()}
        className="cover-swap-btn"
        style={{
          position: 'absolute', top: '16px', right: '16px', zIndex: 20,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '8px',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.2s',
          opacity: 0,
        }}
        title="Trocar imagem de fundo"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        Trocar foto
      </button>
      <input ref={imageInputRef} type="file" accept="image/*" className="sr-only" />

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '52px 52px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header: Logo + badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '56px' }}>
          {/* Logo dinâmico do tema */}
          {theme.logoUrl ? (
            <img
              src={theme.logoUrl}
              alt="Logo"
              style={{ maxHeight: '44px', maxWidth: '160px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: `rgba(${hexToRgb(primary)},0.15)`,
                border: `1px solid rgba(${hexToRgb(primary)},0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
              }}>☀️</div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
                  Quark Tecnologia em Energia
                </p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', letterSpacing: '0.05em' }}>
                  Engenharia Solar de Alta Performance
                </p>
              </div>
            </div>
          )}

          {/* Badge confidencial */}
          <span style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: primary, border: `1px solid rgba(${hexToRgb(primary)},0.35)`, borderRadius: '20px',
            padding: '5px 13px', background: `rgba(${hexToRgb(primary)},0.08)`,
          }}>
            Exclusivo
          </span>
        </div>

        {/* Hero Headline */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '10px' }}>
            <p
              {...editable('categoryLabel', onUpdate)}
              style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: primary, marginBottom: '14px', outline: 'none', cursor: 'text',
              }}
            >
              {(c as any).categoryLabel || 'Proposta de Engenharia Solar'}
            </p>
            <h1 style={{
              fontSize: '64px', fontWeight: 800, color: '#ffffff',
              lineHeight: 0.95, letterSpacing: '-2.5px', marginBottom: '16px',
            }}>
              <span
                {...editable('headlineLine1', onUpdate)}
                style={{ display: 'block', outline: 'none', cursor: 'text' }}
              >
                {(c as any).headlineLine1 || 'Projeto'}
              </span>
              <span
                {...editable('headlineLine2', onUpdate)}
                style={{ color: primary, display: 'block', outline: 'none', cursor: 'text' }}
              >
                {(c as any).headlineLine2 || 'Solar.'}
              </span>
            </h1>
            <p
              {...editable('tagline', onUpdate)}
              style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.35)',
                fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              {c.tagline}
            </p>
          </div>
        </div>

        {/* Cards glassmorphism — Info do Cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '40px' }}>

          {/* Card: Cliente */}
          <div style={{
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
            padding: '20px 22px',
          }}>
            <p style={{
              fontSize: '9px', fontWeight: 700, color: primary,
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px',
            }}>
              Preparado para
            </p>
            <h2
              {...editable('clientName', onUpdate)}
              style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2, marginBottom: '6px' }}
            >
              {c.clientName}
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span {...editable('city', onUpdate)} style={{ outline: 'none', cursor: 'text' }}>{c.city}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span {...editable('date', onUpdate)} style={{ outline: 'none', cursor: 'text' }}>{c.date}</span>
            </p>
          </div>

          {/* Card: KPIs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              padding: '12px 18px', flex: 1,
            }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '4px' }}>Tamanho do Sistema</p>
              <p style={{ fontSize: '20px', fontWeight: 800, color: primary, letterSpacing: '-0.5px', lineHeight: 1 }}>{c.systemSizeKw?.toFixed(2) ?? '0'} kWp</p>
            </div>
            
            <div style={{
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              padding: '12px 18px', flex: 1,
            }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '4px' }}>Conta Atual vs. Nova</p>
              <p style={{ fontSize: '20px', fontWeight: 800, color: primary, letterSpacing: '-0.5px', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                {formatCurrency(c.currentBill ?? 860)}
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: 500, letterSpacing: '0' }}>para</span>
                <span style={{ color: '#fff' }}>{formatCurrency(c.newBill ?? 207)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer da capa ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: '16px 52px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '40px',
      }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
          Quark Energia · quarkenergia.com.br
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>
          Válido por 30 dias · {c.date}
        </p>
      </div>

      {/* CSS inline para botão de trocar foto */}
      <style>{`
        .cover-swap-btn { opacity: 0 !important; transition: opacity 0.2s; }
        #proposal-canvas-a4 *:hover ~ .cover-swap-btn,
        div:hover > .cover-swap-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

// Utilitário: hex → "r,g,b" para rgba()
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
