// Analytics service for tracking user actions
// Based on the previous extension's analytics implementation

import { AMUREX_CONFIG } from './config.js';

class AnalyticsService {
  constructor() {
    this.baseUrl = AMUREX_CONFIG.BASE_URL_BACKEND;
    this.isEnabled = AMUREX_CONFIG.ANALYTICS_ENABLED || true;
  }

  /**
   * Track an analytics event
   * @param {string} eventType - The type of event to track
   * @param {Object} metadata - Additional metadata for the event
   * @param {string} meetingId - Meeting ID (optional)
   */
  async trackEvent(eventType, metadata = {}, meetingId = null) {
    if (!this.isEnabled) {
      console.log('Analytics disabled, skipping event:', eventType);
      return;
    }

    try {
      // Get user ID from auth store or Chrome storage
      const userId = await this.getUserId();
      if (!userId) {
        console.warn('No user ID available for analytics tracking');
        return;
      }

      // Get meeting ID if not provided
      if (!meetingId) {
        const result = await chrome.storage.local.get(['mId']);
        meetingId = result.mId || 'unknown';
      }

      const payload = {
        uuid: userId,
        meeting_id: meetingId,
        event_type: eventType,
        metadata: metadata,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${this.baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Analytics tracking failed: ${response.statusText}`);
      }

      console.log('Analytics event tracked:', eventType, payload);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }

  /**
   * Get user ID from various sources
   */
  async getUserId() {
    try {
      // Try to get from Chrome runtime message
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getUserId' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response?.userId);
          }
        });
      });
    } catch (error) {
      console.warn('Could not get user ID from runtime:', error);
      return null;
    }
  }

  // Specific event tracking methods based on previous extension

  /**
   * Track when side panel is opened
   */
  async trackOpenSidepanel() {
    await this.trackEvent('open_sidepanel');
  }

  /**
   * Track when side panel is closed
   */
  async trackCloseSidebar() {
    await this.trackEvent('close_sidebar');
  }

  /**
   * Track when content is copied to clipboard
   */
  async trackCopyToClipboard(contentType = 'general') {
    await this.trackEvent('copy_to_clipboard', { content_type: contentType });
  }

  /**
   * Track when transcript is downloaded
   */
  async trackDownloadTranscript() {
    await this.trackEvent('download_transcript');
  }

  /**
   * Track when emails are sent
   */
  async trackSendEmails(recipientCount = 0) {
    await this.trackEvent('send_emails', { recipient_count: recipientCount });
  }

  /**
   * Track when previous transcripts are viewed
   */
  async trackViewPreviousTranscripts() {
    await this.trackEvent('view_previous_transcripts');
  }

  /**
   * Track when content is shared to apps
   */
  async trackShareToApps(shareType = 'general') {
    await this.trackEvent('share_to_apps', { share_type: shareType });
  }

  /**
   * Track when small copy button is used
   */
  async trackCopyToClipboardSmallButton() {
    await this.trackEvent('copy_to_clipboard_small_button');
  }

  /**
   * Track file upload events
   */
  async trackFileUpload(fileName, fileSize, success = true) {
    await this.trackEvent('file_upload', {
      file_name: fileName,
      file_size: fileSize,
      success: success,
    });
  }

  /**
   * Track WebSocket connection events
   */
  async trackWebSocketEvent(eventType, connectionStatus) {
    await this.trackEvent('websocket_event', {
      websocket_event_type: eventType,
      connection_status: connectionStatus,
    });
  }

  /**
   * Track suggestion interactions
   */
  async trackSuggestionInteraction(interactionType, suggestionId) {
    await this.trackEvent('suggestion_interaction', {
      interaction_type: interactionType,
      suggestion_id: suggestionId,
    });
  }
}

// Create and export singleton instance
export const analyticsService = new AnalyticsService();

// Export the class for testing
export { AnalyticsService };
