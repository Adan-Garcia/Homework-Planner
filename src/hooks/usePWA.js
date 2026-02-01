import { useEffect, useState, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useNotification } from '../context/NotificationContext';
import logger from '../utils/logger';

/**
 * usePWA Hook
 * * Manages Progressive Web App service worker lifecycle
 * * Provides automatic updates with user notifications
 * * Handles offline/online state
 */
export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const notify = useNotification();
  const updateIntervalRef = useRef(null);

  // Register service worker with automatic updates
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered(registration) {
      logger.log('[PWA] Service Worker registered');
      
      // Check for updates every hour
      if (registration) {
        // Clear any existing interval
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
        
        updateIntervalRef.current = setInterval(() => {
          logger.log('[PWA] Checking for updates...');
          registration.update();
        }, 60 * 60 * 1000); // 1 hour
      }
    },
    onRegisterError(error) {
      logger.error('[PWA] Service Worker registration error:', error);
    },
    onOfflineReady() {
      logger.log('[PWA] App ready to work offline');
      notify.success('App is ready for offline use!', 5000);
    },
    onNeedRefresh() {
      logger.log('[PWA] New version available');
      notify.info('New version available! Updating...', 3000);
      // Auto-update after 3 seconds
      setTimeout(() => {
        updateServiceWorker(true);
      }, 3000);
    },
  });

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        logger.log('[PWA] Update interval cleared');
      }
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notify.success('Back online!');
      logger.log('[PWA] Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      notify.warning('You are offline. Some features may be limited.');
      logger.log('[PWA] Connection lost - running in offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [notify]);

  return {
    isOnline,
    offlineReady,
    needRefresh,
    updateServiceWorker,
  };
};
