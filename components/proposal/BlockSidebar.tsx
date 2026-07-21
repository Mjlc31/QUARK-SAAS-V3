// ============================================================
// PROPOSAL ENGINE — SIDEBAR v3.0 (Dark Luxury + Fontes + Dark/Light + Padrão)
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  BlockCatalogItem, ProposalTheme, FontFamily,
  FONT_FAMILY_MAP, FONT_LABELS, ProposalMode,
} from './types';
import { BLOCK_CATALOG } from './catalog';

// ── Item arrastável ─────────────────────────────────────────
function DraggableCatalogItem({ item, onAdd }: { item: BlockCatalogItem; onAdd: (t: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog::${item.type}`,
    data: { source: 'catalog', blockType: item.type },
  });
  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.3 : 1 }} className="group relative">
      <div {...listeners} {...attributes}
        className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-500/30 cursor-grab active:cursor-grabbing transition-all duration-300 select-none group-hover:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)]">
        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white/90 leading-tight mb-1">{item.label}</p>
          <p className="text-[11px] text-white/40 leading-snug line-clamp-2">{item.description}</p>
        </div>
      </div>
      <button onClick={() => onAdd(item.type)} title={`Adicionar ${item.label}`}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-amber-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-amber-500/20 z-10"
        style={{ background: 'rgba(245,158,11,0.1)' }}>
        +
      </button>
    </div>
  );
}

// ── Color swatch ─────────────────────────────────────────────
function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between py-2.5">
      <p className="text-[12px] font-medium text-white/50">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-white/30 uppercase">{value}</span>
        <button onClick={() => inputRef.current?.click()}
          className="w-7 h-7 rounded-lg border-2 border-white/10 hover:border-white/30 transition-all hover:scale-110 shadow-lg"
          style={{ background: value }} title={`Editar ${label}`} />
        <input ref={inputRef} type="color" value={value}
          onChange={(e) => onChange(e.target.value)} className="sr-only" />
      </div>
    </div>
  );
}

// ── Tema Panel ───────────────────────────────────────────────
interface ThemePanelProps {
  theme: ProposalTheme;
  onUpdateTheme: (patch: Partial<ProposalTheme>) => void;
}

const FONT_OPTIONS: FontFamily[] = ['inter', 'playfair', 'dm-sans', 'montserrat', 'raleway', 'poppins', 'space-grotesk'];

const LOGO_SIZES: { value: ProposalTheme['logoSize']; label: string }[] = [
  { value: 'sm', label: 'Pequena' },
  { value: 'md', label: 'Média' },
  { value: 'lg', label: 'Grande' },
];

function ThemePanel({ theme, onUpdateTheme }: ThemePanelProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    onUpdateTheme({ logoUrl: url });
  }, [onUpdateTheme]);

  const handleSaveTemplate = () => {
    localStorage.setItem('quark_proposal_template_theme', JSON.stringify(theme));
    alert('✅ Padrão salvo! Será aplicado em novas propostas.');
  };

  const handleLoadTemplate = () => {
    const saved = localStorage.getItem('quark_proposal_template_theme');
    if (saved) {
      onUpdateTheme(JSON.parse(saved));
    } else {
      alert('Nenhum padrão salvo ainda.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">

      {/* ── Modo Dark/Light ── */}
      <div className="px-5 py-5 border-b border-white/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4">Modo da Proposta</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'dark' as ProposalMode, label: '🌙 Escuro', desc: 'Preto premium', bg: '#0A0A0A', tc: '#ffffff' },
            { value: 'light' as ProposalMode, label: '☀️ Claro', desc: 'Branco clean', bg: '#ffffff', tc: '#111111' },
          ]).map(opt => {
            const isActive = (theme.mode || 'dark') === opt.value;
            return (
              <button key={opt.value} onClick={() => onUpdateTheme({ mode: opt.value, backgroundColor: opt.bg, textColor: opt.tc })}
                className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all duration-300 ${
                  isActive ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}>
                {isActive && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 blur-xl rounded-full -translate-y-1/2 translate-x-1/2" />}
                <p className={`text-sm font-bold mb-1 ${isActive ? 'text-amber-400' : 'text-white/70'}`}>{opt.label}</p>
                <p className="text-[10px] text-white/40 font-medium">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Logo ── */}
      <div className="px-4 py-4 border-b border-white/6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3">Logotipo</p>
        <div
          onClick={() => logoInputRef.current?.click()}
          className="relative group w-full h-20 rounded-xl border border-dashed border-white/10 hover:border-amber-400/40 transition-all cursor-pointer overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleLogoFile(f); }}>
          {theme.logoUrl ? (
            <>
              <img src={theme.logoUrl} alt="Logo" className="max-h-16 max-w-full object-contain p-2" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[11px] font-semibold text-white">Trocar Logo</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-white/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
              </svg>
              <span className="text-[11px]">Arrastar logo aqui</span>
            </div>
          )}
        </div>
        {theme.logoUrl && (
          <button onClick={() => onUpdateTheme({ logoUrl: null })}
            className="mt-2 text-[10px] text-white/25 hover:text-red-400 transition-colors">
            Remover logo
          </button>
        )}
        <input ref={logoInputRef} type="file" accept="image/*" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }} />

        {/* Tamanho da logo */}
        <div className="mt-3">
          <p className="text-[10px] text-white/25 mb-2">Tamanho da logo no PDF</p>
          <div className="flex gap-1.5">
            {LOGO_SIZES.map(sz => (
              <button key={sz.value} onClick={() => onUpdateTheme({ logoSize: sz.value })}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  (theme.logoSize || 'lg') === sz.value
                    ? 'border-amber-400/40 bg-amber-400/8 text-amber-400'
                    : 'border-white/6 text-white/30 hover:border-white/15'
                }`}>
                {sz.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cores ── */}
      <div className="px-4 py-4 border-b border-white/6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-1">Paleta de Cores</p>
        <ColorSwatch label="Cor Primária (Destaque)" value={theme.primaryColor || '#C4A050'}
          onChange={(c) => onUpdateTheme({ primaryColor: c })} />
        <div className="h-px bg-white/5" />
        <ColorSwatch label="Cor do Fundo" value={theme.backgroundColor || (theme.mode === 'light' ? '#ffffff' : '#0A0A0A')}
          onChange={(c) => onUpdateTheme({ backgroundColor: c })} />
        <div className="h-px bg-white/5" />
        <ColorSwatch label="Cor do Texto Principal" value={theme.textColor || (theme.mode === 'light' ? '#111111' : '#ffffff')}
          onChange={(c) => onUpdateTheme({ textColor: c })} />
        <div className="h-px bg-white/5" />

        {/* Presets de cor */}
        <div className="mt-3">
          <p className="text-[10px] text-white/20 mb-2">Presets rápidos</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { primary: '#C4A050', label: 'Gold' },
              { primary: '#10b981', label: 'Verde' },
              { primary: '#3b82f6', label: 'Azul' },
              { primary: '#f59e0b', label: 'Âmbar' },
              { primary: '#8b5cf6', label: 'Roxo' },
              { primary: '#ef4444', label: 'Vermelho' },
              { primary: '#06b6d4', label: 'Ciano' },
              { primary: '#ec4899', label: 'Rosa' },
            ].map(p => (
              <button key={p.primary} onClick={() => onUpdateTheme({ primaryColor: p.primary })}
                title={p.label}
                className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/40 transition-all hover:scale-110"
                style={{ background: p.primary }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Tipografia ── */}
      <div className="px-4 py-4 border-b border-white/6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3">Tipografia</p>
        <div className="flex flex-col gap-1.5">
          {FONT_OPTIONS.map((fv) => {
            const isActive = theme.fontFamily === fv;
            return (
              <button key={fv} onClick={() => onUpdateTheme({ fontFamily: fv })}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                  isActive ? 'border-amber-400/40 bg-amber-400/6' : 'border-white/6 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]'
                }`}>
                <div className="text-left">
                  <p className={`text-[12px] font-semibold ${isActive ? 'text-amber-400' : 'text-white/60'}`}
                    style={{ fontFamily: FONT_FAMILY_MAP[fv] }}>
                    {FONT_LABELS[fv].split(' — ')[0]}
                  </p>
                  <p className="text-[10px] text-white/25 mt-0.5" style={{ fontFamily: FONT_FAMILY_MAP[fv] }}>
                    {FONT_LABELS[fv].split(' — ')[1]}
                  </p>
                </div>
                {isActive && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(196,160,80,0.25)' }}>
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#c4a050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Salvar / Carregar Padrão ── */}
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3">Padrão da Empresa</p>
        <div className="flex flex-col gap-2">
          <button onClick={handleSaveTemplate}
            className="w-full py-2.5 rounded-xl border border-amber-400/25 bg-amber-400/6 text-amber-400 text-[12px] font-bold hover:bg-amber-400/12 transition-all">
            💾 Salvar como Padrão
          </button>
          <button onClick={handleLoadTemplate}
            className="w-full py-2.5 rounded-xl border border-white/8 bg-white/[0.02] text-white/40 text-[12px] font-semibold hover:text-white/70 hover:border-white/15 transition-all">
            📂 Carregar Padrão Salvo
          </button>
        </div>
        <p className="text-[10px] text-white/15 text-center mt-2 leading-relaxed">
          O padrão define cores, fonte e logo padrão para todas as novas propostas.
        </p>
      </div>
    </div>
  );
}

// ── Sidebar principal ─────────────────────────────────────────
type SidebarTab = 'blocks' | 'theme';

interface BlockSidebarProps {
  onAddBlock: (type: string) => void;
  theme: ProposalTheme;
  onUpdateTheme: (patch: Partial<ProposalTheme>) => void;
}

export function BlockSidebar({ onAddBlock, theme, onUpdateTheme }: BlockSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('blocks');

  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-white/6 overflow-hidden"
      style={{ background: '#0b0f1a' }}>

      {/* ── Tab switcher ── */}
      <div className="shrink-0 px-3 pt-3 pb-0">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {([
            { key: 'blocks', label: 'Blocos' },
            { key: 'theme', label: 'Tema' },
          ] as { key: SidebarTab; label: string }[]).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                  isActive ? 'text-white shadow-sm' : 'text-white/30 hover:text-white/60'
                }`}
                style={isActive ? { background: 'rgba(255,255,255,0.08)' } : {}}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'blocks' ? (
        <>
          <div className="shrink-0 px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">Catálogo de Blocos</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 custom-scrollbar">
            {BLOCK_CATALOG.map((item) => (
              <DraggableCatalogItem key={item.type} item={item} onAdd={onAddBlock} />
            ))}
          </div>
          <div className="shrink-0 px-4 py-2.5 border-t border-white/5">
            <p className="text-[10px] text-white/15 text-center leading-relaxed">
              Arraste para o canvas ou clique em +
            </p>
          </div>
        </>
      ) : (
        <ThemePanel theme={theme} onUpdateTheme={onUpdateTheme} />
      )}
    </aside>
  );
}
