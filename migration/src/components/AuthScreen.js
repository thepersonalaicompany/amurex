import React from 'react';
import { trackEvent } from '../utils/api';

const AuthScreen = ({ onAuthenticated }) => {
  const handleSignIn = () => {
    // Track sign in click
    trackEvent('click_sign_in');
    
    // Open sign-in page in a new tab
    window.open('https://app.amurex.ai/signin?extension=true', '_blank');
  };
  
  const handleSignUp = () => {
    // Track sign up click
    trackEvent('click_sign_up');
    
    // Open sign-up page in a new tab
    window.open('https://app.amurex.ai/signup', '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <img
        src="https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
        alt="Amurex Logo"
        className="h-12 w-12 mb-3 rounded-full border-2 border-white"
      />
      <h2 className="text-2xl font-bold mb-2 text-white">Amurex</h2>
      <h3 className="text-lg text-gray-300 mb-6">Your AI meeting copilot</h3>
      
      <div className="flex flex-col w-full max-w-xs gap-4">
        <button 
          className="bg-[#9334E9] hover:bg-[#7C3AED] text-white py-3 px-6 rounded-lg font-medium transition-colors"
          onClick={handleSignIn}
        >
          Sign in to Amurex
        </button>
        
        <div className="flex items-center justify-center gap-2 my-2">
          <div className="h-px bg-gray-700 flex-grow"></div>
          <span className="text-gray-500 text-sm">or</span>
          <div className="h-px bg-gray-700 flex-grow"></div>
        </div>
        
        <button
          className="text-[#9334E9] hover:text-[#7C3AED] border border-[#9334E9] hover:border-[#7C3AED] bg-transparent py-3 px-6 rounded-lg font-medium transition-colors"
          onClick={handleSignUp}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default AuthScreen; 