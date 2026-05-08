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

export const storageService = {
  // --- LEADS ---
  getLeads: async (): Promise<Lead[]> => {
    try {
      const { data, error } = await supabase.from('leads').select('*');

      if (error) {
        console.error('🔴 SUPABASE ERRO [getLeads]:', {
          message: error.message,
          code: error.code,
          details: (error as any).details,
          hint: (error as any).hint,
        });
        throw error;
      }

      // Robust mapping: handles both {id, data: Lead} and direct {id, name...}
      const cloudLeads = (data || []).map(row => {
        if (row.data && typeof row.data === 'object') {
          return { ...row.data, id: row.id };
        }
        return row;
      }) as Lead[];

      console.log(`✅ Leads sincronizados da nuvem: ${cloudLeads.length}`);

      const localStr = safeLocalStorage.getItem('quark_leads');
      const localData: Lead[] = localStr ? JSON.parse(localStr) : [];

      // Cloud empty but local has data → sync local to cloud
      if (cloudLeads.length === 0 && localData.length > 0) {
        console.log("☁️ Nuvem vazia, tentando restaurar dados locais...");
        for (const lead of localData) {
          await supabase.from('leads').upsert({ id: lead.id, data: lead, updated_at: lead.updatedAt });
        }
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
    // Agora o banco será limpo e otimizado, usando apenas JSONB
    try {
      const { error } = await supabase.from('leads').upsert({
        id: lead.id,
        data: lead,
        updated_at: new Date()
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
      await supabase.from('leads').delete().eq('id', id);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  },

  // --- TASKS ---
  getTasks: async (): Promise<Task[]> => {
    try {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) { console.warn('⚠️ Tasks fetch error:', error.message); throw error; }

      const localStr = safeLocalStorage.getItem('quark_tasks');
      const localData: Task[] = localStr ? JSON.parse(localStr) : [];

      if ((!data || data.length === 0) && localData.length > 0) {
        for (const task of localData) {
          await supabase.from('tasks').upsert({ id: task.id, data: task, updated_at: new Date() });
        }
        return localData;
      }

      if (data && data.length > 0) {
        const parsed = data.map(row => row.data ? { ...row.data, id: row.id } : row);
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
      await supabase.from('tasks').delete().eq('id', id);
    } catch (err) { console.error(err); }
  },

  // --- PRODUCTS ---
  getProducts: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) { console.warn('⚠️ Products fetch error:', error.message); throw error; }

      const localStr = safeLocalStorage.getItem('quark_products');
      const localData: Product[] = localStr ? JSON.parse(localStr) : [];

      if ((!data || data.length === 0) && localData.length > 0) {
        for (const prod of localData) {
          await supabase.from('products').upsert({ id: prod.id, data: prod, updated_at: new Date() });
        }
        return localData;
      }

      if (data && data.length > 0) {
        const parsed = data.map(row => row.data ? { ...row.data, id: row.id } : row);
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
      await supabase.from('products').upsert({ id: product.id, data: product, updated_at: new Date() });
    } catch (err) { console.error(err); }
  },

  deleteProduct: async (id: string) => {
    try {
      const current = safeLocalStorage.getItem('quark_products');
      if (current) {
        const list = JSON.parse(current) as Product[];
        safeLocalStorage.setItem('quark_products', JSON.stringify(list.filter(p => p.id !== id)));
      }
      await supabase.from('products').delete().eq('id', id);
    } catch (err) { console.error(err); }
  },

  // --- AUTH (Users Directory) ---
  // Now fetches from real Supabase 'profiles' table
  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) { console.warn('⚠️ Profiles fetch error:', error.message); throw error; }

      if (data && data.length > 0) {
        const users: User[] = data.map(p => ({
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
    } catch (err) {
      console.warn("⚠️ Error fetching users:", err);
      const local = safeLocalStorage.getItem('quark_users');
      return local ? JSON.parse(local) : INITIAL_USERS;
    }
  },

  // --- PROJECTS ---
  getProjects: async (): Promise<Project[]> => {
    try {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) {
        console.warn('⚠️ Erro ao buscar projetos no Supabase:', error.message);
        throw error;
      }

      const cloudProjects = (data || []).map(row => {
        if (row.data && typeof row.data === 'object') {
          return { ...row.data, id: row.id };
        }
        return row;
      }) as Project[];

      const localStr = safeLocalStorage.getItem('quark_projects');
      const localData: Project[] = localStr ? JSON.parse(localStr) : [];

      if (cloudProjects.length === 0 && localData.length > 0) {
        for (const proj of localData) {
          await supabase.from('projects').upsert({ id: proj.id, data: proj, updated_at: new Date() });
        }
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
      await supabase.from('projects').delete().eq('id', id);
    } catch (err) { console.error(err); }
  },

  // --- PIPELINES (CRM v2) ---
  getPipelines: async () => {
    const FALLBACK_PIPELINES = [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Geral', type: 'Geral', color: '#a3e635' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Evento — Tênis', type: 'Evento', color: '#38bdf8' },
      { id: '00000000-0000-0000-0000-000000000003', name: 'Evento — Poker', type: 'Evento', color: '#f472b6' },
      { id: '00000000-0000-0000-0000-000000000004', name: 'Evento — Ritmo', type: 'Evento', color: '#fb923c' },
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
      { id: 'tag-1', name: 'Anúncios', color: '#f59e0b' },
      { id: 'tag-2', name: 'Indicação', color: '#10b981' },
      { id: 'tag-3', name: 'Instagram orgânico', color: '#8b5cf6' },
      { id: 'tag-4', name: 'Google Ads', color: '#3b82f6' },
      { id: 'tag-5', name: 'Indicação interna', color: '#ec4899' },
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