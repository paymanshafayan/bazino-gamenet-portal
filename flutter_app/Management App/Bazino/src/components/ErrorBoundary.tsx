import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in BAZINO PRO application:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearStorageAndReset = () => {
    if (window.confirm('آیا از پاکسازی حافظه موقت و بازنشانی نرم‌افزار اطمینان دارید؟ داده‌های اولیه مجددا بارگذاری خواهند شد.')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen min-h-[100dvh] bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-['Vazirmatn',sans-serif] dir-rtl">
          <div className="max-w-lg w-full bg-zinc-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-5 text-right">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <ShieldAlert className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-amber-400">بازیابی خودکار نرم‌افزار BAZINO PRO</h2>
                <p className="text-xs text-zinc-400">سازگاری مرورگر و بازخوانی ایمن اطلاعات</p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <p className="text-zinc-300">
                یک خطای غیرمنتظره در اجرای کدهای مرورگر رخ داده است. سیستم از بروز صفحه سفید جلوگیری نموده و حالت ایمن را فعال کرده است.
              </p>
              {this.state.error && (
                <div className="p-2 bg-rose-950/40 border border-rose-800/40 text-rose-300 font-mono text-[11px] rounded dir-ltr text-left overflow-x-auto">
                  {this.state.error.toString()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تلاش مجدد و بارگذاری صفحه</span>
              </button>

              <button
                onClick={this.handleClearStorageAndReset}
                className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>بازنشانی حافظه</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
