import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lead, Task, User, LeadHistoryLog, Product } from '../types';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Initialize Auth Listener & Check for Offline Session
  useEffect(() => {
    // 0. Immediate URL Check for Recovery (Prevents Flash)
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }

    // 1. Connection Health Check
    checkSupabaseConnection();

    // 2. Check Supabase Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const currentUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name || 'Usuário',
          role: 'Sales',
          avatarInitials: (session.user.user_metadata.name || 'U').substring(0, 2).toUpperCase()
        };
        setUser(currentUser);
        fetchData();
      } else {
        // 3. Check Local Fallback Session (if Supabase failed previously)
        const offlineUserStr = localStorage.getItem('quark_offline_user');
        if (offlineUserStr) {
          const offlineUser: User = JSON.parse(offlineUserStr);
          setUser(offlineUser);
          fetchData();
        }
      }
    });

    // Listen for Supabase changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }

      if (session?.user) {
        // Real session detected
        const newUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name || 'Usuário',
          role: 'Sales',
          avatarInitials: (session.user.user_metadata.name || 'U').substring(0, 2).toUpperCase()
        };
        setUser(newUser);
        localStorage.removeItem('quark_offline_user'); // Clear offline if real exists
        fetchData();
        checkSupabaseConnection(); // Re-check connection on auth change
      } else if (!localStorage.getItem('quark_offline_user')) {
        // Only clear user if no offline fallback exists
        setUser(null);
        setLeads([]);
        setTasks([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      // Simple lightweight query to check connectivity
      const { error } = await supabase.from('leads').select('id').limit(1);
      // It's connected if there's no network error (even if table is empty or permission denied, the connection itself worked)
      if (!error || (error.code !== 'PGRST301' && !error.message.includes('fetch'))) {
        setIsSupabaseConnected(true);
      } else {
        setIsSupabaseConnected(false);
      }
    } catch (err) {
      console.warn("Supabase Connectivity Check Failed");
      setIsSupabaseConnected(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [loadedLeads, loadedTasks, loadedUsers, loadedProducts] = await Promise.all([
        storageService.getLeads(),
        storageService.getTasks(),
        storageService.getUsers(),
        storageService.getProducts()
      ]);

      setLeads(loadedLeads);
      setTasks(loadedTasks);
      setDirectoryUsers(loadedUsers);
      setProducts(loadedProducts);
      
      setActivities([
        { id: '1', user: 'Sistema', action: 'sincronizou', target: 'Dados Cloud', time: 'Agora' },
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
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
          avatarInitials: email.substring(0,2).toUpperCase()
        };
        
        setUser(fallbackUser);
        localStorage.setItem('quark_offline_user', JSON.stringify(fallbackUser));
        fetchData();
        
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
          avatarInitials: name.substring(0,2).toUpperCase()
        };
        setUser(fallbackUser);
        localStorage.setItem('quark_offline_user', JSON.stringify(fallbackUser));
        fetchData();
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

  return (
    <AppContext.Provider value={{ 
      user, leads, tasks, users: directoryUsers, products, activities, isLoading, isRecoveryMode, isSupabaseConnected,
      login, signUp, resetPassword, updatePassword, logout, addLead, updateLead, deleteLead, updateLeadStatus, addLeadLog, addTask, toggleTask, deleteTask
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