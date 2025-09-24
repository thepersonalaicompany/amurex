import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import AuthComponent from './AuthComponent';

const AuthGuard = ({ children }) => {
  const {
    isAuthenticated,
    isLoading,
    isInitialized,
    initializeAuth,
    setInitialized,
  } = useAuthStore();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const initializeAuthFlow = async () => {
      try {
        setIsChecking(true);

        // Wait for store to be initialized
        if (!isInitialized) {
          setInitialized(true);
        }

        // Initialize auth service (validates auth and starts monitoring)
        await initializeAuth();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    initializeAuthFlow();
  }, [isInitialized, initializeAuth, setInitialized]);

  // Show loading state while checking authentication
  if (isChecking || isLoading || !isInitialized) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-[var(--color-background-dark)]'>
        <div className='flex flex-col items-center space-y-4'>
          {/* Amurex Logo */}
          <div className='flex items-center space-x-2'>
            <img
              src='/icon.png'
              alt='Amurex logo'
              className='h-8 w-8 rounded-full border-2 border-white'
            />
            <p className='text-lg font-semibold text-white'>Amurex</p>
          </div>

          {/* Loading Spinner */}
          <div className='flex items-center space-x-2'>
            <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
            <p className='text-sm text-[var(--color-gray-400)]'>
              Checking authentication...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show auth component if not authenticated
  if (!isAuthenticated) {
    return <AuthComponent />;
  }

  // Show main app if authenticated
  return <>{children}</>;
};

export default AuthGuard;
