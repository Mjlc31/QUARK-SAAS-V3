import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔴 Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-red-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              
              <h1 className="text-2xl font-bold text-white mb-2">Ops! Algo deu errado.</h1>
              <p className="text-slate-400 mb-6 text-sm">
                Ocorreu um erro inesperado no sistema. A equipe técnica já foi notificada.
              </p>

              {this.state.error && (
                <div className="w-full bg-black/40 border border-white/5 rounded-xl p-4 mb-6 text-left overflow-x-auto">
                  <p className="text-red-400 font-mono text-xs truncate">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <button
                onClick={this.handleReload}
                className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-lg transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                Recarregar Sistema
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
