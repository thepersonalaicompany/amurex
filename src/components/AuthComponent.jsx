import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';

const AuthComponent = () => {
  const { error, clearError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    clearError();

    // Open sign in page in new tab
    chrome.tabs.create({
      url: 'https://app.amurex.ai/signin?extension=true',
    });

    // Reset loading state after a short delay
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleSignUp = () => {
    setIsLoading(true);
    clearError();

    // Open sign up page in new tab
    chrome.tabs.create({
      url: 'https://app.amurex.ai/signup?extension=true',
    });

    // Reset loading state after a short delay
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-[var(--color-background-dark)] p-4'>
      <div className='w-full max-w-lg'>
        {/* Logo and Branding */}
        <div className='mb-8 flex items-center justify-center'>
          <img
            src='/icon.png'
            alt='Amurex logo'
            className='h-10 w-10 rounded-full border-2 border-white'
          />
          <p className='pl-3 text-xl font-semibold text-white'>Amurex</p>
        </div>

        {/* Auth Card */}
        <div className='w-full rounded-xl border border-[var(--color-gray-800)] bg-[var(--color-card-dark)] p-10 shadow-2xl'>
          <div className='mb-8 text-center'>
            <h1
              className='mb-3 font-serif text-3xl text-white'
              style={{ fontFamily: 'var(--font-noto-serif)' }}
            >
              Welcome
            </h1>
            <p className='text-sm text-[var(--color-gray-400)]'>
              Sign in to access your AI meeting copilot
            </p>
          </div>

          <hr className='mb-8 border-[var(--color-gray-800)]' />

          {/* Error Message */}
          {error && (
            <div className='mb-6 rounded-lg border border-[var(--color-red-500)]/30 bg-[var(--color-red-900)]/20 p-4'>
              <p className='text-sm text-[var(--color-red-400)]'>{error}</p>
            </div>
          )}

          {/* Auth Buttons */}
          <div className='space-y-4'>
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className='w-full rounded-lg border border-[var(--color-background-dark)] bg-white p-3 text-sm font-semibold text-[var(--color-background-dark)] transition-all duration-200 hover:border-white hover:bg-[var(--color-background-dark)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isLoading ? 'Opening...' : 'Sign In'}
            </button>

            <button
              onClick={handleSignUp}
              disabled={isLoading}
              className='w-full rounded-lg border border-[var(--color-gray-600)] bg-transparent p-3 text-sm font-semibold text-white transition-all duration-200 hover:border-white hover:bg-white hover:text-[var(--color-background-dark)] disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isLoading ? 'Opening...' : 'Sign Up'}
            </button>
          </div>

          {/* Help Text */}
          <div className='mt-8 text-center'>
            <p className='text-xs text-[var(--color-gray-400)]'>
              New to Amurex? Create an account to get started with AI-powered
              meeting assistance.
            </p>
          </div>

          {/* Features Preview */}
          <div className='mt-8 space-y-3'>
            <div className='flex items-center space-x-3 text-sm text-[var(--color-gray-300)]'>
              <div className='h-2 w-2 rounded-full bg-[var(--color-green-500)]'></div>
              <span>Automatic transcript capture</span>
            </div>
            <div className='flex items-center space-x-3 text-sm text-[var(--color-gray-300)]'>
              <div className='h-2 w-2 rounded-full bg-[var(--color-blue-500)]'></div>
              <span>AI-powered meeting summaries</span>
            </div>
            <div className='flex items-center space-x-3 text-sm text-[var(--color-gray-300)]'>
              <div className='h-2 w-2 rounded-full bg-[var(--color-purple-500)]'></div>
              <span>Real-time meeting suggestions</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='mt-6 text-center'>
          <p className='text-xs text-[var(--color-gray-500)]'>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthComponent;
