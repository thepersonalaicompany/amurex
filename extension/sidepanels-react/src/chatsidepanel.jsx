import React, { useState, useEffect, useRef } from "react";
// import { Link } from "react-router-dom";
import "./sidepanel.css";
import "./chatsidepanel.css";

const ChatSidepanel = ({ setRoute }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [platform, setPlatform] = useState("");
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [showLiveSuggestions, setShowLiveSuggestions] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);

  const AMUREX_CONFIG = {
    BASE_URL_BACKEND: "https://api.amurex.ai",
    BASE_URL_WEB: "https://app.amurex.ai",
    ANALYTICS_ENABLED: true,
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
        // window.location.href = `chatsidepanel.html?meetingId=${meetingId}`;
      } else {
        // window.location.href = "chatsidepanel.html";
      }
    } else if (value === "chatsidepanel") {
      // window.location.href = "chatsidepanel.html";
    } else if (value === "live_suggestions") {
      // window.location.href = "live_suggestions.html";
    } else if (value === "settings") {
      chrome.tabs.create({
        url: `${AMUREX_CONFIG.BASE_URL_WEB}/settings`,
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
      setUploadStatus(
        `<div style="color: #f44336;">Upload failed: ${error.message}</div>`
      );
    }
  };

  const handleSettings = () => {
    chrome.tabs.create({
      url: `${AMUREX_CONFIG.BASE_URL_WEB}/settings`,
      active: true,
    });
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
        <div id='coming-soon-container' className='coming-soon-container'>
          <div className='coming-soon-content'>
            <div className='coming-soon-header'>
              <h2>Coming Soon to Teams</h2>
            </div>
            <div className='coming-soon-message'>
              <p>
                We're working on bringing live suggestions to Microsoft Teams.
              </p>
              <p className='subtitle'>
                In the meantime, you can use Amurex with Google Meet and Zoom.
              </p>
            </div>
          </div>
          <nav className='bottom-nav'>
            <button
              className='nav-item'
              onClick={() => {
                setRoute("/");
              }}
            >
              <svg
                className='nav-icon'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
              >
                <path
                  d='M4 6h16M4 12h16M4 18h7'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
              </svg>
              <span className='nav-label'>Summary</span>
            </button>
            <button
              className='nav-item active'
              onClick={() => {
                setRoute("/chat");
              }}
            >
              <svg
                className='nav-icon'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
              >
                <path
                  d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
                  strokeWidth='2'
                />
              </svg>
              <span className='nav-label'>Live Suggestions</span>
            </button>
          </nav>
        </div>
      ) : (
        <>
          <div
            id='auth-container'
            className='auth-container'
            style={{ display: isAuthenticated ? "none" : "block" }}
          >
            <img
              src='https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75'
              alt='Amurex Logo'
              className='auth-logo'
              height='48'
              width='48'
            />
            <h2>Amurex</h2>
            <h3>Your AI meeting copilot</h3>
            <div className='auth-buttons'>
              <button id='sign-in-btn' className='auth-btn'>
                Sign in to Amurex
              </button>
              <div className='auth-divider'>
                <span>or</span>
              </div>
              <a href='#' id='sign-up-btn' className='get-started'>
                Get Started
              </a>
            </div>
          </div>

          <div
            id='authenticated-content'
            style={{ display: isAuthenticated ? "block" : "none" }}
          >
            <header className='fixed-header'>
              <div className='header-content'>
                <div className='header-left'>
                  <img
                    src='https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75'
                    alt='Amurex'
                    className='header-logo'
                    height='24'
                    width='24'
                  />
                  <h2>Amurex</h2>
                </div>
                <div className='header-right'>
                  <button
                    id='previous-transcripts'
                    className='black-btn'
                    onClick={handlePreviousTranscripts}
                  >
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z'
                        stroke='currentColor'
                        strokeWidth='1.5'
                      />
                      <path
                        d='M12 7V12L15 15'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                    <span>All Transcripts</span>
                  </button>
                  <button
                    id='settings-btn'
                    className='settings-btn'
                    onClick={handleSettings}
                  >
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2295 9.63587 19.6295 9 19.4C8.38293 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74486 20.1656 6.23577 20.3766 5.705 20.3766C5.17423 20.3766 4.66514 20.1656 4.29 19.79C3.91435 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91435 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95235 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.77052 10.0642 4.37052 9.63587 4.6 9C4.87235 8.38293 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83435 6.74486 3.62343 6.23577 3.62343 5.705C3.62343 5.17423 3.83435 4.66514 4.21 4.29C4.58514 3.91435 5.09423 3.70343 5.625 3.70343C6.15577 3.70343 6.66486 3.91435 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30293 4.95235 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87235 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83435 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83435 19.71 4.21C20.0856 4.58514 20.2966 5.09423 20.2966 5.625C20.2966 6.15577 20.0856 6.66486 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30293 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2295 14.0158 19.6295 14.4641 19.4 15Z'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>
                  <button
                    id='close-btn'
                    className='settings-btn'
                    onClick={handleCloseSidebar}
                  >
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 12 10'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M10 -0.00112915C11.0544 -0.00112915 11.9182 0.814748 11.9945 1.84961L12 1.99887V8.0013C12 9.0556 11.1842 9.91946 10.1493 9.99582L10 10.0013H2C0.945638 10.0013 0.0818349 9.18536 0.00548577 8.15055L0 8.0013V1.99887C0 0.944509 0.815877 0.0807057 1.85074 0.00435662L2 -0.00112915H10ZM10 0.998871H7.99847V9.0013H10C10.5128 9.0013 10.9355 8.61519 10.9933 8.11791L11 8.0013V1.99887C11 1.48603 10.614 1.06336 10.1166 1.0056L10 0.998871ZM6.99848 0.998871H2C1.48717 0.998871 1.06449 1.38491 1.00673 1.88225L1 1.99887V8.0013C1 8.51406 1.38604 8.9368 1.88338 8.99457L2 9.0013H6.99848V0.998871ZM4.2843 3.08859L4.35355 3.14645L5.85355 4.64645C6.02712 4.82002 6.04641 5.08944 5.91141 5.2843L5.85355 5.35355L4.35355 6.85355C4.15829 7.0488 3.84171 7.0488 3.64645 6.85355C3.47288 6.67999 3.45359 6.41056 3.58859 6.2157L3.64645 6.14645L4.29289 5.5H2.50185C2.2257 5.5 2.00185 5.27614 2.00185 5C2.00185 4.75454 2.17872 4.55039 2.41197 4.50805L2.50185 4.5H4.29289L3.64645 3.85355C3.45118 3.65829 3.45118 3.34171 3.64645 3.14645C3.82001 2.97288 4.08944 2.95359 4.2843 3.08859Z'
                        fill='currentColor'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </header>

            <div className='content-wrapper'>
              <div
                id='upload-context-files'
                style={{ display: showLiveSuggestions ? "none" : "block" }}
              >
                <div className='section'>
                  <h3>Upload meeting context files</h3>
                  <p className='upload-description'>
                    Want to get the best out of Amurex's real-time suggestions?
                    Just upload a file related to your meeting.
                  </p>

                  <h4 className='ideas-heading'>Some ideas:</h4>
                  <ul className='ideas-list'>
                    <li>Pitch or Sales Deck</li>
                    <li>Interview Questions</li>
                    <li>Cheat Sheet</li>
                  </ul>

                  <label htmlFor='file-input' className='file-upload-label'>
                    <svg
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15'
                        stroke='white'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M17 8L12 3L7 8'
                        stroke='white'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M12 3V15'
                        stroke='white'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                    Choose context file
                  </label>
                  <input
                    type='file'
                    id='file-input'
                    accept='.pdf,.doc,.docx,.txt,.ppt,.pptx'
                    onChange={handleFileChange}
                  />

                  <p className='supported-files'>Supported formats: PDF</p>

                  <div
                    id='upload-status'
                    dangerouslySetInnerHTML={{ __html: uploadStatus }}
                  ></div>
                </div>
              </div>

              <div
                id='live-suggestions'
                style={{ display: showLiveSuggestions ? "block" : "none" }}
              >
                <div className='section'>
                  <h3>Live Suggestions</h3>
                  <div id='qa-container' className='qa-container'>
                    {qaHistory.length > 0 ? (
                      qaHistory.map((qa, index) => (
                        <div key={index} className='qa-item'>
                          <div className='question'>
                            <div className='question-header'>
                              <span className='question-icon'>Q</span>
                              <span className='question-text'>
                                {qa.question}
                              </span>
                            </div>
                          </div>
                          <div className='answer'>
                            <div className='answer-header'>
                              <span className='answer-icon'>A</span>
                              <div
                                className='answer-text'
                                dangerouslySetInnerHTML={{ __html: qa.answer }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='no-qa'>
                        <p>
                          No questions detected yet. As the meeting progresses,
                          AI-generated suggestions will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <nav className='bottom-nav'>
              <button
                onClick={() => {
                  setRoute("/");
                }}
                className='nav-item action-btn'
              >
                <svg
                  className='nav-icon'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                >
                  <path
                    d='M4 6h16M4 12h16M4 18h7'
                    strokeWidth='2'
                    strokeLinecap='round'
                  />
                </svg>
                <span className='nav-label'>Summary</span>
              </button>
              <button
                onClick={() => {
                  setRoute("/chat");
                }}
                className='nav-item active action-btn'
              >
                <svg
                  className='nav-icon'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                >
                  <path
                    d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
                    strokeWidth='2'
                  />
                </svg>
                <span className='nav-label'>Live Suggestions</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatSidepanel;
