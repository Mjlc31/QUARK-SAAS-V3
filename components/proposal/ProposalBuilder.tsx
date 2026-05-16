// ============================================================
// PROPOSAL ENGINE — PROPOSAL BUILDER v3.0
// Dark/Light toggle · Duplo PDF · Fontes expandidas
// ============================================================

import React, { useState, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { ProposalBlock, ProposalData, BlockType, ProposalTheme, DEFAULT_THEME, FONT_FAMILY_MAP, ProposalMode } from './types';
import { ProposalPDF } from './ProposalPDF';
import { BLOCK_CATALOG, buildInitialBlocks } from './catalog';
import { nanoid } from './utils';
import { BlockSidebar } from './BlockSidebar';
import { ProposalCanvas } from './ProposalCanvas';
import { BlockRenderer } from './BlockRenderer';
import { storageService } from '../../services/storageService';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface ProposalBuilderProps {
  data: ProposalData;
  onClose: () => void;
  onSave?: (data: ProposalData) => void;
  onDelete?: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export function ProposalBuilder({ data, onClose, onSave, onDelete }: ProposalBuilderProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  // ── Estado Central ─────────────────────────────────────────
  const [blocks, setBlocks] = useState<ProposalBlock[]>(() => {
    // Restaura blocos salvos se existirem, senão gera inicial
    if (data.blocks && data.blocks.length > 0) {
      return data.blocks;
    }
    return buildInitialBlocks(data);
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingLight, setIsExportingLight] = useState(false);
  const [theme, setTheme] = useState<ProposalTheme>(() => {
    // Carrega padrão salvo se existir
    const savedTheme = localStorage.getItem('quark_proposal_template_theme');
    return savedTheme ? { ...DEFAULT_THEME, ...JSON.parse(savedTheme) } : DEFAULT_THEME;
  });

  // ── Handlers do Tema ──────────────────────────────────────
  const handleUpdateTheme = useCallback((patch: Partial<ProposalTheme>) => {
    setTheme((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  // ── Sensores DnD ──────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ── DnD Handlers ──────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Catálogo → Canvas
    if (activeIdStr.startsWith('catalog::')) {
      const blockType = activeIdStr.replace('catalog::', '') as BlockType;
      const catalogItem = BLOCK_CATALOG.find((c) => c.type === blockType);
      if (!catalogItem) return;
      const newBlock: ProposalBlock = {
        id: nanoid(),
        type: blockType,
        content: { ...catalogItem.defaultContent },
      };
      const overIndex = blocks.findIndex((b) => b.id === overIdStr);
      if (overIndex >= 0) {
        const updated = [...blocks];
        updated.splice(overIndex, 0, newBlock);
        setBlocks(updated);
      } else {
        setBlocks((prev) => [...prev, newBlock]);
      }
      setIsDirty(true);
      return;
    }

    // Reordenação dentro do Canvas
    if (activeIdStr !== overIdStr) {
      const oldIndex = blocks.findIndex((b) => b.id === activeIdStr);
      const newIndex = blocks.findIndex((b) => b.id === overIdStr);
      if (oldIndex !== -1 && newIndex !== -1) {
        setBlocks(arrayMove(blocks, oldIndex, newIndex));
        setIsDirty(true);
      }
    }
  }, [blocks]);

  // ── CRUD de Blocos ─────────────────────────────────────────
  const handleAddBlock = useCallback((type: string) => {
    const catalogItem = BLOCK_CATALOG.find((c) => c.type === type);
    if (!catalogItem) return;
    const newBlock: ProposalBlock = {
      id: nanoid(),
      type: catalogItem.type,
      content: { ...catalogItem.defaultContent },
    };
    setBlocks((prev) => [...prev, newBlock]);
    setIsDirty(true);
    setSelectedBlockId(newBlock.id);
  }, []);

  const handleRemoveBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBlockId((prev) => (prev === id ? null : prev));
    setIsDirty(true);
  }, []);

  const handleUpdateBlock = useCallback(
    (id: string, content: Partial<ProposalBlock['content']>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content: { ...b.content, ...content } } : b))
      );
      setIsDirty(true);
    },
    []
  );

  // ── Bloco ativo para overlay ───────────────────────────────
  const activeBlock = blocks.find((b) => b.id === activeId);

  // ── Export PDF — Dark e Light ──────────────────────────────
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportLightStatus, setExportLightStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const exportPDF = async (mode: ProposalMode = 'dark') => {
    const isDark = mode === 'dark';
    if (isDark) { setIsExporting(true); setExportStatus('loading'); }
    else { setIsExportingLight(true); setExportLightStatus('loading'); }
    const exportTheme: ProposalTheme = isDark
      ? { ...theme, mode: 'dark', backgroundColor: '#0A0A0A', textColor: '#ffffff' }
      : { ...theme, mode: 'light', backgroundColor: '#ffffff', textColor: '#111111' };
    try {
      const doc = <ProposalPDF blocks={blocks} theme={exportTheme} clientName={data.clientName} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const suffix = isDark ? 'Escuro' : 'Claro';
      const filename = `Proposta_${suffix}_${data.clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      storageService.uploadFile('quark_arquivos', `propostas/${filename}`, blob).then(publicUrl => {
        if (publicUrl) console.log('✅ Proposta salva no Storage:', publicUrl);
      });
      if (isDark) { setExportStatus('success'); setTimeout(() => setExportStatus('idle'), 3000); }
      else { setExportLightStatus('success'); setTimeout(() => setExportLightStatus('idle'), 3000); }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      if (isDark) { setExportStatus('error'); setTimeout(() => setExportStatus('idle'), 4000); }
      else { setExportLightStatus('error'); setTimeout(() => setExportLightStatus('idle'), 4000); }
    } finally {
      if (isDark) setIsExporting(false); else setIsExportingLight(false);
    }
  };

  const handleExport = () => exportPDF('dark');
  const handleExportLight = () => exportPDF('light');


  // ── CSS Variables do tema (injetadas no root) ─────────────
  const themeVars = {
    '--primary': theme.primaryColor,
    '--secondary': theme.secondaryColor,
    '--font-proposal': FONT_FAMILY_MAP[theme.fontFamily],
  } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col overflow-hidden"
      style={{ background: '#090c14', ...themeVars }}
    >
      {/* ══ TOP BAR ══════════════════════════════════════════ */}
      <header
        className="shrink-0 flex items-center justify-between px-5 border-b border-white/[0.06]"
        style={{ height: '56px', background: 'rgba(9,12,20,0.95)', backdropFilter: 'blur(12px)' }}
      >
        {/* Esquerda */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"
            title="Fechar Editor"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="w-px h-4 bg-white/8" />
          <div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h1 className="text-[13px] font-bold text-white tracking-tight">Proposal Builder</h1>
              <span className="text-[9px] bg-amber-400/12 text-amber-400 font-bold px-2 py-0.5 rounded-full tracking-widest uppercase">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-white/25 mt-0.5">
              {data.clientName}
              {isDirty && <span className="text-amber-400/50 ml-1.5">• não salvo</span>}
            </p>
          </div>
        </div>

        {/* Direita: ações */}
        <div className="flex items-center gap-2">
          {/* Restaurar */}
          <button
            onClick={() => { setBlocks(buildInitialBlocks(data)); setIsDirty(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white/35 hover:text-white/70 border border-white/8 hover:border-white/15 rounded-lg transition-all"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Restaurar
          </button>

          {/* Salvar */}
          {onSave && (
            <button
              onClick={() => { 
                onSave({ ...data, blocks, updatedAt: new Date().toISOString() }); 
                setIsDirty(false); 
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white/50 hover:text-white border border-white/8 hover:border-white/15 rounded-lg transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Salvar
            </button>
          )}

          {/* Excluir proposta */}
          {onDelete && data.id && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-red-400/60 hover:text-red-400 border border-red-500/10 hover:border-red-500/30 rounded-lg transition-all"
              title="Excluir proposta"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
              Excluir
            </button>
          )}
          {onDelete && data.id && showDeleteConfirm && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-red-400">Confirmar exclusão?</span>
              <button onClick={() => { onDelete(data.id!); onClose(); }}
                className="px-2 py-1 text-[11px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all">
                Sim
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-[11px] text-white/40 hover:text-white border border-white/8 rounded-lg transition-all">
                Não
              </button>
            </div>
          )}

          {/* PDF Claro */}
          <button onClick={handleExportLight} disabled={isExportingLight}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all disabled:opacity-60 border hover:brightness-110 active:scale-95"
            style={{
              color: exportLightStatus === 'success' ? '#10b981' : exportLightStatus === 'error' ? '#ef4444' : '#ffffff',
              borderColor: exportLightStatus === 'success' ? '#10b981' : exportLightStatus === 'error' ? '#ef4444' : 'rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
            }}>
            {isExportingLight ? (
              <><svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>Gerando...</>
            ) : exportLightStatus === 'success' ? '☀️ Pronto ✓' : exportLightStatus === 'error' ? '☀️ Erro' : '☀️ PDF Claro'}
          </button>

          {/* PDF Escuro */}
          <button onClick={handleExport} disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all disabled:opacity-60 hover:brightness-110 active:scale-95"
            style={{
              color: exportStatus === 'error' ? '#fff' : '#090c14',
              background: exportStatus === 'success' ? 'linear-gradient(135deg,#10b981,#34d399)' : exportStatus === 'error' ? 'linear-gradient(135deg,#ef4444,#f87171)' : isExporting ? 'rgba(196,160,80,0.4)' : 'linear-gradient(135deg,#c4a050,#e8c572)',
              boxShadow: exportStatus === 'success' ? '0 0 16px rgba(16,185,129,0.3)' : exportStatus === 'error' ? '0 0 16px rgba(239,68,68,0.3)' : '0 0 16px rgba(196,160,80,0.2)',
            }}>
            {isExporting ? (
              <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>Gerando...</>
            ) : exportStatus === 'success' ? '🌙 Pronto ✓' : exportStatus === 'error' ? '🌙 Erro' : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>🌙 PDF Escuro</>
            )}
          </button>

        </div>
      </header>

      {/* ══ CORPO ════════════════════════════════════════════ */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <BlockSidebar
            onAddBlock={handleAddBlock}
            theme={theme}
            onUpdateTheme={handleUpdateTheme}
          />
          {/* Canvas A4 */}
          <ProposalCanvas
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onRemoveBlock={handleRemoveBlock}
            onUpdateBlock={handleUpdateBlock}
            theme={theme}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeId && activeBlock ? (
            <div
              className="w-[700px] rounded-sm shadow-2xl overflow-hidden pointer-events-none"
              style={{ opacity: 0.88, transform: 'rotate(0.8deg) scale(0.97)', fontFamily: FONT_FAMILY_MAP[theme.fontFamily] }}
            >
              <BlockRenderer block={activeBlock} onUpdate={() => {}} theme={theme} />
            </div>
          ) : activeId?.startsWith('catalog::') ? (
            <div
              className="px-4 py-2.5 rounded-xl border border-amber-400/30 shadow-2xl pointer-events-none text-[13px] font-semibold text-amber-400"
              style={{ background: '#0b0f1a', opacity: 0.95, transform: 'rotate(1deg)' }}
            >
              {BLOCK_CATALOG.find((c) => `catalog::${c.type}` === activeId)?.label ?? 'Bloco'}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ══ STATUS BAR ══════════════════════════════════════ */}
      <footer className="shrink-0 flex items-center justify-between px-5 py-1.5 border-t border-white/[0.04]"
        style={{ background: 'rgba(0,0,0,0.4)' }}>
        <p className="text-[10px] text-white/15">
          ✦ Quark Proposal Engine v3.0 — Dark Luxury WYSIWYG
        </p>
        <p className="text-[10px] text-white/15">
          {blocks.length} bloco{blocks.length !== 1 ? 's' : ''} · {theme.fontFamily} · {theme.mode === 'light' ? '☀️ Claro' : '🌙 Escuro'}
        </p>
      </footer>
    </div>
  );
}
