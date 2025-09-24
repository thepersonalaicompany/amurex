import { useAuthStore } from '@/store/authStore';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthGuard from '../AuthGuard';

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock AuthComponent
vi.mock('../AuthComponent', () => ({
  default: () => <div data-testid='auth-component'>Auth Component</div>,
}));

// Mock Chrome APIs
global.chrome = {
  tabs: {
    create: vi.fn(),
  },
};

describe('AuthGuard', () => {
  const mockChildren = <div data-testid='main-app'>Main App Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    useAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      validateAuth: vi.fn(),
      setInitialized: vi.fn(),
    });

    render(<AuthGuard>{mockChildren}</AuthGuard>);

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    expect(screen.getByText('Amurex')).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', () => {
    useAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      isInitialized: true,
      validateAuth: vi.fn(),
      setInitialized: vi.fn(),
    });

    render(<AuthGuard>{mockChildren}</AuthGuard>);

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
  });

  it('should show auth component when not authenticated', async () => {
    useAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      validateAuth: vi.fn(),
      setInitialized: vi.fn(),
    });

    render(<AuthGuard>{mockChildren}</AuthGuard>);

    await waitFor(() => {
      expect(screen.getByTestId('auth-component')).toBeInTheDocument();
    });
  });

  it('should show main app when authenticated', async () => {
    useAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      validateAuth: vi.fn(),
      setInitialized: vi.fn(),
    });

    render(<AuthGuard>{mockChildren}</AuthGuard>);

    await waitFor(() => {
      expect(screen.getByTestId('main-app')).toBeInTheDocument();
    });
  });

  it('should call initializeAuth on mount', async () => {
    const mockInitializeAuth = vi.fn();
    useAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      initializeAuth: mockInitializeAuth,
      setInitialized: vi.fn(),
    });

    render(<AuthGuard>{mockChildren}</AuthGuard>);

    await waitFor(() => {
      expect(mockInitializeAuth).toHaveBeenCalled();
    });
  });

  it('should set initialized to true if not initialized', async () => {
    const mockSetInitialized = vi.fn();
    useAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      initializeAuth: vi.fn(),
      setInitialized: mockSetInitialized,
    });

    render(<AuthGuard>{mockChildren}</AuthGuard>);

    await waitFor(() => {
      expect(mockSetInitialized).toHaveBeenCalledWith(true);
    });
  });
});
