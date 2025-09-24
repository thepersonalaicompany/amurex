import { AMUREX_CONFIG } from './config.js';

/**
 * Summary Service - Handles API communication for summary generation
 * Maintains backward compatibility with existing /end_meeting endpoint
 */

class SummaryService {
  constructor() {
    this.baseUrl = AMUREX_CONFIG.BASE_URL_BACKEND;
    this.endpoint = '/end_meeting';
  }

  /**
   * Generate summary and action items from transcript
   * @param {string} transcript - Formatted transcript text
   * @param {string} meetingId - Meeting identifier
   * @param {string} userId - User identifier
   * @param {number} retryCount - Current retry attempt (internal use)
   * @returns {Promise<{notes_content: string, action_items: string}>}
   */
  async generateSummary(transcript, meetingId, userId, retryCount = 0) {
    try {
      const requestBody = {
        transcript,
        meeting_id: meetingId,
        user_id: userId,
      };

      console.log('Generating summary for meeting:', meetingId);

      const response = await fetch(`${this.baseUrl}${this.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // console.log('API Response Status:', response.status, response.statusText);

      if (!response.ok) {
        // Clone the response to read error details
        const responseClone = response.clone();
        let errorDetails = '';
        let userFriendlyMessage = '';

        try {
          const errorData = await responseClone.json();
          errorDetails = JSON.stringify(errorData);

          // Handle specific error types
          if (response.status === 429) {
            // Retry quota errors with exponential backoff
            if (retryCount < 3) {
              const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
              console.log(
                `Quota exceeded, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              return this.generateSummary(
                transcript,
                meetingId,
                userId,
                retryCount + 1
              );
            }
            userFriendlyMessage =
              'API quota exceeded. Please try again in a few minutes.';
          } else if (response.status === 500) {
            userFriendlyMessage = 'Server error. Please try again later.';
          } else if (response.status === 401) {
            userFriendlyMessage =
              'Authentication failed. Please sign in again.';
          } else {
            userFriendlyMessage = `Request failed with status ${response.status}`;
          }
        } catch (e) {
          // If JSON parsing fails, try to get text
          try {
            const textResponse = response.clone();
            errorDetails = await textResponse.text();
            userFriendlyMessage = `Request failed with status ${response.status}`;
          } catch (textError) {
            errorDetails = 'Unable to read error response';
            userFriendlyMessage = `Request failed with status ${response.status}`;
          }
        }

        // console.error('API Error Details:', errorDetails);
        throw new Error(userFriendlyMessage);
      }

      const data = await response.json();
      // console.log('API Response Data:', data);

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from API');
      }

      return {
        notes_content: data.notes_content || '',
        action_items: data.action_items || '',
      };
    } catch (error) {
      console.error('Summary generation failed:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  /**
   * Format transcript data for API consumption
   * Maintains compatibility with Google Meet transcript structure
   * @param {Array} transcriptEntries - Array of transcript entries
   * @returns {string} - Formatted transcript string
   */
  formatTranscriptForAPI(transcriptEntries) {
    // console.log('Formatting transcript for API:', {
    //   isArray: Array.isArray(transcriptEntries),
    //   length: transcriptEntries ? transcriptEntries.length : 0,
    //   firstEntry:
    //     transcriptEntries && transcriptEntries[0] ? transcriptEntries[0] : null,
    // });

    if (!Array.isArray(transcriptEntries) || transcriptEntries.length === 0) {
      throw new Error('No transcript data available');
    }

    try {
      // Format transcript entries in the expected format
      const formattedTranscript = transcriptEntries
        .map((entry) => {
          // console.log('Processing transcript entry:', entry);
          // Handle different transcript entry structures
          if (entry.personName && entry.timeStamp && entry.personTranscript) {
            // Google Meet format
            return `${entry.personName} (${entry.timeStamp})\n${entry.personTranscript}\n`;
          } else if (entry.speaker && entry.timestamp && entry.message) {
            // Alternative format
            return `${entry.speaker} (${entry.timestamp})\n${entry.message}\n`;
          } else if (entry.speaker && entry.message) {
            // Simple format
            return `${entry.speaker}: ${entry.message}\n`;
          }
          return '';
        })
        .filter((entry) => entry.trim() !== '')
        .join('');

      // console.log(
      //   'Formatted transcript:',
      //   formattedTranscript.substring(0, 200) + '...'
      // );

      if (!formattedTranscript.trim()) {
        throw new Error('No valid transcript content found');
      }

      return formattedTranscript;
    } catch (error) {
      console.error('Transcript formatting failed:', error);
      throw new Error(`Failed to format transcript: ${error.message}`);
    }
  }

  /**
   * Validate API response structure
   * @param {Object} response - API response object
   * @returns {boolean} - Whether response is valid
   */
  validateResponse(response) {
    return (
      response &&
      typeof response === 'object' &&
      (typeof response.notes_content === 'string' ||
        response.notes_content === null) &&
      (typeof response.action_items === 'string' ||
        response.action_items === null)
    );
  }

  /**
   * Get meeting ID from various sources
   * @returns {Promise<string>} - Meeting ID
   */
  async getMeetingId() {
    try {
      // Try to get from Chrome storage first
      const result = await chrome.storage.local.get(['mId']);
      if (result.mId) {
        return result.mId;
      }

      // Fallback to URL parameter
      if (window.location && window.location.href.includes('meetingId=')) {
        return window.location.href.split('meetingId=')[1].split('&')[0];
      }

      // Generate a temporary meeting ID if none exists
      const tempMeetingId = this.generateTempMeetingId();
      console.warn('No meeting ID found, using temporary ID:', tempMeetingId);
      return tempMeetingId;
    } catch (error) {
      console.error('Failed to get meeting ID:', error);
      return this.generateTempMeetingId();
    }
  }

  /**
   * Generate a temporary meeting ID
   * @returns {string} - Temporary meeting ID
   */
  generateTempMeetingId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `temp_meet_${timestamp}_${random}`;
  }

  /**
   * Get user ID from background script
   * @returns {Promise<string>} - User ID
   */
  async getUserId() {
    try {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getUserId' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.userId) {
            resolve(response.userId);
          } else {
            reject(new Error('No user ID received from background script'));
          }
        });
      });
    } catch (error) {
      console.error('Failed to get user ID:', error);
      throw new Error(`Failed to get user ID: ${error.message}`);
    }
  }
}

// Export singleton instance
export const summaryService = new SummaryService();
export default summaryService;
