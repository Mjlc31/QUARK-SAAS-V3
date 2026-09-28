import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Route as RouteIcon, Ticket, CreditCard, ShoppingBag, LogOut, Zap } from 'lucide-react';
import { usePortal } from '../contexts/PortalContext';

const PortalNavigation: React.FC = () => {
  const { logout } = usePortal();
  const navigate = useNavigate();

  const navItems = [
    { to: '/portal', icon: Home, label: 'Início', end: true },
    { to: '/portal/tracking', icon: RouteIcon, label: 'Tracking' },
    { to: '/portal/tickets', icon: Ticket, label: 'Chamados' },
    { to: '/portal/payments', icon: CreditCard, label: 'Serviços' },
    { to: '/portal/shop', icon: ShoppingBag, label: 'Loja' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 glass-panel border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Zap size={24} className="text-lime-500" />
          <span className="font-display font-bold text-white text-xl">Quark<span className="text-lime-400">.</span></span>
        </div>
        
        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-lime-500/10 text-lime-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={18} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/5 z-50 pb-safe">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
                  isActive
                    ? 'text-lime-400 bg-lime-500/10'
                    : 'text-slate-400 hover:text-white'
                }`
              }
            >
              <item.icon size={20} className="mb-1" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-16 h-14 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} className="mb-1" />
            <span className="text-[10px] font-medium">Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default PortalNavigation;
