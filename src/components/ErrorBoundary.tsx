import { Component, ErrorInfo, ComponentChild } from 'preact';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ComponentChild;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Check if language is Persian by checking document direction or defaulting to a simple bilingual message
      const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-dark-card border border-red-500/20 rounded-xl max-w-lg mx-auto mt-12 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4 opacity-80" />
          <h2 className="text-xl font-bold text-white mb-2 font-display">
            {isRTL ? 'متأسفانه خطایی رخ داد' : 'Something went wrong'}
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md">
            {isRTL 
              ? 'در نمایش این بخش مشکلی به وجود آمده است. ما در حال بررسی آن هستیم.' 
              : 'There was a problem rendering this section. We are looking into it.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 font-bold"
          >
            <RotateCcw className="w-4 h-4" />
            {isRTL ? 'تلاش دوباره' : 'Try Again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
