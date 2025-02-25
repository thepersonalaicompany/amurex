import React from 'react';

function Home() {
  const handleSignIn = () => {
    // Open sign-in page in a new tab
    window.open('https://app.amurex.ai/signin?extension=true', '_blank');
  };
  
  const handleSignUp = () => {
    // Open sign-up page in a new tab
    window.open('https://app.amurex.ai/signup', '_blank');
  };

  return (
    <div className="text-center">
      <div id="auth-container" className="flex flex-col items-center p-6">
        <img
          src="https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
          alt="Amurex Logo"
          className="h-12 w-12 mb-3"
        />
        <h2 className="text-2xl font-bold mb-2">Amurex</h2>
        <h3 className="text-lg text-neutral-600 mb-6">Your AI meeting copilot</h3>
        <div className="flex flex-col w-full max-w-xs gap-4">
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
            onClick={handleSignIn}
          >
            Sign in to Amurex
          </button>
          <div className="flex items-center justify-center gap-2 my-2">
            <div className="h-px bg-gray-300 flex-grow"></div>
            <span className="text-gray-500 text-sm">or</span>
            <div className="h-px bg-gray-300 flex-grow"></div>
          </div>
          <a
            href="https://app.amurex.ai/signup"
            className="text-blue-600 hover:text-blue-700 text-center font-medium"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleSignUp}
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}

export default Home;