// Get the config from the window object
const AMUREX_CONFIG = window.AMUREX_CONFIG || {
  BASE_URL_BACKEND: "https://api.amurex.ai",
  BASE_URL_WEB: "https://app.amurex.ai",
  ANALYTICS_ENABLED: true
};

// Log the config for debugging
console.log("API module loaded with config:", AMUREX_CONFIG);

// Function to get the user ID
export const getUserId = async () => {
  try {
    console.log("Getting user ID...");
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "getUserId" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error in getUserId:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log("getUserId response:", response);
            resolve(response);
          }
        }
      );
    });

    return response.userId;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
};

// Function to get the meeting ID
export const getMeetingId = async () => {
  try {
    const result = await chrome.storage.local.get(['mId']);
    return result.mId || 'unknown';
  } catch (error) {
    console.error("Error getting meeting ID:", error);
    return 'unknown';
  }
};

// Function to get the platform
export const getPlatform = async () => {
  try {
    const result = await chrome.storage.local.get(['platform']);
    return result.platform || 'unknown';
  } catch (error) {
    console.error("Error getting platform:", error);
    return 'unknown';
  }
};

/**
 * Track an event for analytics
 * @param {string} eventName - The name of the event to track
 * @param {Object} properties - Additional properties to track with the event
 */
export const trackEvent = (eventName, properties = {}) => {
  console.log(`Tracking event: ${eventName}`, properties);
  
  // In a real implementation, this would send the event to an analytics service
  try {
    if (window.chrome && window.chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'trackEvent',
        eventName,
        properties
      });
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

// Function to fetch the late meeting summary
export const fetchLateSummary = async (meetingId) => {
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "fetch_late_summary", meetingId },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        }
      );
    });

    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.error || "Failed to fetch late summary");
    }
  } catch (error) {
    console.error("Error fetching late summary:", error);
    throw error;
  }
};

// Function to upload a file
export const uploadFile = async (file) => {
  try {
    const meetingId = await getMeetingId();
    const userId = await getUserId();
    
    if (!meetingId || !userId) {
      throw new Error("Meeting ID or User ID not available");
    }

    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(
      `${AMUREX_CONFIG.BASE_URL_BACKEND}/upload_meeting_file/${meetingId}/${userId}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Download the transcript of the current meeting
 */
export const downloadTranscript = () => {
  console.log('Downloading transcript');
  
  // In a real implementation, this would fetch the transcript from an API
  // and trigger a download
  try {
    if (window.chrome && window.chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'download_transcript'
      });
    }
  } catch (error) {
    console.error('Error downloading transcript:', error);
  }
};

/**
 * Check if a file has been uploaded
 * @returns {boolean} - Whether a file has been uploaded
 */
export const checkFileUploadStatus = () => {
  // In a real implementation, this would check with the backend
  // For now, we'll check localStorage
  try {
    return localStorage.getItem('fileUploaded') === 'true';
  } catch (error) {
    console.error('Error checking file upload status:', error);
    return false;
  }
};

/**
 * Check if the user is authenticated
 * @returns {Promise<boolean>} - Whether the user is authenticated
 */
export const checkAuthentication = async () => {
  console.log('Checking authentication status');
  
  // In a real implementation, this would check with the backend
  try {
    if (window.chrome && window.chrome.runtime) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'checkAuthentication' },
          (response) => {
            console.log('Authentication response:', response);
            resolve(response && response.isAuthenticated);
          }
        );
      });
    }
    
    // Fallback for development environment
    return Promise.resolve(true);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Log in the user
 * @param {string} email - The user's email
 * @param {string} password - The user's password
 * @returns {Promise<Object>} - The login response
 */
export const login = async (email, password) => {
  console.log('Logging in user:', email);
  
  // In a real implementation, this would send the credentials to an API
  try {
    if (window.chrome && window.chrome.runtime) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { 
            action: 'login',
            email,
            password
          },
          (response) => {
            if (response && response.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || 'Login failed'));
            }
          }
        );
      });
    }
    
    // Fallback for development environment
    return Promise.resolve({ success: true, user: { email } });
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

/**
 * Log out the user
 * @returns {Promise<boolean>} - Whether the logout was successful
 */
export const logout = async () => {
  console.log('Logging out user');
  
  // In a real implementation, this would send a request to an API
  try {
    if (window.chrome && window.chrome.runtime) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'logout' },
          (response) => {
            resolve(response && response.success);
          }
        );
      });
    }
    
    // Fallback for development environment
    return Promise.resolve(true);
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
}; 