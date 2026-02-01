/**
 * useKeyboardShortcuts Hook
 * 
 * Provides keyboard shortcuts for common actions throughout the app.
 * Enhances accessibility and power user productivity.
 * 
 * **Supported Shortcuts:**
 * - Ctrl/Cmd + K: Open search
 * - Ctrl/Cmd + N: New task
 * - Ctrl/Cmd + S: Open settings
 * - Escape: Close modals
 * - ?: Show help (keyboard shortcuts list)
 */

import { useEffect, useCallback } from 'react';
import { useUI } from '../context/PlannerContext';
import logger from '../utils/logger';

export const useKeyboardShortcuts = () => {
  const { openModal, openTaskModal, closeModal, modals, setSearchQuery } = useUI();

  const handleKeyDown = useCallback((event) => {
    // Check if user is typing in an input/textarea
    const isTyping = event.target.tagName === 'INPUT' || 
                     event.target.tagName === 'TEXTAREA' ||
                     event.target.isContentEditable;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? event.metaKey : event.ctrlKey;

    // Escape key - Close any open modal
    if (event.key === 'Escape') {
      if (modals.task) closeModal('task');
      else if (modals.settings) closeModal('settings');
      else if (modals.jsonEdit) closeModal('jsonEdit');
      return;
    }

    // Don't handle other shortcuts when typing
    if (isTyping && event.key !== 'Escape') return;

    // Ctrl/Cmd + K - Focus search
    if (modKey && event.key === 'k') {
      event.preventDefault();
      const searchInput = document.querySelector('[aria-label="Search tasks"]');
      if (searchInput) {
        searchInput.focus();
      }
      logger.debug('[Shortcuts] Search focused');
      return;
    }

    // Ctrl/Cmd + N - New task
    if (modKey && event.key === 'n') {
      event.preventDefault();
      openTaskModal(null);
      logger.debug('[Shortcuts] New task modal opened');
      return;
    }

    // Ctrl/Cmd + S - Settings
    if (modKey && event.key === 's') {
      event.preventDefault();
      openModal('settings');
      logger.debug('[Shortcuts] Settings opened');
      return;
    }

    // ? - Show keyboard shortcuts help
    if (event.key === '?' && !isTyping) {
      event.preventDefault();
      // You can implement a help modal here
      logger.log('⌨️ Keyboard Shortcuts:\n' +
        '• Ctrl/Cmd + N: New Task\n' +
        '• Ctrl/Cmd + K: Search\n' +
        '• Ctrl/Cmd + S: Settings\n' +
        '• Escape: Close Modal');
      return;
    }
  }, [openModal, openTaskModal, closeModal, modals, setSearchQuery]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null; // This hook doesn't render anything
};
