import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Project } from '../types';
import { storageService } from '../services/storageService';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Partial<Project>) => Promise<void>;
  updateProjectStatus: (id: string, status: Project['status']) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  loadProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const cached = localStorage.getItem('quark_projects');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const { user } = useAuth();

  const loadProjects = async () => {
    try {
      const data = await storageService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Error loading projects', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadProjects();
    } else {
      setProjects([]);
    }
  }, [user]);

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
    await storageService.syncProject(newProject);
  };

  const updateProjectStatus = async (id: string, status: Project['status']) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const updatedProject = { ...project, status, updatedAt: new Date().toISOString() };
    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    await storageService.syncProject(updatedProject);
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    const updatedProject = { ...project, ...updates, updatedAt: new Date().toISOString() };
    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    await storageService.syncProject(updatedProject);
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await storageService.deleteProject(id);
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject, updateProjectStatus, updateProject, deleteProject, loadProjects }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};
