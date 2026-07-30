import React from 'react';
import { LayoutDashboard, Users, Calculator, CheckSquare, Package, Zap, LogOut, PieChart, X, HardHat, MessageSquare, DollarSign, FileText, Kanban } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, isSupabaseConnected } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, path: '/' },
    { id: 'crm', label: 'Leads & CRM', icon: Users, path: '/crm' },
    { id: 'proposals', label: 'Propostas', icon: FileText, path: '/proposals' },
    { id: 'conversations', label: 'Conversas', icon: MessageSquare, path: '/conversations' },
    { id: 'calculator', label: 'Calculadora', icon: Calculator, path: '/calculator' },
    { id: 'engineering', label: 'Engenharia', icon: Kanban, path: '/engineering' },
    { id: 'follow-up', label: 'Acompanhamento', icon: HardHat, path: '/follow-up' },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare, path: '/tasks' },
  ];

  const commercialItems = [
    { id: 'products', label: 'Catálogo', icon: Package, path: '/products' },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
    { id: 'reports', label: 'Intelligence', icon: PieChart, path: '/reports' },
  ];

  const NavItem = ({ item }: { item: MenuItem }) => (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
        ? 'bg-lime-500/5 text-white border border-lime-500/10'
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
        }`}
    >
      {({ isActive }) => (
        <>
          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-lime-500 rounded-r-full shadow-[0_0_8px_rgba(163,230,53,0.4)] transition-all duration-300"></div>}
          <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className={`transition-colors duration-200 ${isActive ? 'text-lime-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
          <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
          {isActive && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse-glow"></div>}
        </>
      )}
    </NavLink>
  );

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
          <div className="flex flex-col gap-2">
            <img src="/logo.png" alt="Quark Energia" className="h-14 w-auto object-contain object-left" />
            <div className="flex items-center gap-1.5 ml-1">
              <div className={`w-2 h-2 rounded-full transition-all ${isSupabaseConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse-glow' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                {isSupabaseConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-zinc-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-2">Plataforma</p>
          {menuItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}

          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-8">Dados</p>
          {commercialItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <div className="rounded-xl p-3 flex items-center gap-3 hover:bg-zinc-900/50 transition-colors cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 text-xs font-bold text-white relative">
              {user?.avatarInitials}
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#18181b] ${isSupabaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
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