// ============================================================
// BLOCO: PROVA SOCIAL v2.0 — Bento Box Premium
// Layout editorial: foto hero + grid elegante + logos clientes
// ============================================================
import React, { useCallback, useRef } from 'react';
import { SocialProofContent, ProposalTheme } from '../types';
import { nanoid, editable, getWebColors } from '../utils';

interface Props {
  content: SocialProofContent;
  onUpdate: (content: Partial<SocialProofContent>) => void;
  theme: ProposalTheme;
}

const CLIENT_LOGOS = ['Bradesco', 'Carrefour', 'Ambev', 'JBS', 'Embraer', 'Vale'];

interface ImageSlotProps {
  image: SocialProofContent['images'][0];
  onImageChange: (id: string, url: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
  isFeatured?: boolean;
}

function ImageSlot({ image, onImageChange, onCaptionChange, onRemove, isFeatured }: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    onImageChange(image.id, URL.createObjectURL(file));
  }, [image.id, onImageChange]);

  const isEmpty = !image.url;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
      style={{
        position: 'relative',
        height: isFeatured ? '280px' : '180px',
        borderRadius: isFeatured ? '0' : '12px',
        overflow: 'hidden',
        border: isEmpty ? '1.5px dashed #e2e8f0' : 'none',
        background: isEmpty ? '#f8fafc' : '#000',
        cursor: 'pointer',
      }}
    >
      {!isEmpty && (
        <img
          src={image.url}
          alt={image.caption}
          crossOrigin={image.url.startsWith('http') ? 'anonymous' : undefined}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Arrastar foto</p>
        </div>
      )}

      {!isEmpty && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)',
          padding: '16px 18px 14px',
        }}>
          <p
            {...editable('caption', (c: any) => onCaptionChange(image.id, c.caption))}
            style={{ fontSize: isFeatured ? '14px' : '12px', fontWeight: 700, color: '#fff', outline: 'none', cursor: 'text' }}
          >
            {image.caption}
          </p>
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        style={{
          position: 'absolute', top: '10px', right: '10px',
          padding: '5px 10px', borderRadius: '8px',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', fontSize: '10px', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
          opacity: 0, transition: 'opacity 0.2s',
        }}
        className="slot-swap-btn"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        Trocar
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

export function BlockSocialProof({ content, onUpdate, theme }: Props) {
  const c = content;
  const primary = theme.primaryColor;
  const C = getWebColors(theme);

  const handleImageChange = useCallback((id: string, url: string) => {
    onUpdate({ images: c.images.map((img) => (img.id === id ? { ...img, url } : img)) });
  }, [c.images, onUpdate]);

  const handleCaptionChange = useCallback((id: string, caption: string) => {
    onUpdate({ images: c.images.map((img) => (img.id === id ? { ...img, caption } : img)) });
  }, [c.images, onUpdate]);

  const handleRemoveImage = useCallback((id: string) => {
    onUpdate({ images: c.images.filter((img) => img.id !== id) });
  }, [c.images, onUpdate]);

  const handleAddSlot = useCallback(() => {
    onUpdate({ images: [...c.images, { id: nanoid(), url: '', caption: 'Nova Instalação' }] });
  }, [c.images, onUpdate]);

  const [featured, ...rest] = c.images;

  return (
    <div style={{ background: C.BACKGROUND, overflow: 'hidden' }}>
      {/* Header editorial */}
      <div style={{ padding: '48px 48px 36px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: primary, marginBottom: '12px' }}>
          Prova Social
        </p>
        <h2
          {...editable('headline', onUpdate)}
          style={{ fontSize: '32px', fontWeight: 800, color: C.TEXT, letterSpacing: '-0.7px', lineHeight: 1.1, marginBottom: '12px', outline: 'none', cursor: 'text' }}
        >
          {c.headline}
        </h2>
        <p
          {...editable('subheadline', onUpdate)}
          style={{ fontSize: '14px', color: C.TEXT_MUTED, lineHeight: 1.65, maxWidth: '540px', outline: 'none', cursor: 'text' }}
        >
          {c.subheadline}
        </p>
      </div>

      {/* Foto hero full-width */}
      {featured && (
        <div style={{ marginBottom: '2px' }}>
          <ImageSlot image={featured} onImageChange={handleImageChange} onCaptionChange={handleCaptionChange} onRemove={handleRemoveImage} isFeatured />
        </div>
      )}

      {/* Grid Bento 2 colunas */}
      {rest.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: rest.length === 1 ? '1fr' : '1fr 1fr', gap: '2px', marginBottom: '2px' }}>
          {rest.map((img) => (
            <ImageSlot key={img.id} image={img} onImageChange={handleImageChange} onCaptionChange={handleCaptionChange} onRemove={handleRemoveImage} />
          ))}
        </div>
      )}

      {/* Grid de logos */}
      <div style={{ padding: '28px 48px 32px', borderTop: c.images.length > 0 ? `1px solid ${C.BORDER}` : 'none' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.MUTED, marginBottom: '16px', textAlign: 'center' }}>
          Empresas que confiam na Quark
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {CLIENT_LOGOS.map((name) => (
            <div key={name} style={{ padding: '6px 14px', borderRadius: '6px', background: C.SURFACE, border: `1px solid ${C.BORDER}` }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: C.TEXT_MUTED }}>{name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas footer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: `1px solid ${C.BORDER}` }}>
        {[
          { value: '+500', label: 'Projetos Entregues' },
          { value: '100%', label: 'Dentro do Prazo' },
          { value: '25 anos', label: 'Garantia Inclusa' },
        ].map(({ value, label }, i) => (
          <div key={label} style={{ padding: '24px', textAlign: 'center', borderRight: i < 2 ? `1px solid ${C.BORDER}` : 'none' }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: primary, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px' }}>{value}</p>
            <p style={{ fontSize: '10px', color: C.MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Botão add */}
      {c.images.length < 4 && (
        <div style={{ padding: '0 48px 40px' }}>
          <button
            onClick={handleAddSlot}
            style={{ width: '100%', padding: '12px', border: '1.5px dashed #e2e8f0', borderRadius: '10px', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = primary; (e.currentTarget as HTMLElement).style.color = primary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
          >
            + Adicionar foto
          </button>
        </div>
      )}

      <style>{`
        .slot-swap-btn { opacity: 0 !important; }
        div:hover > .slot-swap-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
