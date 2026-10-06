import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import { Suspense } from 'react';
import { SkeletonPage as SkeletonLoader } from './components/SkeletonLoader';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CRM = React.lazy(() => import('./pages/CRM'));
const Calculator = React.lazy(() => import('./pages/Calculator'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Conversations = React.lazy(() => import('./pages/Conversations'));
const Products = React.lazy(() => import('./pages/Products'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Proposals = React.lazy(() => import('./pages/Proposals'));
const ProposalEditorPage = React.lazy(() => import('./pages/ProposalEditorPage'));
const PublicProposal = React.lazy(() => import('./pages/PublicProposal'));
const PublicCapture = React.lazy(() => import('./pages/PublicCapture'));
const Engineering = React.lazy(() => import('./pages/Engineering'));
const FollowUp = React.lazy(() => import('./pages/FollowUp'));
const Financial = React.lazy(() => import('./pages/Financial'));
const Prospeccao = React.lazy(() => import('./pages/Prospeccao'));
const ClientCatalog = React.lazy(() => import('./pages/ClientCatalog'));
const TicketAdmin = React.lazy(() => import('./pages/TicketAdmin'));
const ClientIntelligence = React.lazy(() => import('./pages/ClientIntelligence'));
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const MaintenanceAlerts = React.lazy(() => import('./pages/MaintenanceAlerts'));
const UtilityRobot = React.lazy(() => import('./pages/UtilityRobot'));
const PriceList = React.lazy(() => import('./pages/PriceList'));
const PortalDashboard = React.lazy(() => import('./pages/portal/PortalDashboard'));
const PortalTickets = React.lazy(() => import('./pages/portal/PortalTickets'));
const PortalTracking = React.lazy(() => import('./pages/portal/PortalTracking'));
const PortalPayments = React.lazy(() => import('./pages/portal/PortalPayments'));
const PortalEcommerce = React.lazy(() => import('./pages/portal/PortalEcommerce'));
const ClientLoginScreen = React.lazy(() => import('./pages/auth/ClientLoginScreen'));
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
            <Route path="/price-list" element={<PageWrapper><PriceList /></PageWrapper>} />
            <Route path="/propostas" element={<PageWrapper><Proposals /></PageWrapper>} />
            <Route path="/propostas/nova" element={<PageWrapper><ProposalEditorPage /></PageWrapper>} />
            <Route path="/propostas/:id" element={<PageWrapper><ProposalEditorPage /></PageWrapper>} />
            <Route path="/proposals" element={<Navigate to="/propostas" replace />} />
            <Route path="/proposals/*" element={<Navigate to="/propostas" replace />} />
            <Route path="/engineering" element={<PageWrapper><Engineering /></PageWrapper>} />
            <Route path="/tasks" element={<PageWrapper><Tasks /></PageWrapper>} />
            <Route path="/products" element={<PageWrapper><Products /></PageWrapper>} />
            <Route path="/follow-up" element={<PageWrapper><FollowUp /></PageWrapper>} />
            <Route path="/reports" element={<PageWrapper><Reports /></PageWrapper>} />
            <Route path="/financeiro" element={<PageWrapper><Financial /></PageWrapper>} />
            <Route path="/prospeccao" element={<PageWrapper><Prospeccao /></PageWrapper>} />
            <Route path="/clientes" element={<PageWrapper><ClientCatalog /></PageWrapper>} />

            {/* Admin Routes */}
            <Route path="/tickets" element={<PageWrapper><TicketAdmin /></PageWrapper>} />
            <Route path="/intelligence" element={<PageWrapper><ClientIntelligence /></PageWrapper>} />
            <Route path="/maintenance" element={<PageWrapper><Maintenance /></PageWrapper>} />
            <Route path="/maintenance-alerts" element={<PageWrapper><MaintenanceAlerts /></PageWrapper>} />
            <Route path="/utility-robot" element={<PageWrapper><UtilityRobot /></PageWrapper>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></AnimatePresence>
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation */}
    </div>
  );
};

import { PortalProvider, usePortal } from './contexts/PortalContext';
import PortalNavigation from './components/PortalNavigation';

const PortalProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = usePortal();
  if (isLoading) return <SkeletonLoader />;
  if (!isAuthenticated) return <Navigate to="/portal/login" replace />;
  return <>{children}</>;
};

const PortalLayout: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-quark-bg text-slate-200 font-sans selection:bg-lime-500/30 overflow-hidden flex flex-col">
      <PortalNavigation />
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto custom-scrollbar">
        <Suspense fallback={<SkeletonLoader />}>
          <PortalProtectedRoute>
            <Routes>
              <Route path="/" element={<PageWrapper><PortalDashboard /></PageWrapper>} />
              <Route path="/tickets" element={<PageWrapper><PortalTickets /></PageWrapper>} />
              <Route path="/tracking" element={<PageWrapper><PortalTracking /></PageWrapper>} />
              <Route path="/payments" element={<PageWrapper><PortalPayments /></PageWrapper>} />
              <Route path="/shop" element={<PageWrapper><PortalEcommerce /></PageWrapper>} />
            </Routes>
          </PortalProtectedRoute>
        </Suspense>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#09090b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      />
      <Routes>
        <Route path="/portal/*" element={
          <PortalProvider>
            <Routes>
              <Route path="login" element={<Suspense fallback={<SkeletonLoader />}><ClientLoginScreen /></Suspense>} />
              <Route path="*" element={<PortalLayout />} />
            </Routes>
          </PortalProvider>
        } />
        <Route path="/p/:token" element={
          <Suspense fallback={<SkeletonLoader />}>
            <PublicProposal />
          </Suspense>
        } />
        <Route path="/captura" element={
          <Suspense fallback={<SkeletonLoader />}>
            <PublicCapture />
          </Suspense>
        } />
        <Route path="*" element={
          <AppProvider>
            <MainLayout />
          </AppProvider>
        } />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;