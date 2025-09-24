import { useAuthStore } from '@/store/authStore';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthComponent from '../AuthComponent';

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock Chrome APIs
global.chrome = {
  tabs: {
    create: vi.fn(),
  },
};

describe('AuthComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      error: null,
      clearError: vi.fn(),
    });
  });

  it('should render auth component with correct elements', () => {
    render(<AuthComponent />);

    expect(screen.getByText('Amurex')).toBeInTheDocument();
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to access your AI meeting copilot')
    ).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('should display error message when error exists', () => {
    useAuthStore.mockReturnValue({
      error: 'Authentication failed',
      clearError: vi.fn(),
    });

    render(<AuthComponent />);

    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
  });

  it('should not display error message when no error', () => {
    render(<AuthComponent />);

    expect(screen.queryByText('Authentication failed')).not.toBeInTheDocument();
  });

  it('should open sign in page when sign in button is clicked', async () => {
    const mockClearError = vi.fn();
    useAuthStore.mockReturnValue({
      error: null,
      clearError: mockClearError,
    });

    render(<AuthComponent />);

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    expect(mockClearError).toHaveBeenCalled();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://app.amurex.ai/signin?extension=true',
    });

    // Check loading state - both buttons should show "Opening..."
    expect(screen.getAllByText('Opening...')).toHaveLength(2);
  });

  it('should open sign up page when sign up button is clicked', async () => {
    const mockClearError = vi.fn();
    useAuthStore.mockReturnValue({
      error: null,
      clearError: mockClearError,
    });

    render(<AuthComponent />);

    const signUpButton = screen.getByText('Sign Up');
    fireEvent.click(signUpButton);

    expect(mockClearError).toHaveBeenCalled();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://app.amurex.ai/signup?extension=true',
    });

    // Check loading state - both buttons should show "Opening..."
    expect(screen.getAllByText('Opening...')).toHaveLength(2);
  });

  it('should show features preview', () => {
    render(<AuthComponent />);

    expect(
      screen.getByText('Automatic transcript capture')
    ).toBeInTheDocument();
    expect(
      screen.getByText('AI-powered meeting summaries')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Real-time meeting suggestions')
    ).toBeInTheDocument();
  });

  it('should show help text', () => {
    render(<AuthComponent />);

    expect(
      screen.getByText(/New to Amurex\? Create an account/)
    ).toBeInTheDocument();
  });

  it('should show footer text', () => {
    render(<AuthComponent />);

    expect(
      screen.getByText(/By signing in, you agree to our Terms/)
    ).toBeInTheDocument();
  });

  it('should disable buttons when loading', async () => {
    render(<AuthComponent />);

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(signInButton).toBeDisabled();
    });
  });

  it('should reset loading state after timeout', async () => {
    render(<AuthComponent />);

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    expect(screen.getAllByText('Opening...')).toHaveLength(2);

    // Wait for the timeout to complete
    await waitFor(
      () => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
        expect(screen.getByText('Sign Up')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
