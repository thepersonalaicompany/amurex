// Error handling service for comprehensive error management
// Provides centralized error handling, logging, and user feedback

import { analyticsService } from './analytics.js';

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      NETWORK: 'network',
      VALIDATION: 'validation',
      AUTHENTICATION: 'authentication',
      PERMISSION: 'permission',
      STORAGE: 'storage',
      WEBSOCKET: 'websocket',
      FILE_UPLOAD: 'file_upload',
      API: 'api',
      UNKNOWN: 'unknown',
    };
  }

  /**
   * Handle and categorize errors
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   * @param {Object} metadata - Additional error metadata
   */
  handleError(error, context = 'unknown', metadata = {}) {
    const errorInfo = this.categorizeError(error);

    // Log error details
    console.error(`[${context}] ${errorInfo.type}:`, {
      message: error.message,
      stack: error.stack,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // Track error analytics
    analyticsService.trackEvent('error_occurred', {
      error_type: errorInfo.type,
      context,
      message: error.message,
      ...metadata,
    });

    // Log error for debugging (notifications removed)
    console.log(`[${context}] User message: ${errorInfo.userMessage}`);

    return errorInfo;
  }

  /**
   * Categorize error based on type and message
   * @param {Error} error - The error object
   */
  categorizeError(error) {
    const message = (
      error.message ||
      error.toString() ||
      'Unknown error'
    ).toLowerCase();
    const name = (error.name || 'Error').toLowerCase();

    // Network errors
    if (
      name.includes('network') ||
      name.includes('fetch') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      return {
        type: this.errorTypes.NETWORK,
        userMessage:
          'Network connection error. Please check your internet connection.',
        severity: 'error',
      };
    }

    // Authentication errors
    if (
      name.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('401') ||
      message.includes('403')
    ) {
      return {
        type: this.errorTypes.AUTHENTICATION,
        userMessage: 'Authentication error. Please sign in again.',
        severity: 'error',
      };
    }

    // Validation errors
    if (
      name.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('format')
    ) {
      return {
        type: this.errorTypes.VALIDATION,
        userMessage: 'Invalid input. Please check your data and try again.',
        severity: 'warning',
      };
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('denied') ||
      message.includes('access')
    ) {
      return {
        type: this.errorTypes.PERMISSION,
        userMessage:
          'Permission denied. Please check your browser permissions.',
        severity: 'error',
      };
    }

    // Storage errors
    if (
      name.includes('storage') ||
      message.includes('storage') ||
      message.includes('quota')
    ) {
      return {
        type: this.errorTypes.STORAGE,
        userMessage:
          'Storage error. Please try again or clear your browser data.',
        severity: 'warning',
      };
    }

    // WebSocket errors
    if (
      name.includes('websocket') ||
      message.includes('websocket') ||
      message.includes('ws')
    ) {
      return {
        type: this.errorTypes.WEBSOCKET,
        userMessage:
          'Connection error. Live suggestions may not work properly.',
        severity: 'warning',
      };
    }

    // File upload errors
    if (
      message.includes('upload') ||
      message.includes('file') ||
      message.includes('size') ||
      message.includes('format')
    ) {
      return {
        type: this.errorTypes.FILE_UPLOAD,
        userMessage: 'File upload error. Please check your file and try again.',
        severity: 'error',
      };
    }

    // API errors
    if (
      message.includes('api') ||
      message.includes('server') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    ) {
      return {
        type: this.errorTypes.API,
        userMessage: 'Server error. Please try again later.',
        severity: 'error',
      };
    }

    // Unknown errors
    return {
      type: this.errorTypes.UNKNOWN,
      userMessage: 'An unexpected error occurred. Please try again.',
      severity: 'error',
    };
  }

  /**
   * Log user-friendly message (notifications removed)
   * @param {Object} errorInfo - Categorized error information
   * @param {string} context - Error context
   */
  showUserNotification(errorInfo, context) {
    const { severity, userMessage } = errorInfo;
    console.log(`[${context}] ${severity.toUpperCase()}: ${userMessage}`);
  }

  /**
   * Handle specific error types with custom logic
   */

  /**
   * Handle WebSocket connection errors
   */
  handleWebSocketError(error, connection) {
    const errorInfo = this.handleError(error, 'websocket', {
      connectionState: connection?.readyState,
      url: connection?.url,
    });

    // Attempt reconnection for certain error types
    if (errorInfo.type === this.errorTypes.NETWORK && connection) {
      setTimeout(() => {
        try {
          connection.reconnect();
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError);
        }
      }, 5000);
    }

    return errorInfo;
  }

  /**
   * Handle file upload errors
   */
  handleFileUploadError(error, file) {
    return this.handleError(error, 'file_upload', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    });
  }

  /**
   * Handle API response errors
   */
  handleApiError(error, endpoint, statusCode) {
    return this.handleError(error, 'api', {
      endpoint,
      statusCode,
    });
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error) {
    const errorInfo = this.handleError(error, 'authentication');

    // Clear auth state on auth errors
    if (errorInfo.type === this.errorTypes.AUTHENTICATION) {
      try {
        chrome.storage.local.remove(['auth_state', 'user_data']);
      } catch (storageError) {
        console.error('Failed to clear auth state:', storageError);
      }
    }

    return errorInfo;
  }

  /**
   * Handle storage errors
   */
  handleStorageError(error, operation) {
    return this.handleError(error, 'storage', {
      operation,
    });
  }

  /**
   * Create a user-friendly error message
   * @param {string} action - The action that failed
   * @param {string} reason - The reason for failure
   */
  createUserMessage(action, reason) {
    const messages = {
      file_upload: {
        network:
          'Unable to upload file. Please check your internet connection.',
        size: 'File is too large. Please choose a smaller file.',
        format: 'Unsupported file format. Please upload a PDF file.',
        permission: 'Permission denied. Please check your browser settings.',
        default: 'File upload failed. Please try again.',
      },
      websocket_connection: {
        network:
          'Unable to connect to live suggestions. Please check your internet connection.',
        permission: 'Permission denied. Please check your browser settings.',
        default: 'Connection failed. Live suggestions may not work properly.',
      },
      summary_generation: {
        network:
          'Unable to generate summary. Please check your internet connection.',
        quota: 'API quota exceeded. Please try again later.',
        default: 'Summary generation failed. Please try again.',
      },
      default: {
        default: 'An error occurred. Please try again.',
      },
    };

    const actionMessages = messages[action] || messages.default;
    return actionMessages[reason] || actionMessages.default;
  }

  /**
   * Wrap async functions with error handling
   * @param {Function} fn - The async function to wrap
   * @param {string} context - Error context
   * @param {Object} metadata - Additional metadata
   */
  async wrapAsync(fn, context = 'unknown', metadata = {}) {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error, context, metadata);
      throw error;
    }
  }

  /**
   * Wrap sync functions with error handling
   * @param {Function} fn - The sync function to wrap
   * @param {string} context - Error context
   * @param {Object} metadata - Additional metadata
   */
  wrapSync(fn, context = 'unknown', metadata = {}) {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, context, metadata);
      throw error;
    }
  }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandler();

// Export the class for testing
export { ErrorHandler };
