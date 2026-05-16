import React, { createContext, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FINANCIAL_CONSTANTS } from '../lib/constants';
import { Lead } from '../types';
import { useAuth } from './AuthContext';

interface FinancialContextType {
  generateDREFromLead: (lead: Lead, proposalData?: any) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const generateDREFromLead = async (lead: Lead, proposalData?: any) => {
    if (!user) return;

    try {
      const hoje = new Date().toISOString().split('T')[0];
      const payloads = [];

      const valorTotal = proposalData?.data?.finalPrice || lead.value || 0;
      
      const custoKit = proposalData?.data?.priceKit 
          ? (proposalData.data.priceKit + (proposalData.data.modulesCount * proposalData.data.pricePerModule))
          : valorTotal * FINANCIAL_CONSTANTS.COST_KIT_PERCENTAGE; 
      
      const custoOperacao = proposalData?.data?.priceCA 
          ? ((proposalData.data.systemSizeKw * proposalData.data.priceCA) + (proposalData.data.additionalCosts || 0))
          : valorTotal * FINANCIAL_CONSTANTS.COST_LABOR_PERCENTAGE; 

      const impostos = proposalData?.data?.taxPercentage 
          ? (valorTotal * (proposalData.data.taxPercentage / 100))
          : valorTotal * FINANCIAL_CONSTANTS.COST_TAX_PERCENTAGE; 

      const custoEngenharia = valorTotal * FINANCIAL_CONSTANTS.COST_ENGINEERING_PERCENTAGE;
      const custoFrete = valorTotal * FINANCIAL_CONSTANTS.COST_FREIGHT_PERCENTAGE;
      const custoComissao = valorTotal * FINANCIAL_CONSTANTS.COST_COMMISSION_PERCENTAGE;

      if (valorTotal > 0) {
        payloads.push({
            description: `Venda Sistema Solar - ${lead.name}`,
            type: 'receita', category: FINANCIAL_CONSTANTS.CATEGORY_RESIDENTIAL, amount: valorTotal,
            date: hoje, note: proposalData ? 'Proposta Oficial' : 'Receita gerada do CRM', user_id: user.id
        });
        payloads.push({
            description: `Kit Fotovoltaico e Inversores - ${lead.name}`,
            type: 'custo', category: FINANCIAL_CONSTANTS.CATEGORY_EQUIPMENT, amount: custoKit,
            date: hoje, note: proposalData ? 'Cálculo da Proposta' : `Estimativa Padrão (${FINANCIAL_CONSTANTS.COST_KIT_PERCENTAGE * 100}%)`, user_id: user.id
        });
        payloads.push({
            description: `Instalação e Montagem - ${lead.name}`,
            type: 'custo', category: FINANCIAL_CONSTANTS.CATEGORY_LABOR, amount: custoOperacao,
            date: hoje, note: proposalData ? 'Custos CA' : `Estimativa Padrão (${FINANCIAL_CONSTANTS.COST_LABOR_PERCENTAGE * 100}%)`, user_id: user.id
        });
        payloads.push({
            description: `Impostos Incidentes (DAS/ICMS) - ${lead.name}`,
            type: 'despesa', category: FINANCIAL_CONSTANTS.CATEGORY_TAX, amount: impostos,
            date: hoje, note: proposalData ? `Alíquota da proposta: ${proposalData.data.taxPercentage}%` : `Estimativa Padrão (${FINANCIAL_CONSTANTS.COST_TAX_PERCENTAGE * 100}%)`, user_id: user.id
        });
        payloads.push({
            description: `Projeto e Homologação na Concessionária - ${lead.name}`,
            type: 'custo', category: FINANCIAL_CONSTANTS.CATEGORY_OTHER_CPV, amount: custoEngenharia,
            date: hoje, note: `Estimativa Padrão (${FINANCIAL_CONSTANTS.COST_ENGINEERING_PERCENTAGE * 100}%)`, user_id: user.id
        });
        payloads.push({
            description: `Frete de Equipamentos - ${lead.name}`,
            type: 'custo', category: FINANCIAL_CONSTANTS.CATEGORY_FREIGHT, amount: custoFrete,
            date: hoje, note: `Estimativa Padrão (${FINANCIAL_CONSTANTS.COST_FREIGHT_PERCENTAGE * 100}%)`, user_id: user.id
        });
        payloads.push({
            description: `Comissão do Vendedor - ${lead.name}`,
            type: 'despesa', category: FINANCIAL_CONSTANTS.CATEGORY_SALARIES, amount: custoComissao,
            date: hoje, note: `Estimativa Padrão (${FINANCIAL_CONSTANTS.COST_COMMISSION_PERCENTAGE * 100}%)`, user_id: user.id
        });
      }

      if (payloads.length > 0) {
        await supabase.from('financial_transactions').insert(payloads);
      }
      
    } catch (err) {
      console.error("Falha ao gerar DRE minuciosa automática via pipeline", err);
    }
  };

  return (
    <FinancialContext.Provider value={{ generateDREFromLead }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) throw new Error('useFinancial must be used within a FinancialProvider');
  return context;
};
