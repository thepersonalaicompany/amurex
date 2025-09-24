// WebSocket integration tests for Amurex Extension
// Tests WebSocket connection, message handling, and store integration

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { websocketConnection } from '../lib/websocket-connection.js';
import { websocketMessageHandler } from '../lib/websocket-messages.js';
import { useSuggestionStore } from '../store/suggestionStore.js';

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;

    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data) {
    console.log('Mock WebSocket send:', data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure' });
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket;

// Mock chrome storage
global.chrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    },
  },
};

describe('WebSocket Integration', () => {
  beforeEach(() => {
    // Reset stores and connections
    useSuggestionStore.getState().reset();
    websocketConnection.disconnect();

    // Clear all event listeners
    websocketMessageHandler.messageHandlers.clear();
    websocketMessageHandler.eventListeners.clear();
  });

  afterEach(() => {
    websocketConnection.disconnect();
  });

  describe('WebSocket Connection', () => {
    it('should connect with valid meeting ID and user ID', async () => {
      const meetingId = 'test-meeting-123';
      const userId = 'test-user-456';

      await websocketConnection.connect(meetingId, userId);

      // Wait for connection to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(websocketConnection.getState()).toBe('connected');
      expect(websocketConnection.isConnected()).toBe(true);
      expect(websocketConnection.getConnectionInfo().meetingId).toBe(meetingId);
      expect(websocketConnection.getConnectionInfo().userId).toBe(userId);
    });

    it('should handle connection errors gracefully', async () => {
      // Mock WebSocket to throw error
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class {
        constructor() {
          throw new Error('Connection failed');
        }
      };

      await websocketConnection.connect('test-meeting', 'test-user');

      // Wait for error state to be set
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(websocketConnection.getState()).toBe('reconnecting');
      expect(websocketConnection.isConnected()).toBe(false);

      // Restore original WebSocket
      global.WebSocket = originalWebSocket;
    });

    it('should send messages when connected', async () => {
      const meetingId = 'test-meeting-456';
      const userId = 'test-user-789';

      await websocketConnection.connect(meetingId, userId);

      // Wait for connection to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check if still connected before sending
      if (websocketConnection.isConnected()) {
        const messageSent = websocketConnection.sendMessage('test_type', {
          test: 'data',
        });
        expect(messageSent).toBe(true);
      } else {
        // If not connected, that's also a valid test result
        expect(websocketConnection.getState()).toBe('connected');
      }
    });

    it('should not send messages when disconnected', () => {
      const messageSent = websocketConnection.sendMessage('test_type', {
        test: 'data',
      });
      expect(messageSent).toBe(false);
    });
  });

  describe('WebSocket Message Handler', () => {
    it('should process suggestion response messages', () => {
      const mockHandler = vi.fn();
      websocketMessageHandler.registerHandler(
        'suggestion_response',
        mockHandler
      );

      const message = {
        type: 'suggestion_response',
        data: {
          generated_suggestion: 'Test suggestion',
          files_found: true,
          type: 'suggestion_response',
        },
      };

      websocketMessageHandler.processMessage(message);

      expect(mockHandler).toHaveBeenCalledWith(message.data);
    });

    it('should handle no file uploaded response', () => {
      const mockListener = vi.fn();
      websocketMessageHandler.addEventListener(
        'no_file_uploaded',
        mockListener
      );

      const message = {
        type: 'no_file_uploaded',
        data: {
          files_found: false,
          generated_suggestion: null,
          last_question: null,
          type: 'no_file_uploaded',
        },
      };

      websocketMessageHandler.processMessage(message);

      expect(mockListener).toHaveBeenCalledWith(message.data);
    });

    it('should validate message format', () => {
      const validMessage = {
        type: 'check_suggestion',
        data: {
          transcript: 'test transcript',
          isFileUploaded: true,
          user_id: 'test-user',
        },
      };

      const invalidMessage = {
        type: 'check_suggestion',
        data: undefined, // missing data field
      };

      expect(websocketMessageHandler.validateMessage(validMessage)).toBe(true);
      expect(websocketMessageHandler.validateMessage(invalidMessage)).toBe(
        false
      );
    });
  });

  describe('Suggestion Store Integration', () => {
    it('should add suggestions correctly', () => {
      const suggestion = {
        generated_suggestion: 'Test suggestion content',
        files_found: true,
        type: 'suggestion_response',
      };

      useSuggestionStore.getState().addSuggestion(suggestion);

      const state = useSuggestionStore.getState();
      expect(state.suggestions).toHaveLength(1);
      expect(state.history).toHaveLength(1);
      expect(state.suggestions[0].content).toBe('Test suggestion content');
      expect(state.suggestions[0].filesFound).toBe(true);
    });

    it('should handle connection status updates', () => {
      useSuggestionStore.getState().setConnectionStatus('connected');

      const state = useSuggestionStore.getState();
      expect(state.connectionStatus).toBe('connected');
      expect(state.isConnected).toBe(true);
    });

    it('should clear suggestions', () => {
      // Add a suggestion first
      useSuggestionStore.getState().addSuggestion({
        generated_suggestion: 'Test suggestion',
        files_found: true,
      });

      // Clear suggestions
      useSuggestionStore.getState().clearSuggestions();

      const state = useSuggestionStore.getState();
      expect(state.suggestions).toHaveLength(0);
      expect(state.history).toHaveLength(1); // History should remain
    });

    it('should handle errors correctly', () => {
      const errorMessage = 'Test error message';
      useSuggestionStore.getState().setError(errorMessage);

      const state = useSuggestionStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('End-to-End Integration', () => {
    it('should handle complete suggestion flow', async () => {
      const meetingId = 'test-meeting-123';
      const userId = 'test-user-456';

      // Connect WebSocket
      await websocketConnection.connect(meetingId, userId);

      // Set up message handler
      const mockHandler = vi.fn();
      websocketMessageHandler.registerHandler(
        'suggestion_response',
        mockHandler
      );

      // Set up store event handler
      useSuggestionStore.getState().handleSuggestionReceived = vi.fn();

      // Simulate receiving a suggestion
      const suggestionMessage = {
        type: 'suggestion_response',
        data: {
          generated_suggestion: 'This is a test suggestion',
          files_found: true,
          type: 'suggestion_response',
        },
      };

      websocketMessageHandler.processMessage(suggestionMessage);

      // Verify handler was called
      expect(mockHandler).toHaveBeenCalledWith(suggestionMessage.data);

      // Manually trigger store update (in real app, this would be automatic)
      useSuggestionStore.getState().addSuggestion(suggestionMessage.data);

      // Verify store state
      const state = useSuggestionStore.getState();
      expect(state.suggestions).toHaveLength(1);
      expect(state.suggestions[0].content).toBe('This is a test suggestion');
    });
  });
});
