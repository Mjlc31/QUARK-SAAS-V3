// ============================================================
// PROPOSAL ENGINE — UTILITÁRIOS
// ============================================================

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
