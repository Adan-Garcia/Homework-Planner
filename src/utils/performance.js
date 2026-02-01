/**
 * Performance Monitoring Utility
 * 
 * Provides lightweight performance monitoring for the Homework Planner app.
 * Tracks component render times, function execution, and user interactions.
 */

import logger from './logger.js';

const isDevelopment = import.meta.env.DEV;

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.enabled = import.meta.env.DEV; // Only enable in development
  }

  /**
   * Start measuring a performance metric
   * @param {string} label - Unique identifier for the metric
   */
  start(label) {
    if (!this.enabled) return;
    
    this.metrics.set(label, {
      startTime: performance.now(),
      startMark: `${label}-start`,
    });
    
    if (performance.mark) {
      performance.mark(`${label}-start`);
    }
  }

  /**
   * End measuring and log the result
   * @param {string} label - Unique identifier for the metric
   * @param {object} metadata - Additional context information
   */
  end(label, metadata = {}) {
    if (!this.enabled) return;
    
    const metric = this.metrics.get(label);
    if (!metric) {
      if (isDevelopment) {
        logger.warn(`[Performance] No start time found for: ${label}`);
      }
      return;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    if (performance.mark && performance.measure) {
      performance.mark(`${label}-end`);
      try {
        performance.measure(label, metric.startMark, `${label}-end`);
      } catch (_e) {
        // Marks might not exist in all browsers
      }
    }

    // Log to console with color coding (development only)
    if (isDevelopment) {
      const color = duration < 16 ? 'green' : duration < 100 ? 'orange' : 'red';
      logger.log(
        `%c[Performance] ${label}: ${duration.toFixed(2)}ms`,
        `color: ${color}; font-weight: bold;`,
        metadata
      );
    }

    this.metrics.delete(label);
    
    // Return duration for further analysis
    return duration;
  }

  /**
   * Measure the execution time of a function
   * @param {string} label - Metric label
   * @param {Function} fn - Function to measure
   * @returns {*} - Return value of the function
   */
  async measure(label, fn) {
    if (!this.enabled) return fn();
    
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label, { error: error.message });
      throw error;
    }
  }

  /**
   * Track component render time
   * Use in useEffect to measure render duration
   * @param {string} componentName - Name of the component
   */
  trackRender(componentName) {
    if (!this.enabled) return () => {};
    
    const renderLabel = `${componentName}-render`;
    this.start(renderLabel);
    
    return () => this.end(renderLabel);
  }

  /**
   * Log all current Performance Observer entries
   */
  getEntries() {
    if (!this.enabled || !performance.getEntriesByType) return [];
    
    return {
      navigation: performance.getEntriesByType('navigation'),
      resource: performance.getEntriesByType('resource'),
      measure: performance.getEntriesByType('measure'),
      paint: performance.getEntriesByType('paint'),
    };
  }

  /**
   * Get Web Vitals metrics (if available)
   */
  getWebVitals() {
    if (!this.enabled) return {};
    
    const vitals = {};
    
    // First Contentful Paint
    const paintEntries = performance.getEntriesByType?.('paint') || [];
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) vitals.FCP = fcp.startTime;
    
    // Largest Contentful Paint (requires PerformanceObserver)
    try {
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.LCP = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      }
    } catch (e) {
      // PerformanceObserver not supported
    }
    
    return vitals;
  }

  /**
   * Log a summary of all metrics
   */
  logSummary() {
    if (!this.enabled || !isDevelopment) return;
    
    const entries = this.getEntries();
    const vitals = this.getWebVitals();
    
    if (isDevelopment) {
      console.group('%c📊 Performance Summary', 'font-size: 14px; font-weight: bold;');
      
      if (vitals.FCP) {
        logger.log(`First Contentful Paint: ${vitals.FCP.toFixed(2)}ms`);
      }
      if (vitals.LCP) {
        logger.log(`Largest Contentful Paint: ${vitals.LCP.toFixed(2)}ms`);
      }
      
      if (entries.measure && entries.measure.length > 0) {
        logger.log('\nCustom Measurements:');
        entries.measure.forEach(measure => {
          logger.log(`  ${measure.name}: ${measure.duration.toFixed(2)}ms`);
        });
      }
      
      console.groupEnd();
    }
  }

  /**
   * Clear all performance marks and measures
   */
  clear() {
    if (performance.clearMarks) performance.clearMarks();
    if (performance.clearMeasures) performance.clearMeasures();
    this.metrics.clear();
  }
}

// Create singleton instance
const perfMonitor = new PerformanceMonitor();

// Export convenience functions
export const startMeasure = (label) => perfMonitor.start(label);
export const endMeasure = (label, metadata) => perfMonitor.end(label, metadata);
export const measure = (label, fn) => perfMonitor.measure(label, fn);
export const trackRender = (componentName) => perfMonitor.trackRender(componentName);
export const getPerformanceEntries = () => perfMonitor.getEntries();
export const getWebVitals = () => perfMonitor.getWebVitals();
export const logPerformanceSummary = () => perfMonitor.logSummary();
export const clearPerformance = () => perfMonitor.clear();

export default perfMonitor;

/**
 * React Hook for tracking component performance
 * 
 * Usage:
 * ```jsx
 * function MyComponent() {
 *   usePerformanceTracking('MyComponent');
 *   // ... component logic
 * }
 * ```
 */
export const usePerformanceTracking = (componentName) => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    React.useEffect(() => {
      return trackRender(componentName);
    }, [componentName]);
  }
};

/**
 * Higher-Order Component for performance tracking
 * 
 * Usage:
 * ```jsx
 * const MonitoredComponent = withPerformanceTracking(MyComponent);
 * ```
 */
export const withPerformanceTracking = (Component) => {
  if (!import.meta.env.DEV) return Component;
  
  return function PerformanceTrackedComponent(props) {
    React.useEffect(() => {
      return trackRender(Component.displayName || Component.name || 'Unknown');
    });
    
    return React.createElement(Component, props);
  };
};
