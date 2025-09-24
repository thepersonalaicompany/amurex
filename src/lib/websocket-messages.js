// handles message parsing, validation, and event dispatching

import { WEBSOCKET_CONFIG } from './websocket-config.js';

class WebSocketMessageHandler {
  constructor() {
    this.messageHandlers = new Map();
    this.eventListeners = new Map();
  }

  /**
   * register handler for specific message type
   * @param {string} messageType - Message type to handle
   * @param {Function} handler - Handler function
   */
  registerHandler(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType).add(handler);
  }

  /**
   * unregister handler for specific message type
   * @param {string} messageType - Message type
   * @param {Function} handler - Handler function
   */
  unregisterHandler(messageType, handler) {
    if (this.messageHandlers.has(messageType)) {
      this.messageHandlers.get(messageType).delete(handler);
    }
  }

  /**
   * add event listener
   * @param {string} event - Event type
   * @param {Function} listener - Event listener
   */
  addEventListener(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(listener);
  }

  /**
   * remove event listener
   * @param {string} event - Event type
   * @param {Function} listener - Event listener
   */
  removeEventListener(event, listener) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(listener);
    }
  }

  /**
   * process incoming WebSocket message
   * @param {Object} message - WebSocket message
   */
  processMessage(message) {
    try {
      const { type, data } = message;

      // validate message structure
      if (!type || data === undefined) {
        console.warn('Invalid message structure:', message);
        this._emitEvent('message_error', {
          error: 'Invalid message structure',
          message,
        });
        return;
      }

      // route message to appropriate handlers
      this._routeMessage(type, data);

      // emit general message event
      this._emitEvent('message_received', { type, data });
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      this._emitEvent('message_error', {
        error: error.message,
        message,
      });
    }
  }

  /**
   * route message to appropriate handlers
   * @private
   */
  _routeMessage(type, data) {
    // handle suggestion responses
    if (type === WEBSOCKET_CONFIG.MESSAGE_TYPES.SUGGESTION_RESPONSE) {
      this._handleSuggestionResponse(data);
    }
    // handle exceeded response
    else if (type === WEBSOCKET_CONFIG.MESSAGE_TYPES.EXCEEDED_RESPONSE) {
      this._handleExceededResponse(data);
    }
    // handle no file uploaded response
    else if (type === WEBSOCKET_CONFIG.MESSAGE_TYPES.NO_FILE_UPLOADED) {
      this._handleNoFileUploaded(data);
    }
    // handle no record found response
    else if (type === WEBSOCKET_CONFIG.MESSAGE_TYPES.NO_RECORD_FOUND) {
      this._handleNoRecordFound(data);
    }
    // handle no file found response
    else if (type === WEBSOCKET_CONFIG.MESSAGE_TYPES.NO_FILE_FOUND) {
      this._handleNoFileFound(data);
    }
    // handle unknown message types
    else {
      console.warn('Unknown message type received:', type);
      this._emitEvent('unknown_message', { type, data });
    }

    // call registered handlers for this message type
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for ${type}:`, error);
        }
      });
    }
  }

  /**
   * handle suggestion response
   * @private
   */
  _handleSuggestionResponse(data) {
    console.log('Suggestion response received:', data);
    this._emitEvent('suggestion_received', data);
  }

  /**
   * handle exceeded response
   * @private
   */
  _handleExceededResponse(data) {
    console.log('Rate limit exceeded:', data);
    this._emitEvent('rate_limit_exceeded', data);
  }

  /**
   * handle no file uploaded response
   * @private
   */
  _handleNoFileUploaded(data) {
    console.log('No file uploaded response:', data);
    this._emitEvent('no_file_uploaded', data);
  }

  /**
   * handle no record found response
   * @private
   */
  _handleNoRecordFound(data) {
    console.log('No record found response:', data);
    this._emitEvent('no_record_found', data);
  }

  /**
   * handle no file found response
   * @private
   */
  _handleNoFileFound(data) {
    console.log('No file found response:', data);
    this._emitEvent('no_file_found', data);
  }

  /**
   * emit event to registered listeners
   * @private
   */
  _emitEvent(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * create check suggestion message
   * @param {Object} params - Suggestion parameters
   * @returns {Object} - Formatted message
   */
  createCheckSuggestionMessage(params) {
    const { transcript, isFileUploaded, user_id } = params;

    return {
      type: WEBSOCKET_CONFIG.MESSAGE_TYPES.CHECK_SUGGESTION,
      data: {
        transcript,
        isFileUploaded,
        user_id,
      },
    };
  }

  /**
   * Create transcript update message
   * @param {string} transcript - Transcript content
   * @returns {Object} - Formatted message
   */
  createTranscriptUpdateMessage(transcript) {
    return {
      type: WEBSOCKET_CONFIG.MESSAGE_TYPES.TRANSCRIPT_UPDATE,
      data: transcript,
    };
  }

  /**
   * validate message data
   * @param {Object} message - Message to validate
   * @returns {boolean} - Whether message is valid
   */
  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const { type, data } = message;

    // check required fields
    if (!type || typeof type !== 'string') {
      return false;
    }

    // validate specific message types
    if (type === WEBSOCKET_CONFIG.MESSAGE_TYPES.CHECK_SUGGESTION) {
      return !!(
        data &&
        typeof data.transcript === 'string' &&
        typeof data.isFileUploaded === 'boolean' &&
        typeof data.user_id === 'string'
      );
    }

    if (type === WEBSOCKET_CONFIG.MESSAGE_TYPES.TRANSCRIPT_UPDATE) {
      return typeof data === 'string';
    }

    return true;
  }

  /**
   * get all registered message types
   * @returns {Array} - Array of message types
   */
  getRegisteredMessageTypes() {
    return Array.from(this.messageHandlers.keys());
  }

  /**
   * get all registered event types
   * @returns {Array} - Array of event types
   */
  getRegisteredEventTypes() {
    return Array.from(this.eventListeners.keys());
  }
}

// export singleton instance
export const websocketMessageHandler = new WebSocketMessageHandler();
export default websocketMessageHandler;
