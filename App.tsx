import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Calculator from './pages/Calculator';
import Tasks from './pages/Tasks';
import Products from './pages/Products';
import Reports from './pages/Reports';
import { AppProvider, useApp } from './contexts/AppContext';
import { Package, Lock, User, ArrowRight, Menu, Zap } from 'lucide-react';

const LoginScreen = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email);
    if (!success) setError(true);
  };

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-lime-500/10 rounded-full blur-[150px]"></div>
      
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mb-2">Quark<span className="text-lime-500">.</span></h1>
          <p className="text-slate-400">Enterprise Access</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Corporativo</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(false); }}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:border-lime-500 outline-none transition-all"
                placeholder="arthur@quark.com"
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            </div>
            {error && <p className="text-red-400 text-xs mt-2 pl-1">Usuário não encontrado. Tente 'arthur@quark.com'</p>}
          </div>

          <button 
            type="submit"
            className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-lg transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2 group"
          >
            Entrar no Sistema
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-8 flex items-center justify-center gap-2">
          <Lock size={12} /> Conexão Segura SSL/TLS
        </p>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { user } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return <LoginScreen />;

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'crm': return <CRM />;
      case 'calculator': return <Calculator />;
      case 'tasks': return <Tasks />;
      case 'products': return <Products />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-slate-200 font-sans selection:bg-lime-500/30 overflow-hidden">
      {/* Cinematic Background */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-lime-500/5 rounded-full blur-[100px]"></div>
      </div>

      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-panel border-b border-white/10 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
           <Zap size={20} className="text-lime-500" />
           <span className="font-display font-bold text-white text-lg">Quark.</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white bg-white/5 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      <main className="lg:ml-72 p-4 pt-20 lg:p-10 relative z-10 h-screen overflow-y-auto custom-scrollbar">
        {renderPage()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;