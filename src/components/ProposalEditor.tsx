// ============================================================
// PROPOSAL EDITOR — Bridge de Compatibilidade Retroativa
// Mantém a API pública intacta para o CRM (data, onClose, onSave)
// e delega toda a lógica ao novo ProposalBuilder modular.
// ============================================================
import React from 'react';
import { ProposalBuilder } from './proposal';
import type { ProposalData } from './proposal/types';

// Re-exporta o ProposalData canônico do motor de propostas
// para que Proposals.tsx e outros consumidores obtenham o tipo completo v4.0
export type { ProposalData } from './proposal/types';

interface Props {
  data: ProposalData;
  onClose: () => void;
  onSave?: (data: ProposalData) => void;
  onDelete?: (id: string) => void;
}

export const ProposalEditor: React.FC<Props> = ({ data, onClose, onSave, onDelete }) => {
  return <ProposalBuilder data={data} onClose={onClose} onSave={onSave} onDelete={onDelete} />;
};
