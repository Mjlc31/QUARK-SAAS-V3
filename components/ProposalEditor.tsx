// ============================================================
// PROPOSAL EDITOR — Bridge de Compatibilidade Retroativa
// Mantém a API pública intacta para o CRM (data, onClose, onSave)
// e delega toda a lógica ao novo ProposalBuilder modular.
// ============================================================
import React from 'react';
import { ProposalBuilder } from './proposal';

export interface ProposalData {
  id?: string;
  clientName: string;
  city: string;
  consumption: number;
  systemSizeKw: number;
  moduleBrand: string;
  modulePower: number;
  modulesCount: number;
  inverterBrand: string;
  inverterPower: number;
  inverterCount: number;
  pricePerModule: number;
  priceKit: number;
  priceCA: number;
  taxPercentage: number;
  profitPercentage: number;
  additionalCosts: number;
  finalPrice: number;
  // Metadados
  blocks?: any[];
  createdAt?: string;
  updatedAt?: string;
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
  tags?: string[];
}


interface Props {
  data: ProposalData;
  onClose: () => void;
  onSave?: (data: ProposalData) => void;
  onDelete?: (id: string) => void;
}

export const ProposalEditor: React.FC<Props> = ({ data, onClose, onSave, onDelete }) => {
  return <ProposalBuilder data={data} onClose={onClose} onSave={onSave} onDelete={onDelete} />;
};
