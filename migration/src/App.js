import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { checkSession, setupCookieListener } from "./utils/auth";
import { checkRedirect } from "./utils/navigation";
import Summary from "./pages/Summary";
import LiveSuggestions from "./pages/LiveSuggestions";
import AuthScreen from "./components/AuthScreen";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("App component mounted");
    
    // Log the config to see if it's available
    console.log("AMUREX_CONFIG:", window.AMUREX_CONFIG);
    
    const init = async () => {
      try {
        // Check if the user is authenticated
        const authenticated = await checkSession();
        console.log("Authentication check result:", authenticated);
        setIsAuthenticated(authenticated);
        
        // Set up cookie listener
        setupCookieListener(setIsAuthenticated);
        
        // Check if we should redirect to a specific page
        const redirectInfo = await checkRedirect();
        console.log("Redirect info:", redirectInfo);
        if (redirectInfo) {
          const { redirect } = redirectInfo;
          
          if (redirect === "open_file_upload_panel") {
            navigate("/live-suggestions");
          } else if (redirect === "open_side_panel") {
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Error during initialization:", error);
        // If there's an error, we'll still show the UI
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, [navigate]);

  // Determine active link based on current path
  const getActiveLink = () => {
    const path = location.pathname;
    if (path === "/") return "summary";
    if (path === "/live-suggestions") return "liveSuggestions";
    return "summary";
  };

  console.log("Rendering App component", { isLoading, isAuthenticated });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#09090B] text-white">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090B] text-white">
      {!isAuthenticated ? (
        <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />
      ) : (
        <>
          <div className="flex-1 overflow-auto pb-16">
            <Routes>
              <Route path="/" element={<Summary />} />
              <Route path="/live-suggestions" element={<LiveSuggestions />} />
            </Routes>
          </div>
          
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#09090B] border-t border-[rgba(255,255,255,0.1)] flex justify-center items-center px-4">
            <div className="flex justify-center items-center gap-4 w-full max-w-md">
              <Link
                to="/"
                className={`flex flex-col items-center px-6 py-3 rounded-lg flex-1 ${
                  getActiveLink() === "summary"
                    ? "text-[#9334E9] bg-[rgba(147,51,234,0.1)]"
                    : "text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.9)]"
                }`}
              >
                <svg
                  className="w-6 h-6 mb-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M4 6h16M4 12h16M4 18h7"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-sm font-medium">Summary</span>
              </Link>
              
              <Link
                to="/live-suggestions"
                className={`flex flex-col items-center px-6 py-3 rounded-lg flex-1 ${
                  getActiveLink() === "liveSuggestions"
                    ? "text-[#9334E9] bg-[rgba(147,51,234,0.1)]"
                    : "text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.9)]"
                }`}
              >
                <svg
                  className="w-6 h-6 mb-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    strokeWidth="2"
                  />
                </svg>
                <span className="text-sm font-medium">Live Suggestions</span>
              </Link>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

export default App;