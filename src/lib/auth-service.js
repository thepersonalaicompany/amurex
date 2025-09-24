import { useAuthStore } from '@/store/authStore';

// Configuration
const AMUREX_CONFIG = {
  BASE_URL_WEB: 'https://app.amurex.ai',
  COOKIE_NAME: 'amurex_session',
};

class AuthService {
  constructor() {
    this.isMonitoring = false;
    this.cookieListener = null;
  }

  /**
   * Get the amurex_session cookie and extract user data
   */
  async getSessionCookie() {
    try {
      const cookie = await chrome.cookies.get({
        url: AMUREX_CONFIG.BASE_URL_WEB,
        name: AMUREX_CONFIG.COOKIE_NAME,
      });

      if (!cookie || !cookie.value) {
        return null;
      }

      // Parse the session data
      const sessionData = JSON.parse(decodeURIComponent(cookie.value));
      return sessionData;
    } catch (error) {
      console.error('Error getting session cookie:', error);
      return null;
    }
  }

  /**
   * Extract user ID from session data
   */
  extractUserId(sessionData) {
    if (!sessionData || !sessionData.user) {
      return null;
    }
    return sessionData.user.id;
  }

  /**
   * Extract user email from session data
   */
  extractUserEmail(sessionData) {
    if (!sessionData || !sessionData.user) {
      return null;
    }
    return sessionData.user.email;
  }

  /**
   * Check if session is valid (not expired)
   */
  isSessionValid(sessionData) {
    if (!sessionData || !sessionData.expires_at) {
      return false;
    }

    const currentTime = Date.now() / 1000; // Convert to seconds
    return sessionData.expires_at > currentTime;
  }

  /**
   * Validate current authentication status
   */
  async validateAuth() {
    const authStore = useAuthStore.getState();

    try {
      authStore.setLoading(true);
      authStore.clearError();

      const sessionData = await this.getSessionCookie();

      if (!sessionData) {
        // No session cookie found
        authStore.setUnauthenticated();
        return false;
      }

      if (!this.isSessionValid(sessionData)) {
        // Session expired
        authStore.setUnauthenticated();
        return false;
      }

      // Valid session found
      const user = {
        id: this.extractUserId(sessionData),
        email: this.extractUserEmail(sessionData),
      };

      authStore.setAuthenticated(user, sessionData);
      return true;
    } catch (error) {
      console.error('Auth validation error:', error);
      authStore.setError('Authentication validation failed');
      authStore.setUnauthenticated();
      return false;
    } finally {
      authStore.setLoading(false);
    }
  }

  /**
   * Start monitoring cookie changes
   */
  startCookieMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    this.cookieListener = (changeInfo) => {
      const cookie = changeInfo.cookie;

      // Check if it's the amurex_session cookie from our domain
      if (
        cookie.name === AMUREX_CONFIG.COOKIE_NAME &&
        cookie.domain.includes('amurex.ai')
      ) {
        const isAuthenticated = !changeInfo.removed && cookie.value;

        if (isAuthenticated) {
          // Cookie was set or updated, validate auth
          this.validateAuth();
        } else {
          // Cookie was removed, set unauthenticated
          const authStore = useAuthStore.getState();
          authStore.setUnauthenticated();
        }
      }
    };

    chrome.cookies.onChanged.addListener(this.cookieListener);
  }

  /**
   * Stop monitoring cookie changes
   */
  stopCookieMonitoring() {
    if (this.cookieListener) {
      chrome.cookies.onChanged.removeListener(this.cookieListener);
      this.cookieListener = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Initialize auth service
   */
  async initialize() {
    // Validate current auth state
    await this.validateAuth();

    // Start monitoring for cookie changes
    this.startCookieMonitoring();
  }

  /**
   * Cleanup auth service
   */
  cleanup() {
    this.stopCookieMonitoring();
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
