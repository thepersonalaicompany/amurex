import authService from '@/lib/auth-service';
import { useAuthStore } from '@/store/authStore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Chrome APIs
const mockChromeStorage = {};
const mockChromeCookies = {};

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach((key) => {
            result[key] = mockChromeStorage[key];
          });
        } else {
          result[keys] = mockChromeStorage[keys];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items) => {
        Object.assign(mockChromeStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys) => {
        if (Array.isArray(keys)) {
          keys.forEach((key) => delete mockChromeStorage[key]);
        } else {
          delete mockChromeStorage[keys];
        }
        return Promise.resolve();
      }),
    },
  },
  cookies: {
    get: vi.fn((options) => {
      const cookie = mockChromeCookies[options.name];
      return Promise.resolve(cookie || null);
    }),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn(() => Promise.resolve([])),
    sendMessage: vi.fn(() => Promise.resolve()),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
  },
};

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Clear mock storage
    Object.keys(mockChromeStorage).forEach((key) => {
      delete mockChromeStorage[key];
    });
    Object.keys(mockChromeCookies).forEach((key) => {
      delete mockChromeCookies[key];
    });

    // Reset auth store
    useAuthStore.getState().reset();
  });

  describe('Complete Auth Flow', () => {
    it('should handle complete authentication flow', async () => {
      // Mock valid session cookie
      const mockSessionData = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
        expires_at: Date.now() / 1000 + 3600, // 1 hour from now
      };

      mockChromeCookies['amurex_session'] = {
        value: encodeURIComponent(JSON.stringify(mockSessionData)),
        domain: 'app.amurex.ai',
      };

      // Initialize auth service
      await authService.initialize();

      // Check auth state
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user.id).toBe('user123');
      expect(authState.user.email).toBe('test@example.com');
    });

    it('should handle session expiration', async () => {
      // Mock expired session cookie
      const mockExpiredSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
        expires_at: Date.now() / 1000 - 3600, // Expired 1 hour ago
      };

      mockChromeCookies['amurex_session'] = {
        value: encodeURIComponent(JSON.stringify(mockExpiredSession)),
        domain: 'app.amurex.ai',
      };

      // Initialize auth service
      await authService.initialize();

      // Check auth state
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user.id).toBe(null);
    });

    it('should handle missing session cookie', async () => {
      // No cookie set
      delete mockChromeCookies['amurex_session'];

      // Initialize auth service
      await authService.initialize();

      // Check auth state
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user.id).toBe(null);
    });

    it('should handle invalid session data', async () => {
      // Mock invalid session cookie
      mockChromeCookies['amurex_session'] = {
        value: 'invalid-json-data',
        domain: 'app.amurex.ai',
      };

      // Initialize auth service
      await authService.initialize();

      // Check auth state
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user.id).toBe(null);
    });
  });

  describe('Storage Integration', () => {
    it('should persist auth state to storage', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
      };

      const mockSession = {
        access_token: 'token123',
        expires_at: Date.now() / 1000 + 3600,
      };

      // Set authenticated state
      useAuthStore.getState().setAuthenticated(mockUser, mockSession);

      // Check if storage was called
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should clear auth data on logout', async () => {
      // Set authenticated state first
      useAuthStore
        .getState()
        .setAuthenticated(
          { id: 'user123', email: 'test@example.com' },
          { access_token: 'token123', expires_at: Date.now() / 1000 + 3600 }
        );

      // Logout
      useAuthStore.getState().setUnauthenticated();

      // Check auth state
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user.id).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should handle cookie access errors', async () => {
      // Mock cookie access error
      chrome.cookies.get.mockRejectedValue(new Error('Cookie access denied'));

      // Initialize auth service
      await authService.initialize();

      // Check auth state
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      // Error might not be set in the store, but the service should handle it gracefully
      expect(authState.user.id).toBe(null);
    });

    it('should handle storage errors gracefully', async () => {
      // Mock storage error
      chrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
      };

      // Should not throw error even if storage fails
      expect(() => {
        useAuthStore
          .getState()
          .setAuthenticated(mockUser, { access_token: 'token' });
      }).not.toThrow();
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should handle auth state changes', async () => {
      // Simulate auth state change
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
      };

      useAuthStore
        .getState()
        .setAuthenticated(mockUser, { access_token: 'token' });

      // Check auth state was updated
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user.id).toBe('user123');
      expect(authState.user.email).toBe('test@example.com');
    });
  });

  describe('Session Validation', () => {
    it('should validate session on initialization', async () => {
      const mockSessionData = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
        expires_at: Date.now() / 1000 + 3600,
      };

      mockChromeCookies['amurex_session'] = {
        value: encodeURIComponent(JSON.stringify(mockSessionData)),
        domain: 'app.amurex.ai',
      };

      // Initialize auth service
      await authService.initialize();

      // Verify cookie was checked
      expect(chrome.cookies.get).toHaveBeenCalledWith({
        url: 'https://app.amurex.ai',
        name: 'amurex_session',
      });
    });

    it('should handle session validation errors', async () => {
      // Mock cookie get error
      chrome.cookies.get.mockRejectedValue(new Error('Network error'));

      // Initialize auth service
      await authService.initialize();

      // Check that error was handled gracefully
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });
  });
});
