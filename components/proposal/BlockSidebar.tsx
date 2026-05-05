// ============================================================
// PROPOSAL ENGINE — SIDEBAR v2.0 (Dark Luxury)
// Abas: Blocos (catálogo DnD) | Tema (cores, fonte, logo)
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BlockCatalogItem, ProposalTheme, FontFamily, FONT_FAMILY_MAP } from './types';
import { BLOCK_CATALOG } from './catalog';

// ─────────────────────────────────────────────────────────────
// Item arrastável no catálogo
// ─────────────────────────────────────────────────────────────
interface CatalogItemProps {
  item: BlockCatalogItem;
  onAdd: (type: string) => void;
}

function DraggableCatalogItem({ item, onAdd }: CatalogItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog::${item.type}`,
    data: { source: 'catalog', blockType: item.type },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="group relative"
    >
      <div
        {...listeners}
        {...attributes}
        className="flex items-start gap-3 p-3 rounded-xl border border-white/6 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 cursor-grab active:cursor-grabbing transition-all duration-200 select-none"
      >
        {/* Ícone */}
        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{ background: 'rgba(196,160,80,0.08)', border: '1px solid rgba(196,160,80,0.15)' }}>
          {item.icon}
        </div>
        {/* Texto */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white/90 leading-tight mb-0.5">{item.label}</p>
          <p className="text-[11px] text-white/30 leading-snug line-clamp-2">{item.description}</p>
        </div>
        {/* Drag hint */}
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="text-white/20">
            <circle cx="6" cy="4" r="1.5" /><circle cx="6" cy="10" r="1.5" /><circle cx="6" cy="16" r="1.5" />
            <circle cx="14" cy="4" r="1.5" /><circle cx="14" cy="10" r="1.5" /><circle cx="14" cy="16" r="1.5" />
          </svg>
        </div>
      </div>
      {/* Botão + rápido */}
      <button
        onClick={() => onAdd(item.type)}
        title={`Adicionar ${item.label}`}
        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
        style={{ background: 'rgba(196,160,80,0.15)' }}
      >
        +
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Aba TEMA
// ─────────────────────────────────────────────────────────────
interface ThemePanelProps {
  theme: ProposalTheme;
  onUpdateTheme: (patch: Partial<ProposalTheme>) => void;
}

const FONT_OPTIONS: { value: FontFamily; label: string; preview: string }[] = [
  { value: 'inter',    label: 'Inter',           preview: 'Aa' },
  { value: 'playfair', label: 'Playfair Display', preview: 'Aa' },
  { value: 'dm-sans',  label: 'DM Sans',          preview: 'Aa' },
];

function ColorSwatch({
  label, value, onChange,
}: { label: string; value: string; onChange: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between py-2.5">
      <p className="text-[12px] font-medium text-white/50">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-white/30 uppercase">{value}</span>
        <button
          onClick={() => inputRef.current?.click()}
          className="w-7 h-7 rounded-lg border-2 border-white/10 hover:border-white/30 transition-all hover:scale-110 shadow-lg"
          style={{ background: value }}
          title={`Editar ${label}`}
        />
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
    </div>
  );
}

function ThemePanel({ theme, onUpdateTheme }: ThemePanelProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    onUpdateTheme({ logoUrl: url });
  }, [onUpdateTheme]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      
      {/* ── Logo ── */}
      <div className="px-4 py-4 border-b border-white/6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3">
          Logotipo
        </p>
        {/* Preview / Drop zone */}
        <div
          onClick={() => logoInputRef.current?.click()}
          className="relative group w-full h-20 rounded-xl border border-dashed border-white/10 hover:border-amber-400/40 transition-all cursor-pointer overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleLogoFile(f);
          }}
        >
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
          <button
            onClick={() => onUpdateTheme({ logoUrl: null })}
            className="mt-2 text-[10px] text-white/25 hover:text-red-400 transition-colors"
          >
            Remover logo
          </button>
        )}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
        />
      </div>

      {/* ── Cores ── */}
      <div className="px-4 py-4 border-b border-white/6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-1">
          Paleta de Cores
        </p>
        <ColorSwatch
          label="Cor Primária"
          value={theme.primaryColor}
          onChange={(c) => onUpdateTheme({ primaryColor: c })}
        />
        <div className="h-px bg-white/5" />
        <ColorSwatch
          label="Cor Secundária"
          value={theme.secondaryColor}
          onChange={(c) => onUpdateTheme({ secondaryColor: c })}
        />
      </div>

      {/* ── Tipografia ── */}
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3">
          Tipografia
        </p>
        <div className="flex flex-col gap-2">
          {FONT_OPTIONS.map((opt) => {
            const isActive = theme.fontFamily === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onUpdateTheme({ fontFamily: opt.value })}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'border-amber-400/40 bg-amber-400/6'
                    : 'border-white/6 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]'
                }`}
              >
                <div className="text-left">
                  <p className={`text-[12px] font-semibold ${isActive ? 'text-amber-400' : 'text-white/60'}`}
                    style={{ fontFamily: FONT_FAMILY_MAP[opt.value] }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-white/25 mt-0.5"
                    style={{ fontFamily: FONT_FAMILY_MAP[opt.value], fontSize: '11px' }}>
                    The quick brown fox
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar completa com abas
// ─────────────────────────────────────────────────────────────
type SidebarTab = 'blocks' | 'theme';

interface BlockSidebarProps {
  onAddBlock: (type: string) => void;
  theme: ProposalTheme;
  onUpdateTheme: (patch: Partial<ProposalTheme>) => void;
}

export function BlockSidebar({ onAddBlock, theme, onUpdateTheme }: BlockSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('blocks');

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-white/6 overflow-hidden"
      style={{ background: '#0b0f1a' }}>

      {/* ── Tab switcher ── */}
      <div className="shrink-0 px-3 pt-3 pb-0">
        <div className="flex rounded-xl p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          {([
            { key: 'blocks', label: 'Blocos' },
            { key: 'theme',  label: 'Tema'   },
          ] as { key: SidebarTab; label: string }[]).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-white/30 hover:text-white/60'
                }`}
                style={isActive ? {
                  background: 'rgba(255,255,255,0.08)',
                } : {}}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conteúdo dinâmico por aba ── */}
      {activeTab === 'blocks' ? (
        <>
          {/* Header da aba Blocos */}
          <div className="shrink-0 px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
              Catálogo
            </p>
          </div>
          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 custom-scrollbar">
            {BLOCK_CATALOG.map((item) => (
              <DraggableCatalogItem key={item.type} item={item} onAdd={onAddBlock} />
            ))}
          </div>
          {/* Dica */}
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
