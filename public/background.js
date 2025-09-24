// Auth configuration
const AUTH_CONFIG = {
  BASE_URL_WEB: 'https://app.amurex.ai',
  COOKIE_NAME: 'amurex_session',
  SESSION_CHECK_INTERVAL: 30000, // 30 seconds
};

// Auth state management
let authState = {
  isAuthenticated: false,
  userId: null,
  userEmail: null,
  lastChecked: null,
};

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getUserId':
      sendResponse({ userId: authState.userId });
      break;
    case 'checkAuth':
      checkAuthentication().then(sendResponse);
      return true; // Keep message channel open for async response
    case 'getAuthState':
      sendResponse(authState);
      break;
    case 'authStateChanged':
      // Notify all tabs about auth state change
      notifyAuthStateChange();
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Get session cookie and extract user data
async function getSessionCookie() {
  try {
    const cookie = await chrome.cookies.get({
      url: AUTH_CONFIG.BASE_URL_WEB,
      name: AUTH_CONFIG.COOKIE_NAME,
    });

    if (!cookie || !cookie.value) {
      return null;
    }

    const sessionData = JSON.parse(decodeURIComponent(cookie.value));
    return sessionData;
  } catch (error) {
    console.error('Error getting session cookie:', error);
    return null;
  }
}

// Extract user ID from session data
function extractUserId(sessionData) {
  if (!sessionData || !sessionData.user) {
    return null;
  }
  return sessionData.user.id;
}

// Extract user email from session data
function extractUserEmail(sessionData) {
  if (!sessionData || !sessionData.user) {
    return null;
  }
  return sessionData.user.email;
}

// Check if session is valid (not expired)
function isSessionValid(sessionData) {
  if (!sessionData || !sessionData.expires_at) {
    return false;
  }

  const currentTime = Date.now() / 1000; // Convert to seconds
  return sessionData.expires_at > currentTime;
}

// Check authentication status
async function checkAuthentication() {
  try {
    const sessionData = await getSessionCookie();

    if (!sessionData) {
      // No session cookie found
      updateAuthState(false, null, null);
      return { isAuthenticated: false, userId: null, userEmail: null };
    }

    if (!isSessionValid(sessionData)) {
      // Session expired
      updateAuthState(false, null, null);
      return { isAuthenticated: false, userId: null, userEmail: null };
    }

    // Valid session found
    const userId = extractUserId(sessionData);
    const userEmail = extractUserEmail(sessionData);

    updateAuthState(true, userId, userEmail);
    return { isAuthenticated: true, userId, userEmail };
  } catch (error) {
    console.error('Auth check error:', error);
    updateAuthState(false, null, null);
    return { isAuthenticated: false, userId: null, userEmail: null };
  }
}

// Update auth state and notify listeners
function updateAuthState(isAuthenticated, userId, userEmail) {
  const previousState = { ...authState };

  authState = {
    isAuthenticated,
    userId,
    userEmail,
    lastChecked: Date.now(),
  };

  // Notify if auth state changed
  if (previousState.isAuthenticated !== isAuthenticated) {
    notifyAuthStateChange();
  }
}

// Notify all tabs about auth state change
function notifyAuthStateChange() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          action: 'authStateChanged',
          authState: authState,
        })
        .catch(() => {
          // Ignore errors for tabs that don't have content script
        });
    });
  });
}

// Monitor cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  const cookie = changeInfo.cookie;

  // Check if it's the amurex_session cookie from our domain
  if (
    cookie.name === AUTH_CONFIG.COOKIE_NAME &&
    cookie.domain.includes('amurex.ai')
  ) {
    // Debounce cookie changes to avoid excessive checks
    clearTimeout(cookieChangeTimeout);
    cookieChangeTimeout = setTimeout(() => {
      checkAuthentication();
    }, 1000);
  }
});

// Periodic auth check
setInterval(() => {
  checkAuthentication();
}, AUTH_CONFIG.SESSION_CHECK_INTERVAL);

// Initialize auth state on startup
chrome.runtime.onStartup.addListener(() => {
  checkAuthentication();
});

chrome.runtime.onInstalled.addListener(() => {
  checkAuthentication();
});

// Side panel functionality
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Variable for cookie change debouncing
let cookieChangeTimeout;
