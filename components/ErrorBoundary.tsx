
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
          <div className="max-w-md w-full bg-slate-900 border-2 border-red-500/30 rounded-[2.5rem] p-10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">System Exception</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Biosyn Core encountered a critical rendering error. Our clinical intelligence link has been temporarily severed.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/40"
            >
              Re-initialize Core
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-8 p-4 bg-black/40 rounded-xl text-[10px] text-red-400 text-left overflow-auto max-h-40 border border-red-900/20 font-mono">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
