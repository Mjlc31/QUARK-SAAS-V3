import React from 'react';
import { LayoutDashboard, Users, Calculator, CheckSquare, Package, Zap, LogOut, PieChart, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean; // Mobile toggle state
  onClose: () => void; // Mobile close handler
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user, logout } = useApp();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard },
    { id: 'crm', label: 'Gestão de Leads', icon: Users },
    { id: 'calculator', label: 'Engenharia Solar', icon: Calculator },
    { id: 'tasks', label: 'Centro de Tarefas', icon: CheckSquare },
  ];

  const commercialItems = [
    { id: 'products', label: 'Catálogo de Kits', icon: Package },
    { id: 'reports', label: 'Relatórios BI', icon: PieChart },
  ];

  const handleNavigation = (id: string) => {
    onNavigate(id);
    onClose(); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside className={`fixed left-0 top-0 h-full w-72 glass-panel border-r border-white/5 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-6 flex justify-between items-start">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-black shadow-lg shadow-lime-500/20">
              <Zap size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-white leading-none">Quark<span className="text-lime-400">.</span></h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">Enterprise System</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Principal</p>
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-white/5 text-white shadow-inner border border-white/5' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 h-full w-1 bg-lime-500 rounded-r-full"></div>}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-lime-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
              </button>
            );
          })}

          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-8 mb-2">Comercial</p>
          {commercialItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-white/5 text-white shadow-inner border border-white/5' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 h-full w-1 bg-lime-500 rounded-r-full"></div>}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-lime-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="glass-panel rounded-2xl p-4 border border-white/5 flex items-center gap-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 text-sm font-bold text-white relative z-10">
              {user?.avatarInitials}
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-lime-400 truncate">{user?.role}</p>
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-white transition-colors relative z-10">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;