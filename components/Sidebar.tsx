import React from 'react';
import { LayoutDashboard, Users, Calculator, CheckSquare, Package, Zap, LogOut, PieChart, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean; 
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user, logout } = useApp();
  
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'crm', label: 'Leads & CRM', icon: Users },
    { id: 'calculator', label: 'Engenharia', icon: Calculator },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
  ];

  const commercialItems = [
    { id: 'products', label: 'Catálogo', icon: Package },
    { id: 'reports', label: 'Intelligence', icon: PieChart },
  ];

  const handleNavigation = (id: string) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside className={`fixed left-0 top-0 h-full w-72 bg-[#09090b] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]">
              <Zap size={18} strokeWidth={3} fill="black" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight text-white">Quark<span className="text-lime-400">.</span></h1>
          </div>
          <button onClick={onClose} className="lg:hidden text-zinc-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-2">Plataforma</p>
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-zinc-900 text-white shadow-inner border border-white/5' 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-lime-500 rounded-r-full"></div>}
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-lime-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            );
          })}

          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-8">Dados</p>
          {commercialItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-zinc-900 text-white shadow-inner border border-white/5' 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-lime-500 rounded-r-full"></div>}
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-lime-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <div className="rounded-xl p-3 flex items-center gap-3 hover:bg-zinc-900/50 transition-colors cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 text-xs font-bold text-white">
              {user?.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="p-2 text-zinc-600 hover:text-white transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;