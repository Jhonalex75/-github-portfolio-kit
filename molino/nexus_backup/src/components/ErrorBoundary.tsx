/**
 * React Error Boundary
 * Catches and handles React component errors gracefully
 */

'use client';

import React, { ReactNode, ReactElement } from 'react';
import { logger } from '@/lib/logger';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCount: number;
}

/**
 * Error Boundary Component
 * Wraps components to catch rendering errors
 */
export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    errorCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorCount: 0, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { errorCount } = this.state;
    const newCount = errorCount + 1;

    this.setState({ errorInfo, errorCount: newCount });

    // Log error
    logger.critical(
      'React Component Error',
      error,
      'ErrorBoundary',
      {
        componentStack: errorInfo.componentStack,
        errorCount: newCount,
      }
    );

    // Reset after 5 errors to prevent infinite loops
    if (newCount > 5) {
      logger.error('Error Boundary exceeded error threshold', new Error('Too many errors'));
      this.resetError();
    }
  }

  private resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorCount: 0 });
  };

  private reload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="w-full h-full flex items-center justify-center p-6">
            <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <h2 className="font-semibold">Algo salió mal</h2>
                </div>

                <p className="text-sm text-foreground/70">
                  La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
                </p>

                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-destructive/10 p-3 rounded text-xs text-destructive overflow-auto max-h-32 font-mono">
                    <p className="font-semibold mb-2">Error Details:</p>
                    <p>{this.state.error?.message}</p>
                    {this.state.errorInfo && (
                      <details className="mt-2 cursor-pointer">
                        <summary>Stack Trace</summary>
                        <pre className="text-[10px] mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={this.resetError}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Reintentar
                  </Button>
                  <Button
                    onClick={this.reload}
                    size="sm"
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recargar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to manually throw errors in Error Boundary
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}
