// WebSocket configuration for Amurex Extension
// based on backend implementation in amurex-backend/index.py

export const WEBSOCKET_CONFIG = {
  // WebSocket URL configuration
  BASE_URL: 'wss://api.amurex.ai',
  ENDPOINT: '/ws',

  // Connection parameters
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  RETRY_INTERVAL: 5000, // 5 seconds (fixed interval)
  MAX_RETRIES: null, // infinite retries

  // Message types
  MESSAGE_TYPES: {
    // client to server
    CHECK_SUGGESTION: 'check_suggestion',
    TRANSCRIPT_UPDATE: 'transcript_update',

    // server to client
    SUGGESTION_RESPONSE: 'suggestion_response',
    EXCEEDED_RESPONSE: 'exceeded_response',
    NO_FILE_UPLOADED: 'no_file_uploaded',
    NO_RECORD_FOUND: 'no_record_found',
    NO_FILE_FOUND: 'no_file_found',
  },

  // connection states
  CONNECTION_STATES: {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
  },

  // event types for internal use
  EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    MESSAGE: 'message',
    ERROR: 'error',
    RECONNECT: 'reconnect',
  },
};

/**
 * build WebSocket URL with query parameters
 * @param {string} meetingId - Meeting identifier
 * @param {string} userId - User identifier
 * @returns {string} - Complete WebSocket URL
 */
export function buildWebSocketUrl(meetingId, userId) {
  const baseUrl = `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.ENDPOINT}`;
  const params = new URLSearchParams({
    meeting_id: meetingId,
    user_id: userId,
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * create message object for WebSocket communication
 * @param {string} type - Message type
 * @param {Object} data - Message data
 * @returns {Object} - Formatted message object
 */
export function createMessage(type, data) {
  return {
    type,
    data,
  };
}

/**
 * validate WebSocket message format
 * @param {Object} message - Message to validate
 * @returns {boolean} - Whether message is valid
 */
export function validateMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.type === 'string' &&
    message.data !== undefined
  );
}
