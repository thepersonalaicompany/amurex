// Upload store for managing file upload state using Zustand
// Handles upload progress tracking, file list management, and upload status states

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Chrome storage adapter for Zustand
const chromeStorage = {
  getItem: async (name) => {
    try {
      const result = await chrome.storage.local.get([name]);
      return result[name] || null;
    } catch (error) {
      console.error('Error getting from Chrome storage:', error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await chrome.storage.local.set({ [name]: value });
    } catch (error) {
      console.error('Error setting Chrome storage:', error);
    }
  },
  removeItem: async (name) => {
    try {
      await chrome.storage.local.remove([name]);
    } catch (error) {
      console.error('Error removing from Chrome storage:', error);
    }
  },
};

// Upload store state interface
const uploadStore = (set, get) => ({
  // State
  files: [],
  uploadProgress: {},
  isUploading: false,
  error: null,
  completedUploads: [],
  failedUploads: [],

  // Actions
  addFile: (file) => {
    const fileId = `${file.name}_${file.size}_${Date.now()}`;
    const fileData = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      status: 'pending', // 'pending', 'uploading', 'completed', 'error', 'cancelled'
      progress: 0,
      error: null,
      uploadedAt: null,
    };

    set((state) => ({
      files: [...state.files, fileData],
      error: null,
    }));

    console.log('File added to upload queue:', fileData);
  },

  removeFile: (fileId) => {
    set((state) => ({
      files: state.files.filter((file) => file.id !== fileId),
      uploadProgress: Object.fromEntries(
        Object.entries(state.uploadProgress).filter(([id]) => id !== fileId)
      ),
    }));
    console.log('File removed from upload queue:', fileId);
  },

  clearFiles: () => {
    set({
      files: [],
      uploadProgress: {},
      error: null,
    });
    console.log('All files cleared from upload queue');
  },

  updateProgress: (fileId, progress) => {
    set((state) => ({
      uploadProgress: {
        ...state.uploadProgress,
        [fileId]: progress,
      },
    }));
  },

  setFileStatus: (fileId, status, error = null) => {
    set((state) => ({
      files: state.files.map((file) =>
        file.id === fileId
          ? {
              ...file,
              status,
              error,
              uploadedAt:
                status === 'completed'
                  ? new Date().toISOString()
                  : file.uploadedAt,
            }
          : file
      ),
    }));

    // Move to appropriate completed/failed list
    if (status === 'completed') {
      set((state) => {
        const file = state.files.find((f) => f.id === fileId);
        if (file) {
          return {
            completedUploads: [
              ...state.completedUploads,
              { ...file, status, uploadedAt: new Date().toISOString() },
            ],
          };
        }
        return state;
      });
    } else if (status === 'error') {
      set((state) => {
        const file = state.files.find((f) => f.id === fileId);
        if (file) {
          return {
            failedUploads: [...state.failedUploads, { ...file, status, error }],
          };
        }
        return state;
      });
    }
  },

  setUploading: (status) => {
    set({ isUploading: status });
    console.log('Upload status updated:', status);
  },

  setError: (error) => {
    set({
      error,
      isUploading: false,
    });
    // Only log actual errors, not when clearing errors
    if (error !== null) {
      console.error('Upload store error:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },

  // Get files by status
  getFilesByStatus: (status) => {
    const { files } = get();
    return files.filter((file) => file.status === status);
  },

  // Get pending files
  getPendingFiles: () => {
    return get().getFilesByStatus('pending');
  },

  // Get uploading files
  getUploadingFiles: () => {
    return get().getFilesByStatus('uploading');
  },

  // Get completed files
  getCompletedFiles: () => {
    return get().getFilesByStatus('completed');
  },

  // Get failed files
  getFailedFiles: () => {
    return get().getFilesByStatus('error');
  },

  // Get file by ID
  getFileById: (fileId) => {
    const { files } = get();
    return files.find((file) => file.id === fileId);
  },

  // Get upload progress for file
  getUploadProgress: (fileId) => {
    const { uploadProgress } = get();
    return uploadProgress[fileId] || null;
  },

  // Check if any files are uploading
  hasActiveUploads: () => {
    const { files } = get();
    return files.some((file) => file.status === 'uploading');
  },

  // Get total upload progress
  getTotalProgress: () => {
    const { files } = get();
    if (files.length === 0) return 0;

    const totalProgress = files.reduce((sum, file) => {
      const progress = get().getUploadProgress(file.id);
      return sum + (progress ? progress.percentage : 0);
    }, 0);

    return Math.round(totalProgress / files.length);
  },

  // Get upload statistics
  getUploadStats: () => {
    const { files, completedUploads, failedUploads } = get();
    return {
      total: files.length,
      pending: get().getPendingFiles().length,
      uploading: get().getUploadingFiles().length,
      completed: completedUploads.length,
      failed: failedUploads.length,
      totalProgress: get().getTotalProgress(),
    };
  },

  // Clear completed uploads
  clearCompletedUploads: () => {
    set({ completedUploads: [] });
    console.log('Completed uploads cleared');
  },

  // Clear failed uploads
  clearFailedUploads: () => {
    set({ failedUploads: [] });
    console.log('Failed uploads cleared');
  },

  // Retry failed upload
  retryUpload: (fileId) => {
    set((state) => ({
      files: state.files.map((file) =>
        file.id === fileId ? { ...file, status: 'pending', error: null } : file
      ),
      failedUploads: state.failedUploads.filter((file) => file.id !== fileId),
    }));
    console.log('Upload retry initiated for file:', fileId);
  },

  // Reset store to initial state
  reset: () => {
    set({
      files: [],
      uploadProgress: {},
      isUploading: false,
      error: null,
      completedUploads: [],
      failedUploads: [],
    });
    console.log('Upload store reset');
  },

  // Update file metadata
  updateFileMetadata: (fileId, metadata) => {
    set((state) => ({
      files: state.files.map((file) =>
        file.id === fileId ? { ...file, ...metadata } : file
      ),
    }));
  },
});

// Create the store with persistence
export const useUploadStore = create(
  persist(uploadStore, {
    name: 'upload-store',
    storage: createJSONStorage(() => chromeStorage),
    // Only persist essential data
    partialize: (state) => ({
      completedUploads: state.completedUploads.slice(-20), // Keep only last 20 completed uploads
      failedUploads: state.failedUploads.slice(-10), // Keep only last 10 failed uploads
    }),
    // Custom serialization for Chrome storage
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => {
      try {
        return JSON.parse(str);
      } catch (error) {
        console.error('Error deserializing upload store:', error);
        return {
          files: [],
          uploadProgress: {},
          isUploading: false,
          error: null,
          completedUploads: [],
          failedUploads: [],
        };
      }
    },
    // Skip hydration for certain fields
    skipHydration: true,
  })
);

// Export store instance for direct access if needed
export const uploadStoreInstance = useUploadStore;

// Helper functions for external use
export const getUploadState = () => useUploadStore.getState();
export const getUploadFiles = () => useUploadStore.getState().files;
export const isUploading = () => useUploadStore.getState().isUploading;
export const getUploadError = () => useUploadStore.getState().error;
export const getUploadStats = () => useUploadStore.getState().getUploadStats();
