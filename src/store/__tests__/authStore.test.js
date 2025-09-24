import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../authStore';

// Mock Chrome storage API
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
};

// Mock chrome global
global.chrome = mockChromeStorage;

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user.id).toBe(null);
      expect(state.user.email).toBe(null);
      expect(state.user.session).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.lastChecked).toBe(null);
      // isInitialized is set to true after store creation
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('Authentication Actions', () => {
    it('should set authenticated state correctly', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        session: { access_token: 'token123' },
      };

      useAuthStore.getState().setAuthenticated(userData);
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user.id).toBe('user123');
      expect(state.user.email).toBe('test@example.com');
      expect(state.user.session).toEqual({ access_token: 'token123' });
      expect(state.error).toBe(null);
      expect(state.lastChecked).toBeGreaterThan(0);
    });

    it('should set unauthenticated state correctly', () => {
      // First set authenticated state
      useAuthStore.getState().setAuthenticated({
        id: 'user123',
        email: 'test@example.com',
        session: { access_token: 'token123' },
      });

      // Then set unauthenticated
      useAuthStore.getState().setUnauthenticated();
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user.id).toBe(null);
      expect(state.user.email).toBe(null);
      expect(state.user.session).toBe(null);
      expect(state.error).toBe(null);
      expect(state.lastChecked).toBeGreaterThan(0);
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set and clear error state', () => {
      const errorMessage = 'Authentication failed';

      useAuthStore.getState().setError(errorMessage);
      const state = useAuthStore.getState();

      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);

      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBe(null);
    });
  });

  describe('Session Validation', () => {
    it('should return false for invalid session when not authenticated', () => {
      const isValid = useAuthStore.getState().isSessionValid();
      expect(isValid).toBe(false);
    });

    it('should return true for valid session', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        session: { access_token: 'token123' },
      };

      useAuthStore.getState().setAuthenticated(userData);
      const isValid = useAuthStore.getState().isSessionValid();

      expect(isValid).toBe(true);
    });

    it('should return false for expired session', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        session: { access_token: 'token123' },
      };

      useAuthStore.getState().setAuthenticated(userData);

      // Mock expired session by setting lastChecked to 8 days ago
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      useAuthStore.setState({ lastChecked: eightDaysAgo });

      const isValid = useAuthStore.getState().isSessionValid();
      expect(isValid).toBe(false);

      // Should auto-logout on expired session
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('should return correct user ID when authenticated', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        session: { access_token: 'token123' },
      };

      useAuthStore.getState().setAuthenticated(userData);

      expect(useAuthStore.getState().getUserId()).toBe('user123');
      expect(useAuthStore.getState().getUserEmail()).toBe('test@example.com');
      expect(useAuthStore.getState().getSession()).toEqual({
        access_token: 'token123',
      });
    });

    it('should return null when not authenticated', () => {
      expect(useAuthStore.getState().getUserId()).toBe(null);
      expect(useAuthStore.getState().getUserEmail()).toBe(null);
      expect(useAuthStore.getState().getSession()).toBe(null);
    });

    it('should correctly identify reauth needs', () => {
      // Not authenticated
      expect(useAuthStore.getState().needsReauth()).toBe(true);

      // Authenticated with valid session
      useAuthStore.getState().setAuthenticated({
        id: 'user123',
        email: 'test@example.com',
        session: { access_token: 'token123' },
      });
      expect(useAuthStore.getState().needsReauth()).toBe(false);

      // Authenticated with expired session
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      useAuthStore.setState({ lastChecked: eightDaysAgo });
      expect(useAuthStore.getState().needsReauth()).toBe(true);
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state', () => {
      // Set some state
      useAuthStore.getState().setAuthenticated({
        id: 'user123',
        email: 'test@example.com',
        session: { access_token: 'token123' },
      });
      useAuthStore.getState().setError('Some error');

      // Reset
      useAuthStore.getState().reset();
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user.id).toBe(null);
      expect(state.user.email).toBe(null);
      expect(state.user.session).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.lastChecked).toBe(null);
      expect(state.isInitialized).toBe(true); // Reset keeps initialized as true
    });
  });
});
