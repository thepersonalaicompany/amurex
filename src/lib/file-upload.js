// File upload service for Amurex Extension
// Handles file upload to backend with progress tracking and error handling

import { AMUREX_CONFIG } from './config.js';
import { formatFileSize, validateFiles } from './file-validation.js';

export const UPLOAD_CONFIG = {
  // API endpoints
  UPLOAD_ENDPOINT: '/upload_meeting_file',

  // Upload settings
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second

  // Progress tracking
  PROGRESS_UPDATE_INTERVAL: 100, // 100ms

  // Error messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Network error occurred during upload',
    SERVER_ERROR: 'Server error occurred during upload',
    VALIDATION_ERROR: 'File validation failed',
    UPLOAD_CANCELLED: 'Upload was cancelled',
    UPLOAD_TIMEOUT: 'Upload timed out',
    UNKNOWN_ERROR: 'An unknown error occurred during upload',
  },
};

/**
 * Upload progress information
 */
export class UploadProgress {
  constructor(fileId, fileName, totalSize) {
    this.fileId = fileId;
    this.fileName = fileName;
    this.totalSize = totalSize;
    this.uploadedSize = 0;
    this.percentage = 0;
    this.status = 'pending'; // 'pending', 'uploading', 'completed', 'error', 'cancelled'
    this.speed = 0; // bytes per second
    this.eta = 0; // estimated time remaining in seconds
    this.startTime = null;
    this.error = null;
  }

  /**
   * Update progress
   * @param {number} uploadedSize - Size uploaded so far
   */
  updateProgress(uploadedSize) {
    this.uploadedSize = uploadedSize;
    this.percentage = Math.min(
      100,
      Math.round((uploadedSize / this.totalSize) * 100)
    );

    if (this.startTime) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.speed = uploadedSize / elapsed;
      const remaining = Math.max(0, this.totalSize - uploadedSize);
      this.eta = remaining / this.speed;
    }
  }

  /**
   * Set status
   * @param {string} status - New status
   * @param {string} error - Error message if applicable
   */
  setStatus(status, error = null) {
    this.status = status;
    this.error = error;

    if (status === 'uploading' && !this.startTime) {
      this.startTime = Date.now();
    }
  }

  /**
   * Get formatted progress info
   * @returns {Object} - Formatted progress information
   */
  getFormattedProgress() {
    return {
      fileId: this.fileId,
      fileName: this.fileName,
      percentage: this.percentage,
      uploadedSize: formatFileSize(this.uploadedSize),
      totalSize: formatFileSize(this.totalSize),
      speed: formatFileSize(this.speed) + '/s',
      eta: this.eta > 0 ? Math.round(this.eta) + 's' : 'Unknown',
      status: this.status,
      error: this.error,
    };
  }
}

/**
 * File upload service class
 */
class FileUploadService {
  constructor() {
    this.activeUploads = new Map();
    this.uploadHandlers = new Map();
  }

  /**
   * Upload single file
   * @param {File} file - File to upload
   * @param {string} meetingId - Meeting ID
   * @param {string} userId - User ID
   * @param {Function} onProgress - Progress callback
   * @param {Function} onComplete - Completion callback
   * @param {Function} onError - Error callback
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(file, meetingId, userId, onProgress, onComplete, onError) {
    const fileId = this.generateFileId(file);
    const progress = new UploadProgress(fileId, file.name, file.size);

    try {
      // Validate file first
      const validationResult = validateFiles([file]);
      if (!validationResult.isValid) {
        progress.setStatus('error', validationResult.getFirstError());
        onError(progress);
        return { success: false, error: validationResult.getFirstError() };
      }

      // Store progress and handlers
      this.activeUploads.set(fileId, progress);
      this.uploadHandlers.set(fileId, { onProgress, onComplete, onError });

      // Start upload
      progress.setStatus('uploading');
      onProgress(progress);

      const result = await this.performUpload(
        file,
        meetingId,
        userId,
        progress
      );

      if (result.success) {
        progress.setStatus('completed');
        onComplete(progress, result.data);
      } else {
        progress.setStatus('error', result.error);
        onError(progress);
      }

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      progress.setStatus(
        'error',
        error.message || UPLOAD_CONFIG.ERROR_MESSAGES.UNKNOWN_ERROR
      );
      onError(progress);
      return { success: false, error: error.message };
    } finally {
      // Cleanup
      this.activeUploads.delete(fileId);
      this.uploadHandlers.delete(fileId);
    }
  }

  /**
   * Upload multiple files
   * @param {File[]} files - Files to upload
   * @param {string} meetingId - Meeting ID
   * @param {string} userId - User ID
   * @param {Function} onProgress - Progress callback
   * @param {Function} onComplete - Completion callback
   * @param {Function} onError - Error callback
   * @returns {Promise<Object[]>} - Upload results
   */
  async uploadFiles(files, meetingId, userId, onProgress, onComplete, onError) {
    const results = [];

    // Validate all files first
    const validationResult = validateFiles(files);
    if (!validationResult.isValid) {
      onError({ error: validationResult.getFirstError() });
      return results;
    }

    // Upload files sequentially to avoid overwhelming the server
    for (const file of files) {
      try {
        const result = await this.uploadFile(
          file,
          meetingId,
          userId,
          onProgress,
          onComplete,
          onError
        );
        results.push(result);
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        results.push({
          success: false,
          error: error.message,
          fileName: file.name,
        });
      }
    }

    return results;
  }

  /**
   * Perform actual upload using XMLHttpRequest
   * @private
   */
  async performUpload(file, meetingId, userId, progress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      // Add file and metadata to form data
      formData.append('file', file);
      formData.append('meeting_id', meetingId);
      formData.append('user_id', userId);

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          progress.updateProgress(event.loaded);
          const handlers = this.uploadHandlers.get(progress.fileId);
          if (handlers && handlers.onProgress) {
            handlers.onProgress(progress);
          }
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({ success: true, data: response });
          } catch (error) {
            resolve({ success: true, data: xhr.responseText });
          }
        } else {
          const errorMessage = this.getErrorMessage(xhr.status);
          resolve({ success: false, error: errorMessage });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: UPLOAD_CONFIG.ERROR_MESSAGES.NETWORK_ERROR,
        });
      });

      xhr.addEventListener('timeout', () => {
        resolve({
          success: false,
          error: UPLOAD_CONFIG.ERROR_MESSAGES.UPLOAD_TIMEOUT,
        });
      });

      // Configure request
      xhr.open(
        'POST',
        `${AMUREX_CONFIG.BASE_URL_BACKEND}${UPLOAD_CONFIG.UPLOAD_ENDPOINT}/${meetingId}/${userId}/`
      );
      xhr.timeout = 300000; // 5 minutes timeout

      // Send request
      xhr.send(formData);
    });
  }

  /**
   * Generate unique file ID
   * @private
   */
  generateFileId(file) {
    return `${file.name}_${file.size}_${Date.now()}`;
  }

  /**
   * Get error message based on HTTP status
   * @private
   */
  getErrorMessage(status) {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your file and try again.';
      case 401:
        return 'Authentication required. Please sign in and try again.';
      case 403:
        return 'Access denied. You do not have permission to upload files.';
      case 404:
        return 'Upload endpoint not found. Please try again later.';
      case 413:
        return 'File too large. Please choose a smaller file.';
      case 415:
        return 'Unsupported file type. Only PDF files are allowed.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return UPLOAD_CONFIG.ERROR_MESSAGES.SERVER_ERROR;
    }
  }

  /**
   * Cancel upload
   * @param {string} fileId - File ID to cancel
   */
  cancelUpload(fileId) {
    const progress = this.activeUploads.get(fileId);
    if (progress) {
      progress.setStatus(
        'cancelled',
        UPLOAD_CONFIG.ERROR_MESSAGES.UPLOAD_CANCELLED
      );
      const handlers = this.uploadHandlers.get(fileId);
      if (handlers && handlers.onError) {
        handlers.onError(progress);
      }

      // Cleanup
      this.activeUploads.delete(fileId);
      this.uploadHandlers.delete(fileId);
    }
  }

  /**
   * Get active uploads
   * @returns {Map} - Active uploads
   */
  getActiveUploads() {
    return this.activeUploads;
  }

  /**
   * Check if upload is in progress
   * @param {string} fileId - File ID
   * @returns {boolean} - Whether upload is active
   */
  isUploadActive(fileId) {
    return this.activeUploads.has(fileId);
  }
}

// Export singleton instance and convenience function
export const fileUploadService = new FileUploadService();
export const uploadFile = (
  file,
  meetingId,
  userId,
  onProgress,
  onComplete,
  onError
) =>
  fileUploadService.uploadFile(
    file,
    meetingId,
    userId,
    onProgress,
    onComplete,
    onError
  );
export default fileUploadService;
