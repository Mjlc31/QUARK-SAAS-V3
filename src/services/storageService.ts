import { Lead, Task, Product, User, Project } from '../types';
import { supabase } from '../lib/supabaseClient';

// Memory cache fallback for when localStorage is blocked (e.g. mobile private mode)
const memoryStorage: Record<string, string> = {};

// Safe localStorage wrapper for mobile private mode
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key) || memoryStorage[key] || null;
    } catch {
      return memoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn(`⚠️ LocalStorage bloqueado. Salvando '${key}' apenas em memória.`);
    }
    memoryStorage[key] = value;
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch { /* noop */ }
    delete memoryStorage[key];
  }
};

// Initial Mock Data (Fallback only)
const INITIAL_LEADS: Lead[] = [
  {
    id: '1',
    name: 'Supermercado Silva',
    phone: '5511999999999',
    value: 45000,
    status: 'Lead',
    createdAt: new Date().toISOString(),
    city: 'São Paulo',
    monthlyConsumption: 1200,
    updatedAt: new Date().toISOString(),
    history: []
  }
];

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Validar projeto elétrico - Silva', assignee: 'Arthur', deadline: '2023-11-20', completed: false, priority: 'High' }
];

const INITIAL_PRODUCTS: Product[] = [
  // --- Módulos Existentes ---
  {
    id: '1',
    name: 'HiKu6 Mono PERC',
    brand: 'Canadian Solar',
    category: 'Módulo',
    price: 650,
    power: 550,
    powerUnit: 'W',
    stock: 120,
    description: 'Painel Monocristalino de alta eficiência.'
  },
  // --- Novos Módulos Solicitados (Genéricos) ---
  { id: '14', name: 'Módulo 570W', brand: 'Genérico', category: 'Módulo', price: 0, power: 570, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '15', name: 'Módulo 580W', brand: 'Genérico', category: 'Módulo', price: 0, power: 580, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '16', name: 'Módulo 585W', brand: 'Genérico', category: 'Módulo', price: 0, power: 585, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '17', name: 'Módulo 595W', brand: 'Genérico', category: 'Módulo', price: 0, power: 595, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '18', name: 'Módulo 600W', brand: 'Genérico', category: 'Módulo', price: 0, power: 600, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '19', name: 'Módulo 605W', brand: 'Genérico', category: 'Módulo', price: 0, power: 605, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '20', name: 'Módulo 610W', brand: 'Genérico', category: 'Módulo', price: 0, power: 610, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '21', name: 'Módulo 660W', brand: 'Genérico', category: 'Módulo', price: 0, power: 660, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '22', name: 'Módulo 695W', brand: 'Genérico', category: 'Módulo', price: 0, power: 695, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },
  { id: '23', name: 'Módulo 700W', brand: 'Genérico', category: 'Módulo', price: 0, power: 700, powerUnit: 'W', stock: 0, description: 'Potência cadastrada.' },

  // --- Inversores (Base Existente + Novos Solicitados) ---
  {
    id: '2',
    name: 'SUN2000-50KTL',
    brand: 'Huawei',
    category: 'Inversor',
    price: 12500,
    power: 50,
    powerUnit: 'kW',
    stock: 5,
    description: 'Inversor String Trifásico inteligente.'
  },
  {
    id: '3',
    name: 'Inversor Series XS/DNS',
    brand: 'GoodWe',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '4',
    name: 'Inversor S6/S5',
    brand: 'Solis',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '5',
    name: 'Inversor MIN/MID',
    brand: 'Growatt',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '6',
    name: 'Inversor SG Series',
    brand: 'Sungrow',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '7',
    name: 'Inversor ASW',
    brand: 'Solplanet',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '8',
    name: 'Microinversor Genérico',
    brand: 'Microinversor',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'W',
    stock: 0,
    description: 'Microinversor (Marca a definir).'
  },
  {
    id: '9',
    name: 'Microinversor BDM',
    brand: 'NEP',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'W',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '10',
    name: 'Inversor G3',
    brand: 'Sofar',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '11',
    name: 'Inversor AS Series',
    brand: 'Auxsol',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '12',
    name: 'Inversor R5/R6',
    brand: 'SAJ',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  },
  {
    id: '13',
    name: 'Inversor GT',
    brand: 'Livoltek',
    category: 'Inversor',
    price: 0,
    power: 0,
    powerUnit: 'kW',
    stock: 0,
    description: 'Modelo a definir.'
  }
];

// Fallback user if DB is empty
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@quark.com', role: 'Admin', avatarInitials: 'AD' },
];

const withTimeout = <T,>(p: Promise<T>, ms = 8000): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export const storageService = {
  // --- LEADS ---
  getLeads: async (): Promise<Lead[]> => {
    try {
      const res = await withTimeout(supabase.from('leads').select('*').is('deleted_at', null) as any).catch(() => ({ data: null, error: true }));
      const { data, error } = res as any;

      if (error) {
        throw new Error('Supabase offline');
      }

      // Robust mapping: handles both {id, data: Lead} and direct {id, name...}
      const cloudLeads = (data || [])
        .filter((row: any) => !row.deleted_at)
        .map((row: any) => {
          if (row.data && typeof row.data === 'object') {
            return { ...row.data, id: row.id };
          }
          return row;
        }) as Lead[];

      const localStr = safeLocalStorage.getItem('quark_leads');
      const localData: Lead[] = localStr ? JSON.parse(localStr) : [];

      // Cloud empty but local has data → sync local to cloud in background non-blocking
      if (cloudLeads.length === 0 && localData.length > 0) {
        Promise.allSettled(
          localData.map(lead => supabase.from('leads').upsert({ id: lead.id, data: lead, updated_at: lead.updatedAt }))
        ).catch(() => {});
        return localData;
      }

      // Save to local cache
      if (cloudLeads.length > 0) {
        safeLocalStorage.setItem('quark_leads', JSON.stringify(cloudLeads));
        return cloudLeads;
      }

      return localData.length > 0 ? localData : INITIAL_LEADS;
    } catch (err) {
      console.warn("⚠️ Fallback para cache local (Leads):", err);
      const local = safeLocalStorage.getItem('quark_leads');
      return local ? JSON.parse(local) : INITIAL_LEADS;
    }
  },

  syncLead: async (lead: Lead): Promise<{ success: boolean; error?: any }> => {
    // 1. Salva localmente SEMPRE (cache first)
    try {
      const currentLeadsStr = safeLocalStorage.getItem('quark_leads');
      const currentLeads: Lead[] = currentLeadsStr ? JSON.parse(currentLeadsStr) : [];
      const updatedLocalLeads = currentLeads.some(l => l.id === lead.id)
        ? currentLeads.map(l => l.id === lead.id ? lead : l)
        : [lead, ...currentLeads];
      safeLocalStorage.setItem('quark_leads', JSON.stringify(updatedLocalLeads));
    } catch (localErr) {
      console.warn('⚠️ Falha ao salvar lead no cache local:', localErr);
    }

    // 2. Sincroniza com Supabase
    try {
      const { data: userAuth } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const currentUserId = userAuth?.user?.id || '7dacc88f-9ebd-4710-a1be-0647841db24a';

      const { error } = await supabase.from('leads').upsert({
        id: lead.id,
        user_id: currentUserId,
        name: lead.name || 'Sem nome',
        phone: lead.phone || null,
        email: lead.email || null,
        city: lead.city || null,
        status: lead.status || 'Lead',
        value: Number(lead.value) || 0,
        data: lead,
        updated_at: new Date().toISOString()
      });

      if (error) {
        console.error('🔴 SUPABASE ERRO [syncLead] — Lead NÃO salvo na nuvem!', {
          leadId: lead.id,
          leadName: lead.name,
          errorCode: error.code,
          errorMessage: error.message,
          hint: (error as any).hint,
          details: (error as any).details,
        });
        return { success: false, error };
      }

      console.log(`✅ Lead "${lead.name}" salvo na nuvem com sucesso.`);
      return { success: true };
    } catch (err) {
      console.error('🔴 ERRO CRÍTICO [syncLead]:', err);
      return { success: false, error: err };
    }
  },

  deleteLead: async (id: string) => {
    try {
      const currentLeadsStr = safeLocalStorage.getItem('quark_leads');
      if (currentLeadsStr) {
        const list = JSON.parse(currentLeadsStr) as Lead[];
        safeLocalStorage.setItem('quark_leads', JSON.stringify(list.filter(l => l.id !== id)));
      }
      await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  },

  // --- TASKS ---
  getTasks: async (): Promise<Task[]> => {
    try {
      const withTimeout = <T,>(p: Promise<T>, ms = 8000): Promise<T> =>
        Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

      const res = await withTimeout(supabase.from('tasks').select('*') as any).catch(() => ({ data: null, error: true }));
      const { data, error } = res as any;
      if (error) { throw new Error('Supabase offline'); }

      const localStr = safeLocalStorage.getItem('quark_tasks');
      const localData: Task[] = localStr ? JSON.parse(localStr) : [];

      if ((!data || data.length === 0) && localData.length > 0) {
        Promise.allSettled(
          localData.map(task => supabase.from('tasks').upsert({ id: task.id, data: task, updated_at: new Date() }))
        ).catch(() => {});
        return localData;
      }

      if (data && data.length > 0) {
        const parsed = data.map((row: any) => row.data ? { ...row.data, id: row.id } : row);
        safeLocalStorage.setItem('quark_tasks', JSON.stringify(parsed));
        return parsed as Task[];
      }
      return INITIAL_TASKS;
    } catch {
      const local = safeLocalStorage.getItem('quark_tasks');
      return local ? JSON.parse(local) : INITIAL_TASKS;
    }
  },

  syncTask: async (task: Task) => {
    try {
      const current = safeLocalStorage.getItem('quark_tasks');
      const list: Task[] = current ? JSON.parse(current) : [];
      const updated = list.some(t => t.id === task.id) ? list.map(t => t.id === task.id ? task : t) : [...list, task];
      safeLocalStorage.setItem('quark_tasks', JSON.stringify(updated));
      await supabase.from('tasks').upsert({ id: task.id, data: task, updated_at: new Date() });
    } catch (err) { console.error(err); }
  },

  deleteTask: async (id: string) => {
    try {
      const current = safeLocalStorage.getItem('quark_tasks');
      if (current) {
        const list = JSON.parse(current) as Task[];
        safeLocalStorage.setItem('quark_tasks', JSON.stringify(list.filter(t => t.id !== id)));
      }
      await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } catch (err) { console.error(err); }
  },

  // --- PRODUCTS ---
  getProducts: async (): Promise<Product[]> => {
    try {
      const res = await withTimeout(supabase.from('products').select('*') as any).catch(() => ({ data: null, error: true }));
      const { data, error } = res as any;
      if (error) { throw new Error('Supabase offline'); }

      const localStr = safeLocalStorage.getItem('quark_products');
      const localData: Product[] = localStr ? JSON.parse(localStr) : [];

      if ((!data || data.length === 0) && localData.length > 0) {
        return localData;
      }

      if (data && data.length > 0) {
        const parsed = data.map((row: any) => row.data ? { ...row.data, id: row.id } : row);
        safeLocalStorage.setItem('quark_products', JSON.stringify(parsed));
        return parsed as Product[];
      }
      return INITIAL_PRODUCTS;
    } catch {
      const local = safeLocalStorage.getItem('quark_products');
      return local ? JSON.parse(local) : INITIAL_PRODUCTS;
    }
  },

  syncProduct: async (product: Product) => {
    try {
      const current = safeLocalStorage.getItem('quark_products');
      const list: Product[] = current ? JSON.parse(current) : [];
      const updated = list.some(p => p.id === product.id) ? list.map(p => p.id === product.id ? product : p) : [...list, product];
      safeLocalStorage.setItem('quark_products', JSON.stringify(updated));
      await withTimeout(Promise.resolve(supabase.from('products').upsert({ id: product.id, data: product, updated_at: new Date() })), 1000).catch(() => {});
    } catch (err) { console.error(err); }
  },

  deleteProduct: async (id: string) => {
    try {
      const current = safeLocalStorage.getItem('quark_products');
      if (current) {
        const list = JSON.parse(current) as Product[];
        safeLocalStorage.setItem('quark_products', JSON.stringify(list.filter(p => p.id !== id)));
      }
      await withTimeout(Promise.resolve(supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id)), 1000).catch(() => {});
    } catch (err) { console.error(err); }
  },

  // --- AUTH (Users Directory) ---
  // Now fetches from real Supabase 'profiles' table
  getUsers: async (): Promise<User[]> => {
    try {
      const res = await withTimeout(supabase.from('profiles').select('*') as any).catch(() => ({ data: null, error: true }));
      const { data, error } = res as any;
      if (error) { throw new Error('Supabase offline'); }

      if (data && data.length > 0) {
        const users: User[] = data.map((p: any) => ({
          id: p.id,
          name: p.name || 'Usuário',
          email: p.email || '',
          role: (p.role as any) || 'Sales',
          avatarInitials: p.avatar_initials || 'U'
        }));
        safeLocalStorage.setItem('quark_users', JSON.stringify(users));
        return users;
      }
      return INITIAL_USERS;
    } catch {
      const local = safeLocalStorage.getItem('quark_users');
      return local ? JSON.parse(local) : INITIAL_USERS;
    }
  },

  // --- PROJECTS ---
  getProjects: async (): Promise<Project[]> => {
    try {
      const res = await withTimeout(supabase.from('projects').select('*') as any).catch(() => ({ data: null, error: true }));
      const { data, error } = res as any;
      if (error) {
        throw new Error('Supabase offline');
      }

      const cloudProjects = (data || []).map((row: any) => {
        if (row.data && typeof row.data === 'object') {
          return { ...row.data, id: row.id };
        }
        return row;
      }) as Project[];

      const localStr = safeLocalStorage.getItem('quark_projects');
      const localData: Project[] = localStr ? JSON.parse(localStr) : [];

      if (cloudProjects.length === 0 && localData.length > 0) {
        // Tenta sincronizar em lote silenciosamente apenas se houver conexão ativa sem bloquear
        try {
          supabase.auth.getSession().then(({ data: sessionData }) => {
            if (sessionData?.session) {
              Promise.allSettled(
                localData.map(proj => supabase.from('projects').upsert({ id: proj.id, data: proj, updated_at: new Date() }))
              ).catch(() => {});
            }
          }).catch(() => {});
        } catch (_) {}
        return localData;
      }

      if (cloudProjects.length > 0) {
        safeLocalStorage.setItem('quark_projects', JSON.stringify(cloudProjects));
        return cloudProjects;
      }

      return localData.length > 0 ? localData : [];
    } catch (err) {
      console.warn("⚠️ Fallback para cache local (Projetos):", err);
      const local = safeLocalStorage.getItem('quark_projects');
      return local ? JSON.parse(local) : [];
    }
  },

  syncProject: async (project: Project) => {
    try {
      const current = safeLocalStorage.getItem('quark_projects');
      const list: Project[] = current ? JSON.parse(current) : [];
      const updated = list.some(p => p.id === project.id) ? list.map(p => p.id === project.id ? project : p) : [...list, project];
      safeLocalStorage.setItem('quark_projects', JSON.stringify(updated));
      await supabase.from('projects').upsert({ id: project.id, data: project, updated_at: new Date() });
    } catch (err) { console.error(err); }
  },

  deleteProject: async (id: string) => {
    try {
      const current = safeLocalStorage.getItem('quark_projects');
      if (current) {
        const list = JSON.parse(current) as Project[];
        safeLocalStorage.setItem('quark_projects', JSON.stringify(list.filter(p => p.id !== id)));
      }
      await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } catch (err) { console.error(err); }
  },

  // --- PIPELINES (CRM v2) ---
  getPipelines: async () => {
    const defaultStages = [
      { id: 'Lead', name: 'Novos Leads', color: 'border-blue-500', order: 0 },
      { id: 'Qualificacao', name: 'Em Qualificação', color: 'border-yellow-500', order: 1 },
      { id: 'Proposta', name: 'Proposta Enviada', color: 'border-purple-500', order: 2 },
      { id: 'Fechado', name: 'Fechado / Ganho', color: 'border-lime-500', order: 3 }
    ];
    const FALLBACK_PIPELINES = [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Geral', type: 'Geral', color: '#a3e635', stages: defaultStages },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Evento — Tênis', type: 'Evento', color: '#38bdf8', stages: defaultStages },
      { id: '00000000-0000-0000-0000-000000000003', name: 'Evento — Poker', type: 'Evento', color: '#f472b6', stages: defaultStages },
      { id: '00000000-0000-0000-0000-000000000004', name: 'Evento — Ritmo', type: 'Evento', color: '#fb923c', stages: defaultStages },
    ];
    try {
      const { data, error } = await supabase.from('pipelines').select('*').order('created_at');
      if (error) throw error;
      if (data && data.length > 0) {
        safeLocalStorage.setItem('quark_pipelines', JSON.stringify(data));
        return data;
      }
      const cached = safeLocalStorage.getItem('quark_pipelines');
      return cached ? JSON.parse(cached) : FALLBACK_PIPELINES;
    } catch {
      const cached = safeLocalStorage.getItem('quark_pipelines');
      return cached ? JSON.parse(cached) : FALLBACK_PIPELINES;
    }
  },

  // --- TAGS (CRM v2) ---
  getTags: async () => {
    const FALLBACK_TAGS = [
      { id: 'fd757218-8f7d-48e8-bb1d-a9a4f138a0ac', name: 'Anúncios', color: '#f59e0b' },
      { id: '124c1b1c-9b45-4821-9001-0246330a6ab7', name: 'Indicação', color: '#10b981' },
      { id: 'd2ff45bc-7eb9-4b99-a2c7-b564cb290118', name: 'Instagram orgânico', color: '#8b5cf6' },
      { id: '4b2a163e-51c9-4e7d-a53c-4384cdd4b494', name: 'Google Ads', color: '#3b82f6' },
      { id: '396ffc01-bab6-4a44-899c-ad23927b0d56', name: 'Indicação interna', color: '#ec4899' },
      { id: '0abf98b7-b3e3-4595-becd-da982de420b1', name: 'WhatsApp Bot', color: '#06b6d4' },
      { id: '9fa1385e-3963-4e63-b149-cfde700ea0e3', name: 'Fechado Solar', color: '#10b981' },
    ];
    try {
      const { data, error } = await supabase.from('tags').select('*').order('name');
      if (error) throw error;
      if (data && data.length > 0) {
        safeLocalStorage.setItem('quark_tags', JSON.stringify(data));
        return data;
      }
      const cached = safeLocalStorage.getItem('quark_tags');
      return cached ? JSON.parse(cached) : FALLBACK_TAGS;
    } catch {
      const cached = safeLocalStorage.getItem('quark_tags');
      return cached ? JSON.parse(cached) : FALLBACK_TAGS;
    }
  },

  // --- STORAGE (Arquivos) ---
  uploadFile: async (bucket: string, path: string, fileBlob: Blob): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(path, fileBlob, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrl;
    } catch (err) {
      console.error('⚠️ Erro ao fazer upload do arquivo:', err);
      return null;
    }
  },
};