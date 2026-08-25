import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Task, Product, User, Activity } from '../types';
import { storageService } from '../services/storageService';
import { AuthProvider, useAuth } from './AuthContext';
import { FinancialProvider } from './FinancialContext';
import { ProjectProvider, useProject } from './ProjectContext';
import { CrmProvider, useCrm } from './CrmContext';

// We combine all contexts into one interface to avoid breaking existing code
interface AppContextType extends ReturnType<typeof useAuth>, ReturnType<typeof useProject>, ReturnType<typeof useCrm> {
  tasks: Task[];
  users: User[];
  products: Product[];
  activities: Activity[];
  addTask: (taskData: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addActivity: (action: string, target: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LegacyAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const project = useProject();
  const crm = useCrm();

  const [tasks, setTasks] = useState<Task[]>(() => {
    try { const cached = localStorage.getItem('quark_tasks'); return cached ? JSON.parse(cached) : []; } catch { return []; }
  });
  const [products, setProducts] = useState<Product[]>(() => {
    try { const cached = localStorage.getItem('quark_products'); return cached ? JSON.parse(cached) : []; } catch { return []; }
  });
  const [directoryUsers, setDirectoryUsers] = useState<User[]>(() => {
    try { const cached = localStorage.getItem('quark_users'); return cached ? JSON.parse(cached) : []; } catch { return []; }
  });
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (auth.user) {
      storageService.getTasks().then(setTasks);
      storageService.getProducts().then(setProducts);
      storageService.getUsers().then(setDirectoryUsers);
    } else {
      setTasks([]);
    }
  }, [auth.user]);

  const addActivity = (action: string, target: string) => {
    if (!auth.user) return;
    const newActivity: Activity = {
      id: Date.now().toString(),
      user: auth.user.name.split(' ')[0],
      action,
      target,
      time: 'Agora'
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 10));
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

  const combinedValue: AppContextType = {
    ...auth,
    ...project,
    ...crm,
    tasks,
    users: directoryUsers,
    products,
    activities,
    addTask,
    toggleTask,
    deleteTask,
    addActivity
  };

  return (
    <AppContext.Provider value={combinedValue}>
      {children}
    </AppContext.Provider>
  );
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <FinancialProvider>
        <ProjectProvider>
          <CrmProvider>
            <LegacyAppProvider>
              {children}
            </LegacyAppProvider>
          </CrmProvider>
        </ProjectProvider>
      </FinancialProvider>
    </AuthProvider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};