import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lead, Task, User, LeadHistoryLog, Product, Project, Pipeline, Tag, LeadPipelineEntry, LeadStatus } from '../types';
import { storageService } from '../services/storageService';
import { supabase } from '../lib/supabaseClient';

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

interface AppContextType {
  user: User | null;
  leads: Lead[];
  tasks: Task[];
  users: User[];
  products: Product[];
  activities: Activity[];
  isLoading: boolean;
  isRecoveryMode: boolean;
  isSupabaseConnected: boolean;
  // CRM v2
  pipelines: Pipeline[];
  tags: Tag[];
  addPipeline: (name: string, type: Pipeline['type'], color: string) => Promise<void>;
  updateLeadTags: (leadId: string, tags: Tag[]) => Promise<void>;
  updateLeadPipelineStage: (leadId: string, pipelineId: string, stage: LeadStatus) => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  addLead: (lead: Partial<Lead>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  updateLeadStatus: (id: string, newStatus: Lead['status']) => Promise<void>;
  addLeadLog: (leadId: string, action: string, details: string) => Promise<void>;
  addTask: (taskData: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  projects: Project[];
  addProject: (project: Partial<Project>) => Promise<void>;
  updateProjectStatus: (id: string, status: Project['status']) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initial sync load to prevent Login flash
    try {
      const offlineUserStr = localStorage.getItem('quark_offline_user');
      if (offlineUserStr) return JSON.parse(offlineUserStr);
      
      const sbSession = localStorage.getItem('quark-auth-token');
      if (sbSession) {
         const parsed = JSON.parse(sbSession);
         if (parsed?.user) {
            return {
              id: parsed.user.id,
              email: parsed.user.email!,
              name: parsed.user.user_metadata?.name || 'Usuário',
              role: 'Sales',
              avatarInitials: (parsed.user.user_metadata?.name || 'U').substring(0, 2).toUpperCase()
            };
         }
      }
    } catch (e) {}
    return null;
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  // CRM v2
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Initialize Auth Listener & Check for Offline Session
  useEffect(() => {
    // 0. Immediate URL Check for Recovery (Prevents Flash)
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }

    // 1. Connection Health Check
    checkSupabaseConnection();

    // Flag to prevent fetchData being called twice on first load
    // (both getSession + onAuthStateChange fire on mount)
    let initialLoadHandled = false;

    // Load data from cache immediately to prevent waiting for auth
    loadDataFromCache();
    
    // Background fetch if user was synchronously loaded
    if (user) {
       fetchDataBackground();
    }

    // 2. Check Supabase Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        initialLoadHandled = true;
        const currentUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || 'Usuário',
          role: 'Sales',
          avatarInitials: (session.user.user_metadata?.name || 'U').substring(0, 2).toUpperCase()
        };
        if (!user) { // only fetch if we didn't already
           fetchDataBackground();
        }
      } else {
        // 3. Check Local Fallback Session (if Supabase failed previously)
        const offlineUserStr = localStorage.getItem('quark_offline_user');
        if (offlineUserStr) {
          initialLoadHandled = true;
          const offlineUser: User = JSON.parse(offlineUserStr);
          setUser(offlineUser);
          // Data is already loaded from cache
        }
      }
    });

    // Listen for Supabase changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }

      if (session?.user) {
        if (initialLoadHandled && event === 'INITIAL_SESSION') return;
        initialLoadHandled = true;

        const newUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || 'Usuário',
          role: 'Sales',
          avatarInitials: (session.user.user_metadata?.name || 'U').substring(0, 2).toUpperCase()
        };
        setUser(newUser);
        localStorage.removeItem('quark_offline_user');
        fetchDataBackground();
        checkSupabaseConnection();
      } else if (!localStorage.getItem('quark_offline_user')) {
        if (event !== 'INITIAL_SESSION') {
          setUser(null);
          setLeads([]);
          setTasks([]);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      const { error } = await supabase.from('leads').select('id').limit(1);
      const isConnected = !error || (error.code !== 'PGRST301' && !error.message?.includes('fetch') && !error.message?.includes('network'));
      setIsSupabaseConnected(isConnected);
      if (!isConnected) console.warn("⚠️ Supabase offline:", error?.message);
    } catch (err) {
      console.warn("Supabase Connectivity Check Failed:", err);
      setIsSupabaseConnected(false);
    }
  };

  const loadDataFromCache = () => {
    try {
      const getCached = (key: string, defaultVal: any) => {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultVal;
      };

      const cachedLeads = getCached('quark_leads', []);
      if (cachedLeads.length > 0) setLeads(cachedLeads);

      const cachedTasks = getCached('quark_tasks', []);
      if (cachedTasks.length > 0) setTasks(cachedTasks);

      const cachedProjects = getCached('quark_projects', []);
      if (cachedProjects.length > 0) setProjects(cachedProjects);

      const cachedPipelines = getCached('quark_pipelines', []);
      if (cachedPipelines.length > 0) setPipelines(cachedPipelines);

      const cachedTags = getCached('quark_tags', []);
      if (cachedTags.length > 0) setTags(cachedTags);

      const cachedProducts = getCached('quark_products', []);
      if (cachedProducts.length > 0) setProducts(cachedProducts);

      console.log('⚡ Dados em cache carregados instantaneamente.');
    } catch (err) {
      console.warn('Erro ao carregar do cache local', err);
    }
  };

  const fetchDataBackground = async (retryCount = 0) => {
    console.log(`🚀 Iniciando sincronização em background (Tentativa ${retryCount + 1})...`);
    
    try {
      // Carregamento Individual para Resiliência
      const loadSection = async (name: string, fetchFn: () => Promise<any>, stateFn: (data: any) => void) => {
        try {
          const startTime = performance.now();
          const data = await fetchFn();
          stateFn(data);
          const duration = (performance.now() - startTime).toFixed(0);
          console.log(`✅ [${name}] sincronizado: ${Array.isArray(data) ? data.length : '1'} itens (${duration}ms)`);
          return true;
        } catch (err) {
          console.error(`❌ Erro ao sincronizar [${name}]:`, err);
          return false;
        }
      };

      await Promise.all([
        loadSection('leads', () => storageService.getLeads(), setLeads),
        loadSection('tasks', () => storageService.getTasks(), setTasks),
        loadSection('users', () => storageService.getUsers(), setDirectoryUsers),
        loadSection('products', () => storageService.getProducts(), setProducts),
        loadSection('projects', () => storageService.getProjects(), setProjects),
        loadSection('pipelines', () => storageService.getPipelines(), setPipelines),
        loadSection('tags', () => storageService.getTags(), setTags),
      ]);

      setActivities([
        { id: '1', user: 'Sistema', action: 'sincronizou', target: 'Dados Cloud', time: 'Agora' },
      ]);
      
      console.log(`📊 Sincronização finalizada.`);
    } catch (error) {
      console.error('⚠️ Erro crítico na sincronização background:', error);
      if (retryCount < 1) {
        console.log('🔄 Tentando novamente em 2s...');
        setTimeout(() => fetchDataBackground(retryCount + 1), 2000);
      }
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Try Real Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const isAuthError = error.message.includes('Invalid login credentials') ||
          error.message.includes('not found') ||
          error.status === 400 ||
          error.status === 422;

        if (isAuthError) {
          return { error };
        }

        console.warn("Supabase Network/Config Failed (using offline fallback):", error.message);
        setIsSupabaseConnected(false);

        const fallbackUser: User = {
          id: 'offline-user-id',
          email: email,
          name: 'Modo Offline',
          role: 'Admin',
          avatarInitials: email.substring(0, 2).toUpperCase()
        };

        setUser(fallbackUser);
        localStorage.setItem('quark_offline_user', JSON.stringify(fallbackUser));
        fetchDataBackground();

        return { error: null };
      }

      setIsSupabaseConnected(true);
      return { error };
    } catch (err) {
      console.error("Critical Auth Error:", err);
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.status === 422) {
          return { error };
        }

        console.warn("Supabase SignUp Failed (using offline fallback):", error.message);
        setIsSupabaseConnected(false);
        const fallbackUser: User = {
          id: 'offline-user-id',
          email: email,
          name: name,
          role: 'Admin',
          avatarInitials: name.substring(0, 2).toUpperCase()
        };
        setUser(fallbackUser);
        localStorage.setItem('quark_offline_user', JSON.stringify(fallbackUser));
        fetchDataBackground();
        return { error: null };
      }

      setIsSupabaseConnected(true);
      return { error };
    } catch (err) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return { error };
    } catch (err) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        setIsRecoveryMode(false);
        window.history.replaceState(null, '', window.location.pathname);
      }
      return { error };
    } catch (err) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('quark_offline_user');
    await supabase.auth.signOut();
    setUser(null);
    setIsRecoveryMode(false);
  };

  const addActivity = (action: string, target: string) => {
    if (!user) return;
    const newActivity: Activity = {
      id: Date.now().toString(),
      user: user.name.split(' ')[0],
      action,
      target,
      time: 'Agora'
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 10));
  };

  const addLead = async (leadData: Partial<Lead>) => {
    const defaultHistory = [{
      id: Date.now().toString(),
      action: 'Criação',
      details: 'Lead cadastrado',
      timestamp: new Date().toISOString(),
      author: user?.name || 'Sistema'
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
    addActivity('cadastrou lead', newLead.name);
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const leadToUpdate = leads.find(l => l.id === id);
    if (!leadToUpdate) return;

    const updatedLead = { ...leadToUpdate, ...updates, updatedAt: new Date().toISOString() };

    setLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
    await storageService.syncLead(updatedLead);
  };

  const deleteLead = async (id: string) => {
    const leadToDelete = leads.find(l => l.id === id);
    setLeads(prev => prev.filter(l => l.id !== id));
    await storageService.deleteLead(id);
    if (leadToDelete) addActivity('excluiu lead', leadToDelete.name);
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

    const updatedLead = {
      ...currentLead,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      history: [newLog, ...currentLead.history]
    };

    setLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
    await storageService.syncLead(updatedLead);
    addActivity(`moveu para ${newStatus}`, currentLead.name);

    // INTEGRAÇÃO: Se mudou para "Fechado", gera lançamento automático de Receita e envia para a Engenharia
    if (newStatus === 'Fechado' && currentLead.status !== 'Fechado' && user) {
      try {
        const payload = {
            description: `Venda Sistema Solar - ${currentLead.name}`,
            type: 'receita',
            category: 'instalacao_residencial',
            amount: currentLead.value,
            date: new Date().toISOString().split('T')[0],
            note: `Lançamento automático do CRM`,
            user_id: user.id
        };
        await supabase.from('financial_transactions').insert([payload]);
        addActivity('fechou negócio: gerou receita & obra', currentLead.name);
        
        // Também jogar pra Engenharia!
        await addProject({
          clientId: currentLead.id,
          clientName: currentLead.name,
          clientPhone: currentLead.phone,
          city: currentLead.city,
          systemSizeKw: currentLead.monthlyConsumption / 123, // estimativa rápida se não tiver exata
          status: 'Vistoria'
        });
      } catch (err) {
        console.error("Falha ao gerar receita ou obra automática", err);
      }
    }
  };

  // ── CRM v2: Pipelines e Tags ──────────────────────────────────────────

  const addPipeline = async (name: string, type: Pipeline['type'], color: string) => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .insert([{ name, type, color }])
        .select()
        .single();
      if (error) throw error;
      const newPipeline: Pipeline = { id: data.id, name: data.name, type: data.type, color: data.color };
      setPipelines(prev => [...prev, newPipeline]);
    } catch (err) {
      console.error('Erro ao criar pipeline:', err);
    }
  };

  const updateLeadTags = async (leadId: string, newTags: Tag[]) => {
    // Atualiza tags no lead localmente + Supabase
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate) return;
    const updatedLead = { ...leadToUpdate, tags: newTags, updatedAt: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
    await storageService.syncLead(updatedLead);
    // Sincroniza na tabela lead_tags
    try {
      await supabase.from('lead_tags').delete().eq('lead_id', leadId);
      if (newTags.length > 0) {
        await supabase.from('lead_tags').insert(
          newTags.map(t => ({ lead_id: leadId, tag_id: t.id }))
        );
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
      
    // SINCRONIZAÇÃO CRÍTICA: Manter o status legado igual ao stage do pipeline 
    // para garantir que o Dashboard conte os leads corretamente!
    const updatedLead = { 
      ...leadToUpdate, 
      pipelineEntries: updatedEntries, 
      status: stage, 
      updatedAt: new Date().toISOString() 
    };
    
    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
    await storageService.syncLead(updatedLead);
    
    // Sincroniza na tabela lead_pipelines
    try {
      await supabase.from('lead_pipelines').upsert(
        { lead_id: leadId, pipeline_id: pipelineId, stage, updated_at: new Date() },
        { onConflict: 'lead_id,pipeline_id' }
      );
    } catch (err) {
      console.warn('Erro ao sincronizar pipeline stage:', err);
    }

    // INTEGRAÇÃO FINANCEIRA MINUCIOSA (CRM -> DRE)
    if (stage === 'Fechado' && oldStage !== 'Fechado' && user) {
      try {
        // Tenta buscar a proposta detalhada salva no banco
        const { data: proposalData } = await supabase
          .from('proposals')
          .select('data')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const hoje = new Date().toISOString().split('T')[0];
        const payloads = [];

        // Nova engenharia de Custos (7 Itens) baseada em propostas ou fallback padrão de mercado
        const valorTotal = proposalData?.data?.finalPrice || leadToUpdate.value || 0;
        
        // 1. Custo Kit (45%)
        const custoKit = proposalData?.data?.priceKit 
            ? (proposalData.data.priceKit + (proposalData.data.modulesCount * proposalData.data.pricePerModule))
            : valorTotal * 0.45; 
        
        // 2. Mão de Obra (10%)
        const custoOperacao = proposalData?.data?.priceCA 
            ? ((proposalData.data.systemSizeKw * proposalData.data.priceCA) + (proposalData.data.additionalCosts || 0))
            : valorTotal * 0.10; 

        // 3. Impostos (10%)
        const impostos = proposalData?.data?.taxPercentage 
            ? (valorTotal * (proposalData.data.taxPercentage / 100))
            : valorTotal * 0.10; 

        // 4. Engenharia/Homologação (3%)
        const custoEngenharia = valorTotal * 0.03;

        // 5. Frete (2%)
        const custoFrete = valorTotal * 0.02;

        // 6. Comissão (5%)
        const custoComissao = valorTotal * 0.05;

        if (valorTotal > 0) {
          // [+] 1. RECEITA BRUTA
          payloads.push({
              description: `Venda Sistema Solar - ${leadToUpdate.name}`,
              type: 'receita', category: 'instalacao_residencial', amount: valorTotal,
              date: hoje, note: proposalData ? 'Proposta Oficial' : 'Receita gerada do CRM', user_id: user.id
          });
          // [-] 2. CUSTO DO KIT E EQUIPAMENTOS
          payloads.push({
              description: `Kit Fotovoltaico e Inversores - ${leadToUpdate.name}`,
              type: 'custo', category: 'equipamentos', amount: custoKit,
              date: hoje, note: proposalData ? 'Cálculo da Proposta' : 'Estimativa Padrão (45%)', user_id: user.id
          });
          // [-] 3. CUSTO OPERACIONAL (Mão de obra)
          payloads.push({
              description: `Instalação e Montagem - ${leadToUpdate.name}`,
              type: 'custo', category: 'mao_de_obra', amount: custoOperacao,
              date: hoje, note: proposalData ? 'Custos CA' : 'Estimativa Padrão (10%)', user_id: user.id
          });
          // [-] 4. IMPOSTOS
          payloads.push({
              description: `Impostos Incidentes (DAS/ICMS) - ${leadToUpdate.name}`,
              type: 'despesa', category: 'imposto', amount: impostos,
              date: hoje, note: proposalData ? `Alíquota da proposta: ${proposalData.data.taxPercentage}%` : 'Estimativa Padrão (10%)', user_id: user.id
          });
          // [-] 5. ENGENHARIA / HOMOLOGAÇÃO
          payloads.push({
              description: `Projeto e Homologação na Concessionária - ${leadToUpdate.name}`,
              type: 'custo', category: 'outros_cpv', amount: custoEngenharia,
              date: hoje, note: 'Estimativa Padrão (3%)', user_id: user.id
          });
          // [-] 6. FRETE E LOGÍSTICA
          payloads.push({
              description: `Frete de Equipamentos - ${leadToUpdate.name}`,
              type: 'custo', category: 'frete', amount: custoFrete,
              date: hoje, note: 'Estimativa Padrão (2%)', user_id: user.id
          });
          // [-] 7. COMISSÃO DE VENDAS
          payloads.push({
              description: `Comissão do Vendedor - ${leadToUpdate.name}`,
              type: 'despesa', category: 'salarios', amount: custoComissao,
              date: hoje, note: 'Estimativa Padrão (5%)', user_id: user.id
          });
        }

        if (payloads.length > 0) {
          await supabase.from('financial_transactions').insert(payloads);
          addActivity('fechou negócio: gerou DRE minuciosa completa', leadToUpdate.name);
        }
        
        // Também jogar pra Engenharia!
        await addProject({
          clientId: leadToUpdate.id,
          clientName: leadToUpdate.name,
          clientPhone: leadToUpdate.phone,
          city: leadToUpdate.city,
          systemSizeKw: proposalData?.data?.systemSizeKw || (leadToUpdate.monthlyConsumption ? leadToUpdate.monthlyConsumption / 123 : 5),
          status: 'Vistoria'
        });
      } catch (err) {
        console.error("Falha ao gerar DRE minuciosa ou obra automática via pipeline", err);
      }
    }
  };

  const addLeadLog = async (leadId: string, action: string, details: string) => {
    const currentLead = leads.find(l => l.id === leadId);
    if (!currentLead) return;

    const newLog: LeadHistoryLog = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: new Date().toISOString(),
      author: user?.name || 'Sistema'
    };

    const updatedLead = { ...currentLead, history: [newLog, ...currentLead.history] };

    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
    await storageService.syncLead(updatedLead);
  };

  const addTask = async (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: taskData.title!,
      assignee: taskData.assignee || 'Unassigned',
      deadline: taskData.deadline || new Date().toISOString(),
      priority: taskData.priority || 'Medium',
      completed: false
    };

    setTasks(prev => [...prev, newTask]);
    await storageService.syncTask(newTask);
    addActivity('criou tarefa', newTask.title);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const updatedTask = { ...task, completed: !task.completed };
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    await storageService.syncTask(updatedTask);

    if (!updatedTask.completed) addActivity('concluiu tarefa', task.title);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await storageService.deleteTask(id);
  };

  const addProject = async (projectData: Partial<Project>) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      clientId: projectData.clientId || '',
      clientName: projectData.clientName || 'Novo Projeto',
      clientPhone: projectData.clientPhone || '',
      city: projectData.city || 'Desconhecida',
      systemSizeKw: Number(projectData.systemSizeKw) || 0,
      status: projectData.status || 'Vistoria',
      updatedAt: new Date().toISOString()
    };
    setProjects(prev => [...prev, newProject]);
    addActivity('criou projeto', newProject.clientName);
    await storageService.syncProject(newProject);
  };

  const updateProjectStatus = async (id: string, status: Project['status']) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const updatedProject = { ...project, status, updatedAt: new Date().toISOString() };
    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));

    addActivity(`atualizou fase para ${status}`, project.clientName);
    await storageService.syncProject(updatedProject);
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    const updatedProject = { ...project, ...updates, updatedAt: new Date().toISOString() };
    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    addActivity(`editou a obra`, project.clientName);
    await storageService.syncProject(updatedProject);
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await storageService.deleteProject(id);
  };

  return (
    <AppContext.Provider value={{
      user, leads, tasks, users: directoryUsers, products, activities, isLoading, isRecoveryMode, isSupabaseConnected,
      pipelines, tags, addPipeline, updateLeadTags, updateLeadPipelineStage,
      login, signUp, resetPassword, updatePassword, logout, addLead, updateLead, deleteLead, updateLeadStatus, addLeadLog, addTask, toggleTask, deleteTask,
      projects, addProject, updateProjectStatus, updateProject, deleteProject
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};