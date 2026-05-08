// ============================================================
// PROPOSAL ENGINE — CANVAS A4 REALISTA v2.0
// Workspace estilo Figma (fundo escuro com grid de pontos)
// Folha A4 física flutuando com sombra profunda
// ============================================================

import React from 'react';
import {
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProposalBlock, ProposalTheme, FONT_FAMILY_MAP } from './types';
import { BlockRenderer } from './BlockRenderer';

// ─────────────────────────────────────────────────────────────
// Item sortável — bloco no canvas
// ─────────────────────────────────────────────────────────────
interface SortableBlockItemProps {
  block: ProposalBlock;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, content: Partial<ProposalBlock['content']>) => void;
  theme: ProposalTheme;
}

function SortableBlockItem({
  block, isSelected, onSelect, onRemove, onUpdate, theme,
}: SortableBlockItemProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(block.id)}
      className={`group/block relative transition-all duration-150 ${
        isSelected ? 'ring-2 ring-blue-400/40 ring-offset-0' : ''
      }`}
    >
      {/* ── Controles flutuantes (fora da folha, na área escura) ── */}
      <div className={`absolute -left-9 top-4 flex flex-col gap-1.5 z-20 transition-all duration-150 ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'
      }`}>
        {/* Handle drag */}
        <button
          {...attributes}
          {...listeners}
          title="Arrastar"
          className="w-7 h-7 rounded-lg border border-white/10 bg-[#0b0f1a] flex items-center justify-center text-white/30 hover:text-amber-400 hover:border-amber-400/30 cursor-grab active:cursor-grabbing transition-all shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandleIcon />
        </button>
        {/* Delete */}
        <button
          title="Remover bloco"
          onClick={(e) => { e.stopPropagation(); onRemove(block.id); }}
          className="w-7 h-7 rounded-lg border border-white/10 bg-[#0b0f1a] flex items-center justify-center text-white/30 hover:text-red-400 hover:border-red-400/30 transition-all shadow-xl"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Bloco em si */}
      <BlockRenderer block={block} onUpdate={(c) => onUpdate(block.id, c)} theme={theme} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state da folha A4
// ─────────────────────────────────────────────────────────────
function A4EmptyState({ isOver }: { isOver: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center py-32 transition-all duration-200 ${isOver ? 'opacity-100' : 'opacity-60'}`}>
      {/* Ícone de folha minimalista */}
      <div className={`mb-6 transition-transform duration-200 ${isOver ? 'scale-110' : ''}`}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="4" width="32" height="40" rx="3" fill={isOver ? 'rgba(196,160,80,0.12)' : 'rgba(0,0,0,0.05)'} stroke={isOver ? 'rgba(196,160,80,0.6)' : '#d1d5db'} strokeWidth="1.5" strokeDasharray={isOver ? '0' : '4 3'} />
          <path d="M16 18h16M16 24h16M16 30h10" stroke={isOver ? 'rgba(196,160,80,0.5)' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className={`text-[14px] font-semibold mb-1.5 transition-colors ${isOver ? 'text-amber-600' : 'text-slate-400'}`}>
        {isOver ? 'Solte para adicionar' : 'Canvas vazio'}
      </p>
      <p className="text-[12px] text-slate-400 text-center max-w-[220px] leading-relaxed">
        Arraste um bloco da barra lateral ou clique em <span className="text-amber-500 font-bold">+</span> para começar
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Canvas principal — área de trabalho A4
// ─────────────────────────────────────────────────────────────
interface ProposalCanvasProps {
  blocks: ProposalBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, content: Partial<ProposalBlock['content']>) => void;
  theme: ProposalTheme;
}

export function ProposalCanvas({
  blocks, selectedBlockId, onSelectBlock, onRemoveBlock, onUpdateBlock, theme,
}: ProposalCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop-area' });

  const fontFamily = FONT_FAMILY_MAP[theme.fontFamily];

  return (
    // ── Workspace: fundo escuro com grid de pontos estilo Figma ──
    <div
      className="flex-1 overflow-y-auto flex flex-col items-center py-14 px-16 custom-scrollbar"
      style={{
        // Grid de pontos tipo Figma
        background: '#111318',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      onClick={(e) => {
        // Deseleciona bloco ao clicar no workspace vazio
        if ((e.target as HTMLElement).id === 'proposal-workspace') {
          // noop — gerenciado pelo builder
        }
      }}
      id="proposal-workspace"
    >
      {/* ── Folha A4 ── */}
      <div
        ref={setNodeRef}
        id="proposal-canvas-a4"
        className="relative w-full overflow-visible"
        style={{
          // A4 exato: 794px × 1123px @ 96dpi
          maxWidth: '794px',
          minHeight: '1123px',
          background: theme.backgroundColor || '#0A0A0A',
          borderRadius: '4px',
          // Sombra profunda — simula papel físico sobre mesa escura
          boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 20px 60px rgba(0,0,0,0.45), 0 60px 120px rgba(0,0,0,0.3)',
          fontFamily,
          color: theme.textColor || '#ffffff',
        }}
      >
        {blocks.length === 0 ? (
          <A4EmptyState isOver={isOver} />
        ) : (
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Não usamos padding left interno para não quebrar a folha A4.
                As ferramentas vão flutuar na área externa graças ao overflow-visible. */}
            <div className="relative">
              {blocks.map((block) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={onSelectBlock}
                  onRemove={onRemoveBlock}
                  onUpdate={onUpdateBlock}
                  theme={theme}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      {/* ── Label de página ── */}
      <div className="mt-4 mb-20 flex items-center gap-2">
        <div className="h-px w-8 bg-white/10" />
        <span className="text-[11px] text-white/20 font-medium tabular-nums">Página 1</span>
        <div className="h-px w-8 bg-white/10" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ícones inline
// ─────────────────────────────────────────────────────────────
function DragHandleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="7" cy="5" r="1.5" /><circle cx="7" cy="10" r="1.5" /><circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="5" r="1.5" /><circle cx="13" cy="10" r="1.5" /><circle cx="13" cy="15" r="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}
