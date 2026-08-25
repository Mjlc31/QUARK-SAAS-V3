import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { Suspense } from 'react';
import SkeletonLoader from './components/SkeletonLoader';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CRM = React.lazy(() => import('./pages/CRM'));
const Calculator = React.lazy(() => import('./pages/Calculator'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Conversations = React.lazy(() => import('./pages/Conversations'));
const Products = React.lazy(() => import('./pages/Products'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Proposals = React.lazy(() => import('./pages/Proposals'));
const Engineering = React.lazy(() => import('./pages/Engineering'));
const FollowUp = React.lazy(() => import('./pages/FollowUp'));
const Financial = React.lazy(() => import('./pages/Financial'));
const InvoiceAudit = React.lazy(() => import('./pages/InvoiceAudit'));
import { AppProvider, useApp } from './contexts/AppContext';
import { LayoutDashboard, Menu, Zap, Users, CheckSquare, HardHat, DollarSign } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './pages/auth/LoginScreen';
import { NewPasswordScreen } from './pages/auth/NewPasswordScreen';
import { motion, AnimatePresence } from 'framer-motion';

const pageTransition = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.2 } };

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div {...pageTransition} className="h-full">
    {children}
  </motion.div>
);


const MainLayout: React.FC = () => {
  const { user, isRecoveryMode } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  if (isRecoveryMode) return <NewPasswordScreen />;
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-[100dvh] bg-quark-bg text-slate-200 font-sans selection:bg-lime-500/30 overflow-hidden">
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

      <main className="lg:ml-72 p-4 pt-[72px] pb-24 lg:pb-10 lg:pt-10 lg:p-10 relative z-10 h-[100dvh] overflow-y-auto custom-scrollbar">
        <Suspense fallback={<SkeletonLoader />}>
          <AnimatePresence mode="wait"><Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="/crm" element={<PageWrapper><CRM /></PageWrapper>} />
            <Route path="/conversations" element={<PageWrapper><Conversations /></PageWrapper>} />
            <Route path="/calculator" element={<PageWrapper><Calculator /></PageWrapper>} />
            <Route path="/proposals" element={<PageWrapper><Proposals /></PageWrapper>} />
            <Route path="/engineering" element={<PageWrapper><Engineering /></PageWrapper>} />
            <Route path="/tasks" element={<PageWrapper><Tasks /></PageWrapper>} />
            <Route path="/products" element={<PageWrapper><Products /></PageWrapper>} />
            <Route path="/follow-up" element={<PageWrapper><FollowUp /></PageWrapper>} />
            <Route path="/reports" element={<PageWrapper><Reports /></PageWrapper>} />
            <Route path="/financeiro" element={<PageWrapper><Financial /></PageWrapper>} />
            <Route path="/audit" element={<PageWrapper><InvoiceAudit /></PageWrapper>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></AnimatePresence>
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation */}
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