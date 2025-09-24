import { AUTH_CONFIG } from '@/lib/auth-config';

class StorageService {
  constructor() {
    this.storage = chrome.storage.local;
  }

  /**
   * Store auth state
   */
  async setAuthState(authState) {
    try {
      await this.storage.set({
        [AUTH_CONFIG.STORAGE_KEYS.AUTH_STATE]: {
          ...authState,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Error storing auth state:', error);
      throw error;
    }
  }

  /**
   * Get auth state
   */
  async getAuthState() {
    try {
      const result = await this.storage.get(
        AUTH_CONFIG.STORAGE_KEYS.AUTH_STATE
      );
      return result[AUTH_CONFIG.STORAGE_KEYS.AUTH_STATE] || null;
    } catch (error) {
      console.error('Error getting auth state:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  async setUserData(userData) {
    try {
      await this.storage.set({
        [AUTH_CONFIG.STORAGE_KEYS.USER_DATA]: {
          ...userData,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  }

  /**
   * Get user data
   */
  async getUserData() {
    try {
      const result = await this.storage.get(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
      return result[AUTH_CONFIG.STORAGE_KEYS.USER_DATA] || null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Store last auth check timestamp
   */
  async setLastAuthCheck(timestamp = Date.now()) {
    try {
      await this.storage.set({
        [AUTH_CONFIG.STORAGE_KEYS.LAST_AUTH_CHECK]: timestamp,
      });
    } catch (error) {
      console.error('Error storing last auth check:', error);
      throw error;
    }
  }

  /**
   * Get last auth check timestamp
   */
  async getLastAuthCheck() {
    try {
      const result = await this.storage.get(
        AUTH_CONFIG.STORAGE_KEYS.LAST_AUTH_CHECK
      );
      return result[AUTH_CONFIG.STORAGE_KEYS.LAST_AUTH_CHECK] || null;
    } catch (error) {
      console.error('Error getting last auth check:', error);
      return null;
    }
  }

  /**
   * Store auth error
   */
  async addAuthError(error) {
    try {
      const errorData = {
        message: error.message || 'Unknown error',
        timestamp: Date.now(),
        stack: error.stack,
      };

      const result = await this.storage.get(
        AUTH_CONFIG.STORAGE_KEYS.AUTH_ERRORS
      );
      const errors = result[AUTH_CONFIG.STORAGE_KEYS.AUTH_ERRORS] || [];

      // Keep only last 10 errors
      const updatedErrors = [errorData, ...errors].slice(0, 10);

      await this.storage.set({
        [AUTH_CONFIG.STORAGE_KEYS.AUTH_ERRORS]: updatedErrors,
      });
    } catch (error) {
      console.error('Error storing auth error:', error);
    }
  }

  /**
   * Get auth errors
   */
  async getAuthErrors() {
    try {
      const result = await this.storage.get(
        AUTH_CONFIG.STORAGE_KEYS.AUTH_ERRORS
      );
      return result[AUTH_CONFIG.STORAGE_KEYS.AUTH_ERRORS] || [];
    } catch (error) {
      console.error('Error getting auth errors:', error);
      return [];
    }
  }

  /**
   * Clear all auth data
   */
  async clearAuthData() {
    try {
      await this.storage.remove([
        AUTH_CONFIG.STORAGE_KEYS.AUTH_STATE,
        AUTH_CONFIG.STORAGE_KEYS.USER_DATA,
        AUTH_CONFIG.STORAGE_KEYS.LAST_AUTH_CHECK,
        AUTH_CONFIG.STORAGE_KEYS.AUTH_ERRORS,
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  }

  /**
   * Clear auth errors
   */
  async clearAuthErrors() {
    try {
      await this.storage.remove(AUTH_CONFIG.STORAGE_KEYS.AUTH_ERRORS);
    } catch (error) {
      console.error('Error clearing auth errors:', error);
      throw error;
    }
  }

  /**
   * Get storage usage info
   */
  async getStorageInfo() {
    try {
      const result = await this.storage.get(null);
      const totalSize = JSON.stringify(result).length;

      return {
        totalSize,
        itemCount: Object.keys(result).length,
        authStateSize: result[AUTH_CONFIG.STORAGE_KEYS.AUTH_STATE]
          ? JSON.stringify(result[AUTH_CONFIG.STORAGE_KEYS.AUTH_STATE]).length
          : 0,
        userDataSize: result[AUTH_CONFIG.STORAGE_KEYS.USER_DATA]
          ? JSON.stringify(result[AUTH_CONFIG.STORAGE_KEYS.USER_DATA]).length
          : 0,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }

  /**
   * Get transcript data from storage
   * Maintains backward compatibility with existing transcript structure
   */
  async getTranscript() {
    try {
      const result = await this.storage.get(['transcript']);
      return result.transcript || null;
    } catch (error) {
      console.error('Error getting transcript:', error);
      return null;
    }
  }

  /**
   * Store transcript data
   */
  async setTranscript(transcript) {
    try {
      await this.storage.set({
        transcript: {
          data: transcript,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Error storing transcript:', error);
      throw error;
    }
  }

  /**
   * Get meeting ID from storage
   */
  async getMeetingId() {
    try {
      const result = await this.storage.get(['mId']);
      return result.mId || null;
    } catch (error) {
      console.error('Error getting meeting ID:', error);
      return null;
    }
  }

  /**
   * Store meeting ID
   */
  async setMeetingId(meetingId) {
    try {
      await this.storage.set({ mId: meetingId });
    } catch (error) {
      console.error('Error storing meeting ID:', error);
      throw error;
    }
  }

  /**
   * Get summary data from storage
   */
  async getSummary() {
    try {
      const result = await this.storage.get(['summary']);
      return result.summary || null;
    } catch (error) {
      console.error('Error getting summary:', error);
      return null;
    }
  }

  /**
   * Store summary data
   */
  async setSummary(summaryData) {
    try {
      await this.storage.set({
        summary: {
          ...summaryData,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Error storing summary:', error);
      throw error;
    }
  }

  /**
   * Clear summary data
   */
  async clearSummary() {
    try {
      await this.storage.remove(['summary']);
    } catch (error) {
      console.error('Error clearing summary:', error);
      throw error;
    }
  }

  /**
   * Get meeting metadata (title, start time, etc.)
   */
  async getMeetingMetadata() {
    try {
      const result = await this.storage.get([
        'meetingTitle',
        'meetingStartTimeStamp',
      ]);
      return {
        title: result.meetingTitle || null,
        startTime: result.meetingStartTimeStamp || null,
      };
    } catch (error) {
      console.error('Error getting meeting metadata:', error);
      return { title: null, startTime: null };
    }
  }

  /**
   * Store meeting metadata
   */
  async setMeetingMetadata(metadata) {
    try {
      const dataToStore = {};
      if (metadata.title) dataToStore.meetingTitle = metadata.title;
      if (metadata.startTime)
        dataToStore.meetingStartTimeStamp = metadata.startTime;

      if (Object.keys(dataToStore).length > 0) {
        await this.storage.set(dataToStore);
      }
    } catch (error) {
      console.error('Error storing meeting metadata:', error);
      throw error;
    }
  }

  /**
   * Get meeting status from storage
   */
  async getMeetingStatus() {
    try {
      const result = await this.storage.get(['meetingStatus']);
      return result.meetingStatus || 'unknown';
    } catch (error) {
      console.error('Error getting meeting status:', error);
      return 'unknown';
    }
  }

  /**
   * Store meeting status
   */
  async setMeetingStatus(status) {
    try {
      await this.storage.set({ meetingStatus: status });
    } catch (error) {
      console.error('Error storing meeting status:', error);
    }
  }

  /**
   * Clear meeting data (transcript, summary, metadata)
   */
  async clearMeetingData() {
    try {
      await this.storage.remove([
        'transcript',
        'summary',
        'mId',
        'meetingTitle',
        'meetingStartTimeStamp',
        'meetingStatus',
      ]);
    } catch (error) {
      console.error('Error clearing meeting data:', error);
    }
  }

  /**
   * Get platform information
   */
  async getPlatform() {
    try {
      const result = await this.storage.get(['platform']);
      return result.platform || 'gmeet';
    } catch (error) {
      console.error('Error getting platform:', error);
      return 'gmeet';
    }
  }

  /**
   * Set platform information
   */
  async setPlatform(platform) {
    try {
      await this.storage.set({ platform });
    } catch (error) {
      console.error('Error setting platform:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  async cleanup() {
    try {
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      // Clean up old auth errors
      const errors = await this.getAuthErrors();
      const recentErrors = errors.filter(
        (error) => now - error.timestamp < maxAge
      );

      if (recentErrors.length !== errors.length) {
        await this.storage.set({
          [AUTH_CONFIG.STORAGE_KEYS.AUTH_ERRORS]: recentErrors,
        });
      }

      // Clean up old auth state if it's too old
      const authState = await this.getAuthState();
      if (authState && now - authState.timestamp > maxAge) {
        await this.clearAuthData();
      }

      // Clean up old summary data
      const summary = await this.getSummary();
      if (summary && now - summary.timestamp > maxAge) {
        await this.clearSummary();
      }

      // Clean up old transcript data
      const transcript = await this.getTranscript();
      if (transcript && now - transcript.timestamp > maxAge) {
        await this.storage.remove(['transcript']);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

export default storageService;
