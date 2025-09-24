// handles active suggestions, history, WebSocket connection status, and file upload status

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

// Suggestion store state interface
const suggestionStore = (set, get) => ({
  // State
  suggestions: [],
  history: [],
  isConnected: false,
  isLoading: false,
  error: null,
  lastSuggestionTime: null,
  connectionStatus: 'disconnected', // 'connecting', 'connected', 'disconnected', 'reconnecting', 'error'

  // Actions
  addSuggestion: (suggestion) => {
    const newSuggestion = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      content: suggestion.generated_suggestion || suggestion.content,
      type: suggestion.type || 'suggestion',
      filesFound: suggestion.files_found || false,
      lastQuestion: suggestion.last_question || null,
      ...suggestion,
    };

    set((state) => ({
      suggestions: [...state.suggestions, newSuggestion],
      history: [...state.history, newSuggestion],
      lastSuggestionTime: newSuggestion.timestamp,
      error: null,
    }));

    console.log('Suggestion added:', newSuggestion);
  },

  clearSuggestions: () => {
    set({
      suggestions: [],
      error: null,
    });
    console.log('Suggestions cleared');
  },

  clearHistory: () => {
    set({
      history: [],
      suggestions: [],
      lastSuggestionTime: null,
    });
    console.log('Suggestion history cleared');
  },

  removeSuggestion: (suggestionId) => {
    set((state) => ({
      suggestions: state.suggestions.filter((s) => s.id !== suggestionId),
      history: state.history.filter((s) => s.id !== suggestionId),
    }));
    console.log('Suggestion removed:', suggestionId);
  },

  setConnectionStatus: (status) => {
    set({
      connectionStatus: status,
      isConnected: status === 'connected',
      error: status === 'error' ? 'Connection error' : null,
    });
    console.log('Connection status updated:', status);
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({
      error,
      isLoading: false,
    });
    console.error('Suggestion store error:', error);
  },

  clearError: () => {
    set({ error: null });
  },

  // Handle WebSocket events
  handleSuggestionReceived: (data) => {
    get().addSuggestion(data);
  },

  handleRateLimitExceeded: (data) => {
    get().setError(
      'Rate limit exceeded. Please wait before requesting more suggestions.'
    );
  },

  handleNoFileUploaded: (data) => {
    get().setError(
      'No files uploaded. Please upload context files to receive suggestions.'
    );
  },

  handleNoRecordFound: (data) => {
    get().setError(
      'No meeting record found. Please ensure you are in an active meeting.'
    );
  },

  handleNoFileFound: (data) => {
    get().setError(
      'No context files found. Please upload files to receive suggestions.'
    );
  },

  // Get suggestion by ID
  getSuggestionById: (suggestionId) => {
    const { suggestions, history } = get();
    return [...suggestions, ...history].find((s) => s.id === suggestionId);
  },

  // Get recent suggestions (last 10)
  getRecentSuggestions: (limit = 10) => {
    const { history } = get();
    return history.slice(-limit).reverse();
  },

  // Get suggestions by type
  getSuggestionsByType: (type) => {
    const { suggestions, history } = get();
    return [...suggestions, ...history].filter((s) => s.type === type);
  },

  // Check if has suggestions
  hasSuggestions: () => {
    const { suggestions } = get();
    return suggestions.length > 0;
  },

  // Check if has history
  hasHistory: () => {
    const { history } = get();
    return history.length > 0;
  },

  // Get connection info
  getConnectionInfo: () => {
    const { connectionStatus, isConnected, lastSuggestionTime } = get();
    return {
      status: connectionStatus,
      isConnected,
      lastSuggestionTime,
    };
  },

  // Reset store to initial state
  reset: () => {
    set({
      suggestions: [],
      history: [],
      isConnected: false,
      isLoading: false,
      error: null,
      lastSuggestionTime: null,
      connectionStatus: 'disconnected',
    });
    console.log('Suggestion store reset');
  },

  // Update last suggestion time
  updateLastSuggestionTime: () => {
    set({ lastSuggestionTime: new Date().toISOString() });
  },
});

// Create the store with persistence
export const useSuggestionStore = create(
  persist(suggestionStore, {
    name: 'suggestion-store',
    storage: createJSONStorage(() => chromeStorage),
    // Only persist essential data
    partialize: (state) => ({
      history: state.history.slice(-50), // Keep only last 50 suggestions
      lastSuggestionTime: state.lastSuggestionTime,
    }),
    // Custom serialization for Chrome storage
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => {
      try {
        return JSON.parse(str);
      } catch (error) {
        console.error('Error deserializing suggestion store:', error);
        return {
          suggestions: [],
          history: [],
          isConnected: false,
          isLoading: false,
          error: null,
          lastSuggestionTime: null,
          connectionStatus: 'disconnected',
        };
      }
    },
    // Skip hydration for certain fields
    skipHydration: true,
  })
);

// Export store instance for direct access if needed
export const suggestionStoreInstance = useSuggestionStore;

// Helper functions for external use
export const getSuggestionState = () => useSuggestionStore.getState();
export const getSuggestions = () => useSuggestionStore.getState().suggestions;
export const getSuggestionHistory = () => useSuggestionStore.getState().history;
export const isSuggestionConnected = () =>
  useSuggestionStore.getState().isConnected;
export const getSuggestionError = () => useSuggestionStore.getState().error;
