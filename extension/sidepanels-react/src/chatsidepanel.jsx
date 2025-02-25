import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './sidepanel.css';
import './chatsidepanel.css';

const ChatSidepanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [platform, setPlatform] = useState('');
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showLiveSuggestions, setShowLiveSuggestions] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);
  
  const AMUREX_CONFIG = {
    BASE_URL_BACKEND: "https://api.amurex.ai",
    BASE_URL_WEB: "https://app.amurex.ai",
    ANALYTICS_ENABLED: true
  };

  useEffect(() => {
    // Check authentication status
    checkSession((isAuth) => {
      setIsAuthenticated(isAuth);
    });
    
    // Check platform
    chrome.storage.local.get("platform", function (result) {
      if (result.platform === "msteams") {
        setPlatform("msteams");
      }
    });
    
    // Setup cookie listener
    setupCookieListener((isAuth) => {
      setIsAuthenticated(isAuth);
    });
    
    // Check navigation items
    checkNavItem();
    
    // Setup QA observer
    setupQAObserver();
    
    // Initially hide live suggestions
    setShowLiveSuggestions(false);
    
    return () => {
      // Cleanup event listeners
      chrome.cookies.onChanged.removeListener(cookieListener);
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);
  
  const cookieListener = (changeInfo) => {
    const cookie = changeInfo.cookie;
    const isProd = cookie.domain.includes(AMUREX_CONFIG.BASE_URL_WEB);
    
    if (cookie.name === "amurex_session" && isProd) {
      const isAuth = !changeInfo.removed && cookie.value;
      setIsAuthenticated(isAuth);
    }
  };
  
  const storageListener = (changes, namespace) => {
    if (namespace === "local" && changes.meetingQA) {
      updateQADisplay();
    }
  };
  
  const setupCookieListener = (updateUI) => {
    chrome.cookies.onChanged.addListener(cookieListener);
    checkSession(updateUI);
  };
  
  const checkSession = (updateUI) => {
    chrome.cookies.get(
      {
        url: AMUREX_CONFIG.BASE_URL_WEB,
        name: "amurex_session",
      },
      function (cookie) {
        if (cookie && cookie.value) {
          updateUI(true);
          return;
        }
        updateUI(false);
      }
    );
  };
  
  const getSession = async () => {
    let session = await chrome.cookies.get({
      url: AMUREX_CONFIG.BASE_URL_WEB,
      name: "amurex_session",
    });
    if (session && session.value) {
      return session.value;
    }
    return null;
  };
  
  const checkNavItem = async () => {
    const result = await chrome.storage.local.get(["redirect", "meetingId"]);
    chrome.storage.local.set({ redirect: null });
    chrome.storage.local.set({ meetingId: null });
    
    const value = result.redirect;
    const meetingId = result.meetingId;
    
    if (value === "open_file_upload_panel") {
      if (meetingId) {
        window.location.href = `chatsidepanel.html?meetingId=${meetingId}`;
      } else {
        window.location.href = "chatsidepanel.html";
      }
    } else if (value === "chatsidepanel") {
      window.location.href = "chatsidepanel.html";
    } else if (value === "live_suggestions") {
      window.location.href = "live_suggestions.html";
    } else if (value === "settings") {
      chrome.tabs.create({
        url: `${AMUREX_CONFIG.BASE_URL_WEB}/settings`
      });
    }
  };
  
  const setupQAObserver = () => {
    updateQADisplay();
    chrome.storage.onChanged.addListener(storageListener);
  };
  
  const updateQADisplay = () => {
    chrome.storage.local.get(["meetingQA"], function (result) {
      const qaHistory = result.meetingQA || [];
      setQaHistory(qaHistory);
    });
  };
  
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Create FormData
    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);
    
    // Show upload starting
    setUploadStatus(`
      <div>Uploading ${selectedFile.name}...</div>
      <div class="upload-progress">
        <div class="upload-progress-bar" style="width: 0%"></div>
      </div>
    `);
    
    try {
      const meetingId = await chrome.storage.local.get("mId");
      const session = await getSession();
      const parsedSession = JSON.parse(decodeURIComponent(session));
      const user_id = parsedSession.user.id;
      
      const response = await fetch(
        `${AMUREX_CONFIG.BASE_URL_BACKEND}/upload_meeting_file/${meetingId.mId}/${user_id}`,
        {
          method: "POST",
          body: formData,
        }
      );
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      chrome.storage.local.set({ isFileUploaded: true });
      setUploadStatus(`<div style="color: #4CAF50;">Upload successful!</div>`);
      
      // Toggle sections after successful upload
      setTimeout(() => {
        setShowLiveSuggestions(true);
      }, 1000);
    } catch (error) {
      setUploadStatus(`<div style="color: #f44336;">Upload failed: ${error.message}</div>`);
    }
  };
  
  const handleCloseSidebar = async () => {
    // Track closing sidebar only if analytics is enabled
    if (AMUREX_CONFIG.ANALYTICS_ENABLED) {
      try {
        const userIdResponse = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ action: "getUserId" }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
        
        const userId = userIdResponse.userId;
        const meetingId = await chrome.storage.local.get("mId");
        
        await fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            uuid: userId,
            meeting_id: meetingId.mId,
            event_type: "close_sidebar",
          }),
        });
      } catch (error) {
        console.error("Error tracking sidebar close:", error);
      }
    }
    
    window.close();
  };
  
  const handlePreviousTranscripts = async () => {
    // Open app.amurex.ai in a new tab
    chrome.tabs.create({
      url: `${AMUREX_CONFIG.BASE_URL_WEB}/meetings`,
      active: true,
    });
    
    try {
      // Get meetingId from URL if available
      const meetingId = await chrome.storage.local.get("mId");
      
      // Track the event if analytics is enabled
      const response = await chrome.runtime.sendMessage({
        action: "getUserId",
      });
      
      const userId = response.userId;
      
      if (AMUREX_CONFIG.ANALYTICS_ENABLED) {
        await fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            uuid: userId,
            meeting_id: meetingId.mId,
            event_type: "view_previous_transcripts",
          }),
        });
      }
    } catch (error) {
      console.error("Error handling previous transcripts:", error);
    }
  };

  return (
    <div>
      {platform === "msteams" ? (
        <div id="coming-soon-container" className="coming-soon-container">
          <div className="coming-soon-content">
            <div className="coming-soon-header">
              <h2>Coming Soon to Teams</h2>
            </div>
            <div className="coming-soon-message">
              <p>
                We're working on bringing live suggestions to Microsoft Teams.
              </p>
              <p className="subtitle">
                In the meantime, you can use Amurex with Google Meet and Zoom.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div id="auth-container" className="auth-container" style={{ display: isAuthenticated ? 'none' : 'block' }}>
            <img
              src="https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
              alt="Amurex Logo"
              className="auth-logo"
              height="48"
              width="48"
            />
            <h2>Amurex</h2>
            <h3>Your AI meeting copilot</h3>
            <div className="auth-buttons">
              <button id="sign-in-btn" className="auth-btn">Sign in to Amurex</button>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <a
                href="#"
                id="sign-up-btn"
                className="get-started"
              >Get Started</a>
            </div>
          </div>

          <div id="authenticated-content" style={{ display: isAuthenticated ? 'block' : 'none' }}>
            <header className="fixed-header">
              <div className="header-content">
                <div className="header-left">
                  <img
                    src="https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
                    alt="Amurex"
                    className="header-logo"
                    height="24"
                    width="24"
                  />
                  <h2>Amurex</h2>
                </div>
                <div className="header-right">
                  <button id="previous-transcripts" className="black-btn" onClick={handlePreviousTranscripts}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M12 7V12L15 15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>All Transcripts</span>
                  </button>
                  <button id="close-btn" className="close-btn" onClick={handleCloseSidebar}>×</button>
                </div>
              </div>
            </header>

            <div className="content-wrapper">
              <div id="upload-context-files" style={{ display: showLiveSuggestions ? 'none' : 'block' }}>
                <div className="section">
                  <h3>Upload Context Files</h3>
                  <p className="upload-description">
                    Upload files to provide context for the AI. This helps generate more accurate and relevant suggestions.
                  </p>
                  <div className="file-upload-container">
                    <label htmlFor="file-input" className="file-upload-label">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 15V3M12 3L8 7M12 3L16 7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8 12H4V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V12H16"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>Choose a file</span>
                    </label>
                    <input
                      type="file"
                      id="file-input"
                      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div id="upload-status" dangerouslySetInnerHTML={{ __html: uploadStatus }}></div>
                  <div className="supported-files">
                    <p>Supported file types: PDF, DOC, DOCX, TXT, PPT, PPTX</p>
                  </div>
                </div>
              </div>

              <div id="live-suggestions" style={{ display: showLiveSuggestions ? 'block' : 'none' }}>
                <div className="section">
                  <h3>Live Suggestions</h3>
                  <div id="qa-container" className="qa-container">
                    {qaHistory.length > 0 ? (
                      qaHistory.map((qa, index) => (
                        <div key={index} className="qa-item">
                          <div className="question">
                            <div className="question-header">
                              <span className="question-icon">Q</span>
                              <span className="question-text">{qa.question}</span>
                            </div>
                          </div>
                          <div className="answer">
                            <div className="answer-header">
                              <span className="answer-icon">A</span>
                              <div className="answer-text" dangerouslySetInnerHTML={{ __html: qa.answer }}></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-qa">
                        <p>No questions detected yet. As the meeting progresses, AI-generated suggestions will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <nav className="bottom-nav">
              <Link to="/" className="nav-item">
                <svg
                  className="nav-icon"
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
                <span className="nav-label">Summary</span>
              </Link>
              <Link to="/chat" className="nav-item active">
                <svg
                  className="nav-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    strokeWidth="2"
                  />
                </svg>
                <span className="nav-label">Live Suggestions</span>
              </Link>
            </nav>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatSidepanel;