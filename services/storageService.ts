import { Lead, Task, Product, User } from '../types';
import { supabase } from '../lib/supabaseClient';

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
      // 1. Fetch from Supabase
      const { data, error } = await supabase.from('leads').select('*');
      if (error) throw error;
      
      const localStr = localStorage.getItem('quark_leads');
      const localData: Lead[] = localStr ? JSON.parse(localStr) : [];

      // 2. Initial Sync Logic: If Cloud is empty but Local has data, upload Local to Cloud
      if ((!data || data.length === 0) && localData.length > 0) {
        console.log("☁️ Cloud empty, syncing local leads to cloud...");
        for (const lead of localData) {
            await supabase.from('leads').upsert({ id: lead.id, data: lead, updated_at: lead.updatedAt });
        }
        return localData;
      }

      // 3. Normal Flow: Cloud has data
      if (data && data.length > 0) {
        const parsedData = data.map(row => row.data ? { ...row.data, id: row.id } : row);
        localStorage.setItem('quark_leads', JSON.stringify(parsedData));
        return parsedData as Lead[];
      }
      
      return [];
    } catch (err) {
      console.warn("⚠️ Offline Mode (Leads):", err);
      const local = localStorage.getItem('quark_leads');
      return local ? JSON.parse(local) : INITIAL_LEADS;
    }
  },

  syncLead: async (lead: Lead) => {
    try {
      // Optimistic Local Save
      const currentLeadsStr = localStorage.getItem('quark_leads');
      const currentLeads: Lead[] = currentLeadsStr ? JSON.parse(currentLeadsStr) : [];
      const updatedLocalLeads = currentLeads.some(l => l.id === lead.id) 
        ? currentLeads.map(l => l.id === lead.id ? lead : l)
        : [lead, ...currentLeads];
      localStorage.setItem('quark_leads', JSON.stringify(updatedLocalLeads));

      // Cloud Save
      const { error } = await supabase.from('leads').upsert({ 
        id: lead.id,
        data: lead,
        updated_at: new Date()
      });
      
      if (error) throw error;
    } catch (err) {
      console.error("Sync Error:", err);
    }
  },

  deleteLead: async (id: string) => {
     try {
       const currentLeadsStr = localStorage.getItem('quark_leads');
       if (currentLeadsStr) {
         const list = JSON.parse(currentLeadsStr) as Lead[];
         localStorage.setItem('quark_leads', JSON.stringify(list.filter(l => l.id !== id)));
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
      if (error) throw error;

      const localStr = localStorage.getItem('quark_tasks');
      const localData: Task[] = localStr ? JSON.parse(localStr) : [];

      if ((!data || data.length === 0) && localData.length > 0) {
        console.log("☁️ Cloud empty, syncing local tasks to cloud...");
        for (const task of localData) {
            await supabase.from('tasks').upsert({ id: task.id, data: task, updated_at: new Date() });
        }
        return localData;
      }

      if (data && data.length > 0) {
        const parsed = data.map(row => row.data ? { ...row.data, id: row.id } : row);
        localStorage.setItem('quark_tasks', JSON.stringify(parsed));
        return parsed as Task[];
      }
      return [];
    } catch {
      const local = localStorage.getItem('quark_tasks');
      return local ? JSON.parse(local) : INITIAL_TASKS;
    }
  },

  syncTask: async (task: Task) => {
    try {
      const current = localStorage.getItem('quark_tasks');
      const list: Task[] = current ? JSON.parse(current) : [];
      const updated = list.some(t => t.id === task.id) ? list.map(t => t.id === task.id ? task : t) : [...list, task];
      localStorage.setItem('quark_tasks', JSON.stringify(updated));

      await supabase.from('tasks').upsert({ id: task.id, data: task, updated_at: new Date() });
    } catch (err) { console.error(err); }
  },

  deleteTask: async (id: string) => {
    try {
      const current = localStorage.getItem('quark_tasks');
      if (current) {
        const list = JSON.parse(current) as Task[];
        localStorage.setItem('quark_tasks', JSON.stringify(list.filter(t => t.id !== id)));
      }
      await supabase.from('tasks').delete().eq('id', id);
    } catch (err) { console.error(err); }
  },
  
  // --- PRODUCTS ---
  getProducts: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      
      const localStr = localStorage.getItem('quark_products');
      const localData: Product[] = localStr ? JSON.parse(localStr) : [];

      if ((!data || data.length === 0) && localData.length > 0) {
         console.log("☁️ Cloud empty, syncing local products to cloud...");
         for (const prod of localData) {
             await supabase.from('products').upsert({ id: prod.id, data: prod, updated_at: new Date() });
         }
         return localData;
      }

      if (data && data.length > 0) {
        const parsed = data.map(row => row.data ? { ...row.data, id: row.id } : row);
        localStorage.setItem('quark_products', JSON.stringify(parsed));
        return parsed as Product[];
      }
      return [];
    } catch {
      const local = localStorage.getItem('quark_products');
      return local ? JSON.parse(local) : INITIAL_PRODUCTS;
    }
  },

  syncProduct: async (product: Product) => {
     try {
       const current = localStorage.getItem('quark_products');
       const list: Product[] = current ? JSON.parse(current) : [];
       const updated = list.some(p => p.id === product.id) ? list.map(p => p.id === product.id ? product : p) : [...list, product];
       localStorage.setItem('quark_products', JSON.stringify(updated));
       await supabase.from('products').upsert({ id: product.id, data: product, updated_at: new Date() });
     } catch(err) { console.error(err); }
  },

  deleteProduct: async (id: string) => {
    try {
      const current = localStorage.getItem('quark_products');
      if (current) {
         const list = JSON.parse(current) as Product[];
         localStorage.setItem('quark_products', JSON.stringify(list.filter(p => p.id !== id)));
      }
      await supabase.from('products').delete().eq('id', id);
    } catch(err) { console.error(err); }
  },

  // --- AUTH (Users Directory) ---
  // Now fetches from real Supabase 'profiles' table
  getUsers: async (): Promise<User[]> => {
     try {
       const { data, error } = await supabase.from('profiles').select('*');
       if (error) throw error;
       
       if (data && data.length > 0) {
         // Map database columns to User interface
         const users: User[] = data.map(p => ({
            id: p.id,
            name: p.name || 'Usuário',
            email: p.email || '',
            role: (p.role as any) || 'Sales',
            avatarInitials: p.avatar_initials || 'U'
         }));
         
         localStorage.setItem('quark_users', JSON.stringify(users));
         return users;
       }
       return INITIAL_USERS;
     } catch (err) {
       console.warn("⚠️ Error fetching users:", err);
       const local = localStorage.getItem('quark_users');
       return local ? JSON.parse(local) : INITIAL_USERS;
     }
  }
};