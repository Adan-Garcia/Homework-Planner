/**
 * Logging Utility
 * * Provides production-safe logging that can be conditionally disabled
 */

const isDevelopment = import.meta.env.DEV;

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

export default logger;
