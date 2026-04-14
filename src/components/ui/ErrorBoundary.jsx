import React from "react";
import { AlertTriangle } from "lucide-react";
import logger from "../../utils/logger";

/**
 * Error Boundary Component
 * * Catches errors in child components and displays a fallback UI.
 * * Prevents entire feature from crashing if one component fails.
 * * Logs error details to console for debugging.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("[ErrorBoundary] Component Error:", error);
    logger.error("[ErrorBoundary] Error Info:", errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-xl status-error text-center">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-300" />
            <h3 className="font-bold text-red-800 dark:text-red-200">Something went wrong</h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-sm">
            {this.state.error?.message || "An unexpected error occurred in this component"}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-danger-soft px-4 py-2 rounded-lg text-sm font-semibold"
            aria-label="Reset error and try again"
          >
            Try Again
          </button>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 text-xs text-red-600 dark:text-red-400 w-full text-left">
              <summary className="cursor-pointer font-mono font-semibold">Debug Info</summary>
              <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded overflow-auto max-h-48 text-left">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
