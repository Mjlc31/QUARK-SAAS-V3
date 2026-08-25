// ============================================================
// PROPOSAL ENGINE — UTILITÁRIOS
// ============================================================
import { ProposalTheme } from './types';

export function getWebColors(theme: ProposalTheme) {
  const isLight = theme.mode === 'light';
  return {
    BACKGROUND: theme.backgroundColor || (isLight ? '#ffffff' : '#0A0A0A'),
    SURFACE: isLight ? '#f4f4f6' : 'rgba(255,255,255,0.03)',
    SURFACE_HOVER: isLight ? '#e4e4e7' : 'rgba(255,255,255,0.06)',
    BORDER: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)',
    BORDER_STRONG: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)',
    MUTED: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)',
    TEXT_MUTED: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)',
    TEXT: theme.textColor || (isLight ? '#111111' : '#ffffff'),
  };
}
// nanoid leve — gera IDs únicos sem dependência extra
export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Formata moeda pt-BR
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Formata número com separador de milhar
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Helper para edição inline de texto
export const editable = <T,>(
  field: keyof T,
  onUpdate: (content: Partial<T>) => void
) => ({
  contentEditable: true as const,
  suppressContentEditableWarning: true,
  onBlur: (e: any) =>
    onUpdate({ [field]: e.currentTarget.innerText } as any),
  style: { outline: 'none', cursor: 'text' } as any,
});
