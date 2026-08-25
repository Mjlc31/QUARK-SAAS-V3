import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Lead, Pipeline, Tag, LeadStatus, LeadHistoryLog, LeadPipelineEntry } from '../types';
import { storageService } from '../services/storageService';
import { supabase } from '../lib/supabaseClient';
import { PIPELINE_CONSTANTS } from '../lib/constants';
import { useAuth } from './AuthContext';
import { useProject } from './ProjectContext';
import { useFinancial } from './FinancialContext';

interface CrmContextType {
  leads: Lead[];
  pipelines: Pipeline[];
  tags: Tag[];
  addPipeline: (name: string, type: Pipeline['type'], color: string) => Promise<void>;
  updatePipelineStages: (pipelineId: string, stages: Pipeline['stages']) => Promise<void>;
  updateLeadTags: (leadId: string, tags: Tag[]) => Promise<void>;
  updateLeadPipelineStage: (leadId: string, pipelineId: string, stage: LeadStatus) => Promise<void>;
  addLead: (lead: Partial<Lead>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  updateLeadStatus: (id: string, newStatus: Lead['status']) => Promise<void>;
  addLeadLog: (leadId: string, action: string, details: string) => Promise<void>;
  loadCrmData: () => Promise<void>;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const cached = localStorage.getItem('quark_leads');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [pipelines, setPipelines] = useState<Pipeline[]>(() => {
    try {
      const cached = localStorage.getItem('quark_pipelines');
      return cached ? JSON.parse(cached) : PIPELINE_CONSTANTS.DEFAULT_FALLBACK as Pipeline[];
    } catch { return PIPELINE_CONSTANTS.DEFAULT_FALLBACK as Pipeline[]; }
  });
  const [tags, setTags] = useState<Tag[]>(() => {
    try {
      const cached = localStorage.getItem('quark_tags');
      return cached ? JSON.parse(cached) : PIPELINE_CONSTANTS.DEFAULT_TAGS as Tag[];
    } catch { return PIPELINE_CONSTANTS.DEFAULT_TAGS as Tag[]; }
  });

  const { user } = useAuth();
  const { addProject } = useProject();
  const { generateDREFromLead } = useFinancial();

  const loadCrmData = async () => {
    try {
      const [leadsData, pipelinesData, tagsData] = await Promise.all([
        storageService.getLeads(),
        storageService.getPipelines(),
        storageService.getTags()
      ]);
      setLeads(leadsData);
      setPipelines(pipelinesData);
      setTags(tagsData);
    } catch (err) {
      console.error('Error loading CRM data', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadCrmData();
    } else {
      setLeads([]);
    }
  }, [user]);

  const addPipeline = async (name: string, type: Pipeline['type'], color: string) => {
    try {
      const defaultStages = [
        { id: 'Lead', name: 'Novos Leads', color: 'border-blue-500', order: 0 },
        { id: 'Qualificacao', name: 'Em Qualificação', color: 'border-yellow-500', order: 1 },
        { id: 'Proposta', name: 'Proposta Enviada', color: 'border-purple-500', order: 2 },
        { id: 'Fechado', name: 'Fechado / Ganho', color: 'border-lime-500', order: 3 }
      ];
      const { data, error } = await supabase.from('pipelines').insert([{ name, type, color, stages: defaultStages }]).select().single();
      if (error) throw error;
      const newPipeline: Pipeline = { id: data.id, name: data.name, type: data.type, color: data.color, stages: data.stages || defaultStages };
      setPipelines(prev => [...prev, newPipeline]);
    } catch (err) {
      console.error('Erro ao criar pipeline:', err);
    }
  };

  const updatePipelineStages = async (pipelineId: string, stages: Pipeline['stages']) => {
    try {
      setPipelines(prev => prev.map(p => p.id === pipelineId ? { ...p, stages } : p));
      await supabase.from('pipelines').update({ stages }).eq('id', pipelineId);
    } catch (err) {
      console.error('Erro ao atualizar estágios da pipeline:', err);
    }
  };

  const updateLeadTags = async (leadId: string, newTags: Tag[]) => {
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate) return;
    const updatedLead = { ...leadToUpdate, tags: newTags, updatedAt: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
    await storageService.syncLead(updatedLead);
    try {
      await supabase.from('lead_tags').delete().eq('lead_id', leadId);
      if (newTags.length > 0) {
        await supabase.from('lead_tags').insert(newTags.map(t => ({ lead_id: leadId, tag_id: t.id })));
      }
    } catch (err) {
      console.warn('Erro ao sincronizar tags:', err);
    }
  };

  const updateLeadPipelineStage = async (leadId: string, pipelineId: string, stage: LeadStatus) => {
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate) return;
    const entries = leadToUpdate.pipelineEntries || [];
    const existing = entries.find(e => e.pipelineId === pipelineId);
    const oldStage = existing?.stage;

    const updatedEntries: LeadPipelineEntry[] = existing
      ? entries.map(e => e.pipelineId === pipelineId ? { ...e, stage } : e)
      : [...entries, { pipelineId, stage }];
      
    const updatedLead = { ...leadToUpdate, pipelineEntries: updatedEntries, status: stage, updatedAt: new Date().toISOString() };
    
    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
    await storageService.syncLead(updatedLead);
    
    try {
      await supabase.from('lead_pipelines').upsert({ lead_id: leadId, pipeline_id: pipelineId, stage, updated_at: new Date() }, { onConflict: 'lead_id,pipeline_id' });
    } catch (err) {
      console.warn('Erro ao sincronizar pipeline stage:', err);
    }

    if (stage === 'Fechado' && oldStage !== 'Fechado' && user) {
      try {
        const { data: proposalData } = await supabase.from('proposals').select('data').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).single();
        await generateDREFromLead(updatedLead, proposalData ?? undefined);
        await addProject({
          clientId: updatedLead.id,
          clientName: updatedLead.name,
          clientPhone: updatedLead.phone,
          city: updatedLead.city,
          systemSizeKw: proposalData?.data?.systemSizeKw || (updatedLead.monthlyConsumption ? updatedLead.monthlyConsumption / 123 : 5),
          status: 'Vistoria'
        });
      } catch (err) {
        console.error("Falha ao gerar integração do pipeline fechado", err);
      }
    }
  };

  const updateLeadStatus = async (id: string, newStatus: Lead['status']) => {
    const currentLead = leads.find(l => l.id === id);
    if (!currentLead) return;

    const newLog: LeadHistoryLog = {
      id: Date.now().toString(),
      action: 'Mudança de Status',
      details: `De ${currentLead.status} para ${newStatus}`,
      timestamp: new Date().toISOString(),
      author: user?.name || 'Sistema'
    };

    const updatedLead = { ...currentLead, status: newStatus, updatedAt: new Date().toISOString(), history: [newLog, ...currentLead.history] };
    setLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
    await storageService.syncLead(updatedLead);

    if (newStatus === 'Fechado' && currentLead.status !== 'Fechado' && user) {
      try {
        await generateDREFromLead(updatedLead);
        await addProject({
          clientId: currentLead.id,
          clientName: currentLead.name,
          clientPhone: currentLead.phone,
          city: currentLead.city,
          systemSizeKw: currentLead.monthlyConsumption / 123,
          status: 'Vistoria'
        });
      } catch (err) {
        console.error("Falha ao gerar integração do status fechado", err);
      }
    }
  };

  const addLead = async (leadData: Partial<Lead>) => {
    const defaultHistory = [{
      id: Date.now().toString(), action: 'Criação', details: 'Lead cadastrado', timestamp: new Date().toISOString(), author: user?.name || 'Sistema'
    }];
    const newLead: Lead = {
      id: crypto.randomUUID(),
      name: leadData.name || 'Novo Lead',
      phone: leadData.phone || '',
      city: leadData.city || '',
      value: Number(leadData.value) || 0,
      monthlyConsumption: Number(leadData.monthlyConsumption) || 0,
      status: 'Lead',
      assignee: user?.name.split(' ')[0] || 'Unassigned',
      history: defaultHistory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setLeads(prev => [newLead, ...prev]);
    await storageService.syncLead(newLead);
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const leadToUpdate = leads.find(l => l.id === id);
    if (!leadToUpdate) return;
    const updatedLead = { ...leadToUpdate, ...updates, updatedAt: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
    await storageService.syncLead(updatedLead);
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    await storageService.deleteLead(id);
  };

  const addLeadLog = async (leadId: string, action: string, details: string) => {
    const currentLead = leads.find(l => l.id === leadId);
    if (!currentLead) return;
    const newLog: LeadHistoryLog = { id: Date.now().toString(), action, details, timestamp: new Date().toISOString(), author: user?.name || 'Sistema' };
    const updatedLead = { ...currentLead, history: [newLog, ...currentLead.history] };
    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
    await storageService.syncLead(updatedLead);
  };

  return (
    <CrmContext.Provider value={{ leads, pipelines, tags, addPipeline, updatePipelineStages, updateLeadTags, updateLeadPipelineStage, addLead, updateLead, deleteLead, updateLeadStatus, addLeadLog, loadCrmData }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (context === undefined) throw new Error('useCrm must be used within a CrmProvider');
  return context;
};
