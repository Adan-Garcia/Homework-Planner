import { useEffect, useRef } from "react";
import performanceMonitor from "../utils/performance";

/**
 * usePerformance Hook
 * 
 * Monitors component render performance automatically.
 * Only active in development mode to avoid production overhead.
 * 
 * @param {string} componentName - Name of the component being monitored
 * @param {object} deps - Dependencies to track for re-renders
 * 
 * @example
 * function MyComponent({ data }) {
 *   usePerformance('MyComponent', { dataLength: data.length });
 *   // ... rest of component
 * }
 */
export const usePerformance = (componentName, deps = {}) => {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(null);

  useEffect(() => {
    // Track component mount
    if (renderCountRef.current === 0) {
      mountTimeRef.current = performance.now();
      performanceMonitor.start(`${componentName}-mount`);
    }
    
    renderCountRef.current += 1;
    
    return () => {
      // Track component unmount
      if (mountTimeRef.current) {
        performanceMonitor.end(`${componentName}-mount`, {
          totalRenders: renderCountRef.current,
          ...deps,
        });
      }
    };
  }, []); // Only on mount/unmount
  
  // Track re-renders
  useEffect(() => {
    if (renderCountRef.current > 1) {
      performanceMonitor.log(`${componentName}-rerender`, {
        renderCount: renderCountRef.current,
        ...deps,
      });
    }
  });
};

/**
 * useAsyncPerformance Hook
 * 
 * Monitors async operations (API calls, encryption, etc.)
 * 
 * @returns {function} measure - Function to wrap async operations
 * 
 * @example
 * const measure = useAsyncPerformance();
 * const data = await measure('fetchEvents', () => fetchEvents());
 */
export const useAsyncPerformance = () => {
  return async (label, asyncFn) => {
    performanceMonitor.start(label);
    try {
      const result = await asyncFn();
      performanceMonitor.end(label, { success: true });
      return result;
    } catch (error) {
      performanceMonitor.end(label, { success: false, error: error.message });
      throw error;
    }
  };
};
