// ============================================================
// BLOCO: TEXTO LIVRE (Rich Text) v2.0
// Editor de rich-text via contentEditable com toolbar básica
// ============================================================
import React, { useRef, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { TextContent, ProposalTheme } from '../types';
import { getWebColors } from '../utils';

interface Props {
  content: TextContent;
  onUpdate: (content: Partial<TextContent>) => void;
  theme: ProposalTheme;
}

// Toolbar de formatação simples
interface ToolbarButtonProps {
  command: string;
  value?: string;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({ command, value, children, title }: ToolbarButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(command, false, value);
  };
  return (
    <button
      onMouseDown={handleClick}
      title={title}
      style={{
        width: '28px', height: '28px', borderRadius: '6px',
        border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#475569', fontSize: '13px',
        fontWeight: 600, transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
        (e.currentTarget as HTMLButtonElement).style.color = '#1a2540';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = '#475569';
      }}
    >
      {children}
    </button>
  );
}

export function BlockText({ content, onUpdate, theme }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const C = getWebColors(theme);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (editorRef.current) {
      onUpdate({ html: editorRef.current.innerHTML });
    }
  }, [onUpdate]);

  return (
    <div style={{ padding: '32px 48px 40px', background: C.BACKGROUND }}>
      {/* Toolbar de formatação */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '6px 10px',
        background: C.SURFACE,
        border: `1px solid ${C.BORDER}`,
        borderRadius: '10px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        opacity: isFocused ? 1 : 0.6,
        transition: 'opacity 0.2s',
      }}>
        {/* Formatação de texto */}
        <ToolbarButton command="bold" title="Negrito (Ctrl+B)">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton command="italic" title="Itálico (Ctrl+I)">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton command="underline" title="Sublinhado (Ctrl+U)">
          <u>U</u>
        </ToolbarButton>
        <ToolbarButton command="strikeThrough" title="Tachado">
          <s>S</s>
        </ToolbarButton>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* Listas */}
        <ToolbarButton command="insertUnorderedList" title="Lista com marcadores">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton command="insertOrderedList" title="Lista numerada">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        </ToolbarButton>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* Alinhamento */}
        <ToolbarButton command="justifyLeft" title="Alinhar à esquerda">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton command="justifyCenter" title="Centralizar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" />
          </svg>
        </ToolbarButton>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* Heading */}
        <ToolbarButton command="formatBlock" value="h2" title="Título">
          <span style={{ fontSize: '11px', fontWeight: 800 }}>H2</span>
        </ToolbarButton>
        <ToolbarButton command="formatBlock" value="p" title="Parágrafo normal">
          <span style={{ fontSize: '11px' }}>¶</span>
        </ToolbarButton>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* Limpar formatação */}
        <ToolbarButton command="removeFormat" title="Remover formatação">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            <line x1="3" y1="21" x2="21" y2="3" />
          </svg>
        </ToolbarButton>

        {/* Separador e dica */}
        <span style={{
          marginLeft: 'auto', fontSize: '10px', color: '#64748b',
          fontStyle: 'italic', paddingRight: '4px',
        }}>
          {isFocused ? 'Editando...' : 'Clique para editar'}
        </span>
      </div>

      {/* Área de edição */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.html) }}
        style={{
          minHeight: '120px',
          fontSize: '14px',
          color: C.TEXT,
          lineHeight: 1.8,
          outline: 'none',
          padding: '4px 0',
          cursor: 'text',
        }}
      />

      {/* Estilo do editor injetado globalmente */}
      <style>{`
        [contenteditable] h1 { font-size: 28px; font-weight: 800; color: ${C.TEXT}; margin: 16px 0 8px; }
        [contenteditable] h2 { font-size: 22px; font-weight: 700; color: ${C.TEXT}; margin: 14px 0 6px; }
        [contenteditable] h3 { font-size: 18px; font-weight: 700; color: ${C.TEXT_MUTED}; margin: 12px 0 6px; }
        [contenteditable] ul { list-style: disc; padding-left: 24px; color: ${C.TEXT}; }
        [contenteditable] ol { list-style: decimal; padding-left: 24px; color: ${C.TEXT}; }
        [contenteditable] li { margin-bottom: 4px; }
        [contenteditable] strong { font-weight: 700; color: ${C.TEXT}; }
        [contenteditable] em { font-style: italic; color: ${C.MUTED}; }
        [contenteditable]:focus-visible { outline: none; }
      `}</style>

      {/* Rodapé discreto */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${C.BORDER}`,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ fontSize: '12px' }}>💡</span>
        <p style={{ fontSize: '11px', color: C.MUTED, fontStyle: 'italic' }}>
          Este campo suporta formatação rica. Use para adicionar cláusulas, observações ou condições específicas.
        </p>
      </div>
    </div>
  );
}
