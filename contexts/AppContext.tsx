import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lead, Task, User, LeadHistoryLog } from '../types';
import { supabase } from '../lib/supabaseClient';

// Usuários atualizados
const USERS: User[] = [
  { id: '1', name: 'Arthur Duda', email: 'arthur@quark.com', role: 'Admin', avatarInitials: 'AD' },
  { id: '2', name: 'Anderson Alves', email: 'anderson@quark.com', role: 'Sales', avatarInitials: 'AA' },
];

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
  activities: Activity[]; // New global activity feed
  isLoading: boolean;
  login: (email: string) => boolean;
  logout: () => void;
  addLead: (lead: Partial<Lead>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  updateLeadStatus: (id: string, newStatus: Lead['status']) => Promise<void>;
  addLeadLog: (leadId: string, action: string, details: string) => Promise<void>;
  addTask: (taskData: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initial Fetch from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsData) {
        const mappedLeads: Lead[] = leadsData.map((l: any) => ({
          id: l.id,
          name: l.name,
          phone: l.phone || '',
          city: l.city || '',
          value: Number(l.value),
          monthlyConsumption: Number(l.monthly_consumption),
          status: l.status,
          createdAt: l.created_at,
          updatedAt: l.updated_at,
          assignee: l.assignee,
          history: l.history || []
        }));
        setLeads(mappedLeads);
      }

      // Fetch Tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('deadline', { ascending: true });

      if (tasksData) {
        setTasks(tasksData as Task[]);
      }

      // Mock Initial Activities (In a real app, this would be a table)
      setActivities([
        { id: '1', user: 'Arthur', action: 'criou o lead', target: 'Supermercado Silva', time: '10 min' },
        { id: '2', user: 'Anderson', action: 'concluiu', target: 'Validar Projeto', time: '1h' },
        { id: '3', user: 'Arthur', action: 'moveu para Proposta', target: 'Fazenda Sta. Rita', time: '3h' },
      ]);

    } catch (error) {
      console.error('Erro geral na conexão:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (email: string) => {
    const found = USERS.find(u => u.email === email);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

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
      details: 'Lead cadastrado manualmente',
      timestamp: new Date().toISOString(),
      author: user?.name || 'Sistema'
    }];

    const dbLead = {
      name: leadData.name || 'Novo Lead',
      phone: leadData.phone,
      city: leadData.city,
      value: leadData.value,
      monthly_consumption: leadData.monthlyConsumption,
      status: 'Lead',
      assignee: user?.name.split(' ')[0] || 'Unassigned',
      history: defaultHistory,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('leads').insert([dbLead]).select().single();

    if (data) {
      const newLead: Lead = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        city: data.city,
        value: Number(data.value),
        monthlyConsumption: Number(data.monthly_consumption),
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.created_at || new Date().toISOString(),
        assignee: data.assignee,
        history: data.history
      };
      setLeads(prev => [newLead, ...prev]);
      addActivity('cadastrou lead', data.name);
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
     setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, ...updates } : lead));

     const dbUpdates: any = {};
     if (updates.name) dbUpdates.name = updates.name;
     if (updates.phone) dbUpdates.phone = updates.phone;
     if (updates.city) dbUpdates.city = updates.city;
     if (updates.value) dbUpdates.value = updates.value;
     if (updates.monthlyConsumption) dbUpdates.monthly_consumption = updates.monthlyConsumption;
     dbUpdates.updated_at = new Date().toISOString();

     await supabase.from('leads').update(dbUpdates).eq('id', id);
  };

  const deleteLead = async (id: string) => {
    // Removed the 'confirm' from here to let the UI handle UX
    const leadToDelete = leads.find(l => l.id === id);
    setLeads(prev => prev.filter(l => l.id !== id));
    
    if (leadToDelete) addActivity('excluiu lead', leadToDelete.name);

    await supabase.from('leads').delete().eq('id', id);
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

    const updatedHistory = [newLog, ...currentLead.history];
    const updatedAt = new Date().toISOString();

    setLeads(prev => prev.map(lead => {
      if (lead.id === id) {
        return { ...lead, status: newStatus, updatedAt, history: updatedHistory };
      }
      return lead;
    }));

    addActivity(`moveu para ${newStatus}`, currentLead.name);

    await supabase.from('leads').update({ status: newStatus, history: updatedHistory, updated_at: updatedAt }).eq('id', id);
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
    const updatedHistory = [newLog, ...currentLead.history];
    setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, history: updatedHistory } : lead));
    await supabase.from('leads').update({ history: updatedHistory }).eq('id', leadId);
  };

  const addTask = async (taskData: Partial<Task>) => {
    const dbTask = {
      title: taskData.title,
      assignee: taskData.assignee,
      deadline: taskData.deadline,
      priority: taskData.priority,
      completed: false
    };

    const { data } = await supabase.from('tasks').insert([dbTask]).select().single();
    if (data) {
      setTasks(prev => [...prev, data as Task]);
      addActivity('criou tarefa', taskData.title || '');
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    if (newCompleted) addActivity('concluiu tarefa', task.title);
    await supabase.from('tasks').update({ completed: newCompleted }).eq('id', id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  return (
    <AppContext.Provider value={{ 
      user, leads, tasks, users: USERS, activities, isLoading,
      login, logout, addLead, updateLead, deleteLead, updateLeadStatus, addLeadLog, addTask, toggleTask, deleteTask
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