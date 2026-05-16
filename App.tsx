import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Calculator from './pages/Calculator';
import Tasks from './pages/Tasks';
import Conversations from './pages/Conversations';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Proposals from './pages/Proposals';
import Engineering from './pages/Engineering';
import FollowUp from './pages/FollowUp';
import Financial from './pages/Financial';
import { AppProvider, useApp } from './contexts/AppContext';
import { LayoutDashboard, Menu, Zap, Users, CheckSquare, HardHat, DollarSign } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './pages/auth/LoginScreen';
import { NewPasswordScreen } from './pages/auth/NewPasswordScreen';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const items = [
    { id: '/', icon: LayoutDashboard, label: 'Home' },
    { id: '/crm', icon: Users, label: 'CRM' },
    { id: '/tasks', icon: CheckSquare, label: 'Tarefas' },
    { id: '/engineering', icon: HardHat, label: 'Obras' },
    { id: '/financeiro', icon: DollarSign, label: 'Finanças' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16">
        {items.map(item => {
          const isActive = path === item.id || (item.id !== '/' && path.startsWith(item.id));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px] active:scale-90 ${
                isActive
                  ? 'text-lime-400'
                  : 'text-zinc-500'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-lime-400' : 'text-zinc-600'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const MainLayout: React.FC = () => {
  const { user, isRecoveryMode } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isRecoveryMode) return <NewPasswordScreen />;
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-quark-bg text-slate-200 font-sans selection:bg-lime-500/30 overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 glass-panel border-b border-white/10 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-lime-500" />
          <span className="font-display font-bold text-white text-lg">Quark<span className="text-lime-400">.</span></span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white bg-white/5 rounded-lg active:scale-90 transition-transform">
          <Menu size={22} />
        </button>
      </div>

      <main className="lg:ml-72 p-4 pt-[72px] pb-24 lg:pb-10 lg:pt-10 lg:p-10 relative z-10 h-screen overflow-y-auto custom-scrollbar">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/engineering" element={<Engineering />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/products" element={<Products />} />
          <Route path="/follow-up" element={<FollowUp />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/financeiro" element={<Financial />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;