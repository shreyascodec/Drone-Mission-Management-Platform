/**
 * Error Boundary
 * 
 * Catches and handles React errors gracefully
 * Provides fallback UI and error reporting
 */

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('Error Boundary caught an error:', error, errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // TODO: Send error to monitoring service (e.g., Sentry)
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-muted-foreground">
                  We encountered an unexpected error. Don't worry, your data is safe.
                </p>
              </div>

              {/* Error Details (Development only) */}
              {import.meta.env.DEV && this.state.error && (
                <Card className="w-full p-4 bg-secondary/50 text-left">
                  <div className="text-sm font-mono space-y-2">
                    <div>
                      <div className="text-red-500 font-semibold">Error:</div>
                      <div className="text-foreground">{this.state.error.toString()}</div>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <div className="text-red-500 font-semibold mt-2">Stack Trace:</div>
                        <pre className="text-xs text-muted-foreground overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-sm text-muted-foreground">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
