// handles connection lifecycle, retry logic, and connection state management

import {
  WEBSOCKET_CONFIG,
  buildWebSocketUrl,
  createMessage,
  validateMessage,
} from './websocket-config.js';

class WebSocketConnection {
  constructor() {
    this.ws = null;
    this.url = null;
    this.meetingId = null;
    this.userId = null;
    this.state = WEBSOCKET_CONFIG.CONNECTION_STATES.DISCONNECTED;
    this.retryTimeoutId = null;
    this.messageHandlers = new Map();
    this.errorHandlers = new Map();
    this.isManualDisconnect = false;
  }

  /**
   * connect to WebSocket server
   * @param {string} meetingId - Meeting identifier
   * @param {string} userId - User identifier
   * @returns {Promise<void>}
   */
  async connect(meetingId, userId) {
    if (this.state === WEBSOCKET_CONFIG.CONNECTION_STATES.CONNECTED) {
      console.log('WebSocket already connected');
      return;
    }

    this.meetingId = meetingId;
    this.userId = userId;
    this.url = buildWebSocketUrl(meetingId, userId);
    this.isManualDisconnect = false;

    return this._establishConnection();
  }

  /**
   * Establish WebSocket connection
   * @private
   */
  async _establishConnection() {
    try {
      this.state = WEBSOCKET_CONFIG.CONNECTION_STATES.CONNECTING;
      this._emitEvent(WEBSOCKET_CONFIG.EVENTS.CONNECT, { state: this.state });

      this.ws = new WebSocket(this.url);

      // Set connection timeout
      const timeoutId = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          this._handleConnectionError(new Error('Connection timeout'));
        }
      }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);

      this.ws.onopen = () => {
        clearTimeout(timeoutId);
        this.state = WEBSOCKET_CONFIG.CONNECTION_STATES.CONNECTED;
        console.log('WebSocket connected:', this.url);
        this._emitEvent(WEBSOCKET_CONFIG.EVENTS.CONNECT, {
          state: this.state,
          meetingId: this.meetingId,
          userId: this.userId,
        });
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event);
      };

      this.ws.onclose = (event) => {
        clearTimeout(timeoutId);
        this._handleDisconnect(event);
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeoutId);
        this._handleConnectionError(error);
      };
    } catch (error) {
      this._handleConnectionError(error);
    }
  }

  /**
   * Handle WebSocket disconnect
   * @private
   */
  _handleDisconnect(event) {
    this.state = WEBSOCKET_CONFIG.CONNECTION_STATES.DISCONNECTED;
    console.log('WebSocket disconnected:', event.code, event.reason);

    this._emitEvent(WEBSOCKET_CONFIG.EVENTS.DISCONNECT, {
      state: this.state,
      code: event.code,
      reason: event.reason,
    });

    // Auto-reconnect if not manual disconnect
    if (!this.isManualDisconnect && this.meetingId && this.userId) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handle connection errors
   * @private
   */
  _handleConnectionError(error) {
    this.state = WEBSOCKET_CONFIG.CONNECTION_STATES.ERROR;
    console.error('WebSocket connection error:', error);

    this._emitEvent(WEBSOCKET_CONFIG.EVENTS.ERROR, {
      state: this.state,
      error: error.message || error,
    });

    // Auto-reconnect if not manual disconnect
    if (!this.isManualDisconnect && this.meetingId && this.userId) {
      this._scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   * @private
   */
  _scheduleReconnect() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.state = WEBSOCKET_CONFIG.CONNECTION_STATES.RECONNECTING;
    this._emitEvent(WEBSOCKET_CONFIG.EVENTS.RECONNECT, { state: this.state });

    this.retryTimeoutId = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this._establishConnection();
    }, WEBSOCKET_CONFIG.RETRY_INTERVAL);
  }

  /**
   * Handle incoming messages
   * @private
   */
  _handleMessage(event) {
    try {
      // Check if data is empty or not a string
      if (!event.data || typeof event.data !== 'string') {
        // Silently ignore empty messages (common with WebSocket keep-alive)
        return;
      }

      // Check if data looks like JSON
      const trimmedData = event.data.trim();
      if (!trimmedData.startsWith('{') && !trimmedData.startsWith('[')) {
        console.warn('Received non-JSON WebSocket message:', trimmedData);
        return;
      }

      const message = JSON.parse(trimmedData);

      if (!validateMessage(message)) {
        console.warn('Invalid message format received:', message);
        return;
      }

      console.log('WebSocket message received:', message.type, message.data);
      this._emitEvent(WEBSOCKET_CONFIG.EVENTS.MESSAGE, message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      console.error('Raw message data:', event.data);
      this._emitEvent(WEBSOCKET_CONFIG.EVENTS.ERROR, {
        error: 'Message parsing error',
        data: event.data,
        parseError: error.message,
      });
    }
  }

  /**
   * Send message through WebSocket
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @returns {boolean} - Whether message was sent successfully
   */
  sendMessage(type, data) {
    if (
      this.state !== WEBSOCKET_CONFIG.CONNECTION_STATES.CONNECTED ||
      !this.ws
    ) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      const message = createMessage(type, data);
      this.ws.send(JSON.stringify(message));
      console.log('WebSocket message sent:', type, data);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this._emitEvent(WEBSOCKET_CONFIG.EVENTS.ERROR, {
        error: 'Message send error',
        type,
        data,
      });
      return false;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.isManualDisconnect = true;

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = WEBSOCKET_CONFIG.CONNECTION_STATES.DISCONNECTED;
    this._emitEvent(WEBSOCKET_CONFIG.EVENTS.DISCONNECT, {
      state: this.state,
      manual: true,
    });
  }

  /**
   * Add event listener
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event).add(handler);
  }

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event).delete(handler);
    }
  }

  /**
   * Emit event to registered handlers
   * @private
   */
  _emitEvent(event, data) {
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event).forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Get current connection state
   * @returns {string} - Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if connected
   * @returns {boolean} - Whether connected
   */
  isConnected() {
    return this.state === WEBSOCKET_CONFIG.CONNECTION_STATES.CONNECTED;
  }

  /**
   * Get connection info
   * @returns {Object} - Connection information
   */
  getConnectionInfo() {
    return {
      state: this.state,
      meetingId: this.meetingId,
      userId: this.userId,
      url: this.url,
    };
  }
}

// export class and singleton instance
export { WebSocketConnection };
export const websocketConnection = new WebSocketConnection();
export default websocketConnection;
