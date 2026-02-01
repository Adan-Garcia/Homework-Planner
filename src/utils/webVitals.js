/**
 * Web Vitals Monitoring
 * 
 * Tracks Core Web Vitals and reports them to analytics in production.
 * Provides real user monitoring (RUM) for performance optimization.
 * 
 * **Core Web Vitals Tracked:**
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response time
 */

import logger from './logger.js';

/**
 * Reports a web vital metric
 * @param {Object} metric - The performance metric object
 */
const reportMetric = (metric) => {
  if (import.meta.env.DEV) {
    logger.log(`[WebVitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    });
  }

  // In production, send to analytics service
  if (import.meta.env.PROD) {
    // Example: Send to Google Analytics, Vercel Analytics, or custom endpoint
    try {
      // Uncomment and configure for your analytics provider:
      
      // Google Analytics 4
      // if (window.gtag) {
      //   window.gtag('event', metric.name, {
      //     value: Math.round(metric.value),
      //     metric_id: metric.id,
      //     metric_value: metric.value,
      //     metric_delta: metric.delta,
      //   });
      // }
      
      // Custom Analytics Endpoint
      // fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     metric: metric.name,
      //     value: metric.value,
      //     rating: metric.rating,
      //     timestamp: Date.now(),
      //   }),
      // });
      
      // Vercel Analytics
      // if (window.va) {
      //   window.va('event', metric.name, { value: metric.value });
      // }
      
      logger.debug('[WebVitals] Metric reported:', metric.name);
    } catch (error) {
      logger.error('[WebVitals] Failed to report metric:', error);
    }
  }
};

/**
 * Initialize Web Vitals monitoring using native Performance Observer API
 */
export const initWebVitals = () => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    logger.warn('[WebVitals] PerformanceObserver not supported');
    return;
  }

  // Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      reportMetric({
        name: 'LCP',
        value: lastEntry.renderTime || lastEntry.loadTime,
        rating: getRating(lastEntry.renderTime || lastEntry.loadTime, [2500, 4000]),
        delta: lastEntry.renderTime || lastEntry.loadTime,
        id: `lcp-${Date.now()}`,
      });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    logger.debug('[WebVitals] LCP observer failed:', e);
  }

  // First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        reportMetric({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          rating: getRating(entry.processingStart - entry.startTime, [100, 300]),
          delta: entry.processingStart - entry.startTime,
          id: `fid-${Date.now()}`,
        });
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    logger.debug('[WebVitals] FID observer failed:', e);
  }

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      reportMetric({
        name: 'CLS',
        value: clsValue,
        rating: getRating(clsValue, [0.1, 0.25]),
        delta: clsValue,
        id: `cls-${Date.now()}`,
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    logger.debug('[WebVitals] CLS observer failed:', e);
  }

  // First Contentful Paint (FCP)
  try {
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry) {
        reportMetric({
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: getRating(fcpEntry.startTime, [1800, 3000]),
          delta: fcpEntry.startTime,
          id: `fcp-${Date.now()}`,
        });
      }
    });
    paintObserver.observe({ entryTypes: ['paint'] });
  } catch (e) {
    logger.debug('[WebVitals] FCP observer failed:', e);
  }

  // Time to First Byte (TTFB)
  try {
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        reportMetric({
          name: 'TTFB',
          value: entry.responseStart - entry.requestStart,
          rating: getRating(entry.responseStart - entry.requestStart, [800, 1800]),
          delta: entry.responseStart - entry.requestStart,
          id: `ttfb-${Date.now()}`,
        });
      });
    });
    navigationObserver.observe({ entryTypes: ['navigation'] });
  } catch (e) {
    logger.debug('[WebVitals] TTFB observer failed:', e);
  }

  logger.log('[WebVitals] Monitoring initialized');
};

/**
 * Determines the rating (good/needs-improvement/poor) based on thresholds
 * @param {number} value - The metric value
 * @param {Array<number>} thresholds - [good, needsImprovement] thresholds
 * @returns {string} - 'good', 'needs-improvement', or 'poor'
 */
const getRating = (value, thresholds) => {
  if (value <= thresholds[0]) return 'good';
  if (value <= thresholds[1]) return 'needs-improvement';
  return 'poor';
};

/**
 * Get a summary of all current performance metrics
 * @returns {Object} Summary of performance metrics
 */
export const getPerformanceSummary = () => {
  if (typeof window === 'undefined' || !window.performance) {
    return {};
  }

  const summary = {};

  // Navigation timing
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) {
    summary.pageLoad = nav.loadEventEnd - nav.fetchStart;
    summary.domReady = nav.domContentLoadedEventEnd - nav.fetchStart;
    summary.ttfb = nav.responseStart - nav.requestStart;
  }

  // Paint timing
  const paintEntries = performance.getEntriesByType('paint');
  paintEntries.forEach(entry => {
    if (entry.name === 'first-contentful-paint') {
      summary.fcp = entry.startTime;
    }
  });

  return summary;
};
