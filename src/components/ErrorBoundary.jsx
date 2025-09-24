import { AUTH_ERRORS } from '@/lib/auth-config';
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log to external service if available
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // In a real app, you would send this to an error reporting service
    console.error('Error logged:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Determine if this is an auth-related error
      const isAuthError =
        this.state.error?.message?.includes('auth') ||
        this.state.error?.message?.includes('session') ||
        this.state.error?.message?.includes('cookie');

      return (
        <div className='flex min-h-screen items-center justify-center bg-[var(--color-background-dark)] p-4'>
          <div className='w-full max-w-md'>
            <div className='rounded-xl border border-[var(--color-red-500)]/30 bg-[var(--color-red-900)]/20 p-8 shadow-2xl'>
              {/* Error Icon */}
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-red-500)]/20'>
                  <svg
                    className='h-8 w-8 text-[var(--color-red-400)]'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                    />
                  </svg>
                </div>
              </div>

              {/* Error Title */}
              <div className='mb-4 text-center'>
                <h2 className='text-xl font-semibold text-white'>
                  {isAuthError
                    ? 'Authentication Error'
                    : 'Something went wrong'}
                </h2>
                <p className='mt-2 text-sm text-[var(--color-gray-400)]'>
                  {isAuthError
                    ? 'There was a problem with your authentication session.'
                    : 'An unexpected error occurred in the extension.'}
                </p>
              </div>

              {/* Error Message */}
              <div className='mb-6 rounded-lg bg-[var(--color-gray-800)]/50 p-4'>
                <p className='text-sm text-[var(--color-gray-300)]'>
                  {isAuthError
                    ? AUTH_ERRORS.UNKNOWN_ERROR
                    : this.state.error?.message ||
                      'An unexpected error occurred.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className='space-y-3'>
                <button
                  onClick={this.handleRetry}
                  className='w-full rounded-lg bg-[var(--color-blue-600)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-blue-700)] focus:ring-2 focus:ring-[var(--color-blue-500)] focus:ring-offset-2 focus:ring-offset-[var(--color-gray-900)] focus:outline-none'
                >
                  Try Again
                </button>

                <button
                  onClick={this.handleReload}
                  className='w-full rounded-lg border border-[var(--color-gray-600)] bg-transparent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-gray-800)] focus:ring-2 focus:ring-[var(--color-gray-500)] focus:ring-offset-2 focus:ring-offset-[var(--color-gray-900)] focus:outline-none'
                >
                  Reload Extension
                </button>
              </div>

              {/* Help Text */}
              <div className='mt-6 text-center'>
                <p className='text-xs text-[var(--color-gray-500)]'>
                  If this problem persists, please contact support or try
                  signing in again.
                </p>
              </div>

              {/* Development Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className='mt-4'>
                  <summary className='cursor-pointer text-sm text-[var(--color-gray-400)] hover:text-[var(--color-gray-300)]'>
                    Error Details (Development)
                  </summary>
                  <div className='mt-2 rounded bg-[var(--color-gray-900)] p-3 text-xs text-[var(--color-gray-300)]'>
                    <pre className='break-words whitespace-pre-wrap'>
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className='mt-2 break-words whitespace-pre-wrap'>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
