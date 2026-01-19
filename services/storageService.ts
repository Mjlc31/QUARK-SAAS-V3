import { Lead, Task, Product } from '../types';

// Initial Mock Data
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
  },
  { 
    id: '2', 
    name: 'Residência Dr. Roberto', 
    phone: '5511988888888', 
    value: 22000, 
    status: 'Qualificacao', 
    createdAt: new Date().toISOString(),
    city: 'Campinas',
    monthlyConsumption: 800,
    updatedAt: new Date().toISOString(),
    history: []
  },
  { 
    id: '3', 
    name: 'Fazenda Santa Rita', 
    phone: '5511977777777', 
    value: 120000, 
    status: 'Proposta', 
    createdAt: new Date().toISOString(),
    city: 'Ribeirão Preto',
    monthlyConsumption: 5000,
    updatedAt: new Date().toISOString(),
    history: []
  },
];

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Validar projeto elétrico - Silva', assignee: 'Arthur', deadline: '2023-11-20', completed: false, priority: 'High' },
  { id: '2', title: 'Comprar cabos solares', assignee: 'João', deadline: '2023-11-18', completed: true, priority: 'Medium' },
  { id: '3', title: 'Visita técnica Fazenda', assignee: 'Cleydson', deadline: '2023-11-25', completed: false, priority: 'High' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Painel Canadian 550W', type: 'Painel', price: 650, power: 550 },
  { id: '2', name: 'Inversor Growatt 5kW', type: 'Inversor', price: 4200 },
  { id: '3', name: 'Inversor Deye Híbrido 8kW', type: 'Inversor', price: 9500 },
];

export const storageService = {
  getLeads: (): Lead[] => {
    const data = localStorage.getItem('quark_leads');
    return data ? JSON.parse(data) : INITIAL_LEADS;
  },
  saveLeads: (leads: Lead[]) => {
    localStorage.setItem('quark_leads', JSON.stringify(leads));
  },
  getTasks: (): Task[] => {
    const data = localStorage.getItem('quark_tasks');
    return data ? JSON.parse(data) : INITIAL_TASKS;
  },
  saveTasks: (tasks: Task[]) => {
    localStorage.setItem('quark_tasks', JSON.stringify(tasks));
  },
  getProducts: (): Product[] => {
    const data = localStorage.getItem('quark_products');
    return data ? JSON.parse(data) : INITIAL_PRODUCTS;
  },
  saveProducts: (products: Product[]) => {
    localStorage.setItem('quark_products', JSON.stringify(products));
  }
};