"use client";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    
    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-900 flex flex-col items-center justify-center py-16 px-4">
          <div className="w-full max-w-md text-center">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold mb-4 text-text-100">
                Something went wrong
              </h1>
              <p className="text-text-300 mb-6">
                We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-brand-500 text-bg-900 font-medium py-3 px-6 rounded-lg hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                Refresh Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="w-full bg-bg-700 text-text-200 font-medium py-3 px-6 rounded-lg border border-border-600 hover:bg-bg-600 active:bg-bg-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                Try Again
              </button>
            </div>
            
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-state-error cursor-pointer mb-2">
                  Error Details (Development)
                </summary>
                <pre className="bg-bg-800 p-4 rounded border border-border-600 text-sm text-text-200 overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 