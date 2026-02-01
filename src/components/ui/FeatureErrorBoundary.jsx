import React from "react";
import PropTypes from "prop-types";
import { AlertTriangle } from "lucide-react";
import logger from "../../utils/logger";
import Button from "./Button";

/**
 * FeatureErrorBoundary Component
 * * A reusable error boundary for wrapping critical features
 * * Provides a graceful fallback UI and optional retry mechanism
 */
class FeatureErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error(`[${this.props.featureName}] Error caught:`, error, errorInfo);
    
    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-8 h-8" />
            <h2 className="text-xl font-bold">Something went wrong</h2>
          </div>
          <p className="text-sm text-secondary text-center max-w-md">
            {this.props.errorMessage || 
              `The ${this.props.featureName} feature encountered an error. Please try again.`}
          </p>
          {this.props.showReset && (
            <Button variant="primary" onClick={this.handleReset}>
              Try Again
            </Button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

FeatureErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  featureName: PropTypes.string,
  errorMessage: PropTypes.string,
  showReset: PropTypes.bool,
  onError: PropTypes.func,
  onReset: PropTypes.func,
};

FeatureErrorBoundary.defaultProps = {
  featureName: "This",
  showReset: true,
};

export default FeatureErrorBoundary;
