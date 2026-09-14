import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 w-full min-h-[400px] flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4 text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {this.props.fallbackTitle || 'Ocorreu um problema ao carregar o jogo'}
            </h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {this.state.error?.message || 'Houve uma falha inesperada na renderização da partida. Tente reiniciar a visualização.'}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onReset) this.props.onReset();
                  else window.location.reload();
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar
              </button>
              {this.props.onReset && (
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    this.props.onReset?.();
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-95"
                >
                  <Home className="w-4 h-4" />
                  Voltar ao Início
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
