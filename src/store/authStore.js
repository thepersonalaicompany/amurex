import authService from '@/lib/auth-service';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Chrome storage adapter for Zustand
const chromeStorage = {
  getItem: async (name) => {
    try {
      const result = await chrome.storage.local.get(name);
      return result[name] || null;
    } catch (error) {
      console.error('Error getting item from Chrome storage:', error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await chrome.storage.local.set({ [name]: value });
    } catch (error) {
      console.error('Error setting item in Chrome storage:', error);
    }
  },
  removeItem: async (name) => {
    try {
      await chrome.storage.local.remove(name);
    } catch (error) {
      console.error('Error removing item from Chrome storage:', error);
    }
  },
};

// Auth store state interface
const authStore = (set, get) => ({
  // State
  isAuthenticated: false,
  user: {
    id: null,
    email: null,
    session: null,
  },
  isLoading: false,
  error: null,
  lastChecked: null,
  isInitialized: false,

  // Actions
  setAuthenticated: (userData) => {
    set({
      isAuthenticated: true,
      user: {
        id: userData.id,
        email: userData.email,
        session: userData.session,
      },
      error: null,
      lastChecked: Date.now(),
    });
  },

  setUnauthenticated: () => {
    set({
      isAuthenticated: false,
      user: {
        id: null,
        email: null,
        session: null,
      },
      error: null,
      lastChecked: Date.now(),
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({
      error,
      isLoading: false,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  setInitialized: (initialized) => {
    set({ isInitialized: initialized });
  },

  // Check if session is still valid (not expired)
  isSessionValid: () => {
    const { user, lastChecked } = get();

    if (!user.session || !lastChecked) {
      return false;
    }

    // Check if session has expired (7 days from last check)
    const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const isExpired = Date.now() - lastChecked > SESSION_DURATION;

    if (isExpired) {
      // Auto-logout on session expiry
      get().setUnauthenticated();
      return false;
    }

    return true;
  },

  // Get user ID for API calls
  getUserId: () => {
    const { user, isAuthenticated } = get();
    return isAuthenticated ? user.id : null;
  },

  // Get user email
  getUserEmail: () => {
    const { user, isAuthenticated } = get();
    return isAuthenticated ? user.email : null;
  },

  // Get session data
  getSession: () => {
    const { user, isAuthenticated } = get();
    return isAuthenticated ? user.session : null;
  },

  // Check if user needs to re-authenticate
  needsReauth: () => {
    const { isAuthenticated, isSessionValid } = get();
    return !isAuthenticated || !isSessionValid();
  },

  // Reset store to initial state
  reset: () => {
    set({
      isAuthenticated: false,
      user: {
        id: null,
        email: null,
        session: null,
      },
      isLoading: false,
      error: null,
      lastChecked: null,
      isInitialized: true, // Keep initialized as true
    });
  },

  // Update last checked timestamp
  updateLastChecked: () => {
    set({ lastChecked: Date.now() });
  },

  // Validate current auth state using auth service
  validateAuth: async () => {
    return await authService.validateAuth();
  },

  // Initialize auth service
  initializeAuth: async () => {
    await authService.initialize();
  },
});

// Create the store with persistence
export const useAuthStore = create(
  persist(authStore, {
    name: 'auth-store',
    storage: createJSONStorage(() => chromeStorage),
    // Only persist essential auth data
    partialize: (state) => ({
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      lastChecked: state.lastChecked,
    }),
    // Custom serialization for Chrome storage
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => {
      try {
        return JSON.parse(str);
      } catch (error) {
        console.error('Error deserializing auth store:', error);
        return {
          isAuthenticated: false,
          user: { id: null, email: null, session: null },
          lastChecked: null,
        };
      }
    },
    // Skip hydration for certain fields
    skipHydration: true,
  })
);

// Initialize the store after creation
useAuthStore.getState().setInitialized(true);

// Export store instance for direct access if needed
export const authStoreInstance = useAuthStore;

// Helper functions for external use
export const getAuthState = () => useAuthStore.getState();
export const getUserId = () => useAuthStore.getState().getUserId();
export const getUserEmail = () => useAuthStore.getState().getUserEmail();
export const getSession = () => useAuthStore.getState().getSession();
export const isAuthenticated = () => useAuthStore.getState().isAuthenticated;
export const needsReauth = () => useAuthStore.getState().needsReauth();
