// Authentication configuration
export const AUTH_CONFIG = {
  // Web app URLs
  BASE_URL_WEB: 'https://app.amurex.ai',
  SIGNIN_URL: 'https://app.amurex.ai/signin?extension=true',
  SIGNUP_URL: 'https://app.amurex.ai/signup?extension=true',
  SETTINGS_URL: 'https://app.amurex.ai/settings',

  // Cookie configuration
  SESSION_COOKIE_NAME: 'amurex_session',
  SESSION_DOMAIN: 'app.amurex.ai',

  // Session management
  SESSION_CHECK_INTERVAL: 30000, // 30 seconds
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds

  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,

  // Error handling
  NETWORK_TIMEOUT: 10000, // 10 seconds
  COOKIE_CHANGE_DEBOUNCE: 1000, // 1 second

  // Storage keys
  STORAGE_KEYS: {
    AUTH_STATE: 'auth_state',
    USER_DATA: 'user_data',
    LAST_AUTH_CHECK: 'last_auth_check',
    AUTH_ERRORS: 'auth_errors',
  },

  // Message types
  MESSAGE_TYPES: {
    GET_USER_ID: 'getUserId',
    CHECK_AUTH: 'checkAuth',
    GET_AUTH_STATE: 'getAuthState',
    AUTH_STATE_CHANGED: 'authStateChanged',
  },
};

// Backend API endpoints
export const API_ENDPOINTS = {
  BASE_URL: 'https://api.amurex.ai',
  AUTH: {
    VALIDATE: '/auth/validate',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
  },
};

// Error messages
export const AUTH_ERRORS = {
  NETWORK_ERROR:
    'Network connection failed. Please check your internet connection.',
  INVALID_SESSION: 'Your session has expired. Please sign in again.',
  COOKIE_ACCESS_DENIED:
    'Unable to access authentication cookies. Please check extension permissions.',
  SESSION_PARSE_ERROR: 'Invalid session data. Please sign in again.',
  BACKEND_UNAVAILABLE:
    'Authentication service is temporarily unavailable. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

// Success messages
export const AUTH_SUCCESS = {
  LOGIN_SUCCESS: 'Successfully signed in!',
  LOGOUT_SUCCESS: 'Successfully signed out!',
  SESSION_RESTORED: 'Session restored successfully!',
};

// UI configuration
export const AUTH_UI = {
  LOADING_TIMEOUT: 5000, // 5 seconds
  ERROR_DISPLAY_DURATION: 5000, // 5 seconds
  SUCCESS_DISPLAY_DURATION: 3000, // 3 seconds
  ANIMATION_DURATION: 300, // 300ms
};

export default AUTH_CONFIG;
