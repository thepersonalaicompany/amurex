import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome extension APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn(),
  },
  sidePanel: {
    open: vi.fn(),
    setOptions: vi.fn(),
  },
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  },
  cookies: {
    get: vi.fn(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

// Mock window object
global.window = {
  ...global.window,
  confirm: vi.fn(),
  alert: vi.fn(),
  prompt: vi.fn(),
};

// Mock document object
global.document = {
  ...global.document,
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
  createElement: vi.fn(() => ({
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  })),
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
