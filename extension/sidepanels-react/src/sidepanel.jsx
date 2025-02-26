import React, { useState, useEffect, useRef } from "react";
// import { Link } from "react-router-dom";
import "./sidepanel.css";

const Sidepanel = ({ setRoute, setMeetingId }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [summaryContent, setSummaryContent] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [emailList, setEmailList] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [sendButtonDisabled, setSendButtonDisabled] = useState(true);
  const [sendButtonText, setSendButtonText] = useState("Send");
  const [copyDropdownActive, setCopyDropdownActive] = useState(false);
  const summaryRef = useRef(null);
  const actionItemsRef = useRef(null);
  const copyDropdownRef = useRef(null);
  const exportDropdownRef = useRef(null);

  const AMUREX_CONFIG = {
    BASE_URL_BACKEND: "https://api.amurex.ai",
    BASE_URL_WEB: "https://app.amurex.ai",
    ANALYTICS_ENABLED: true,
  };

  const handleCloseSidebar = () => {
    // if (chrome && chrome.sidePanel) {
    window.close();
    // } else {
    //   console.log("Sidebar close action triggered");
    // }
  };

  useEffect(() => {
    // Add storage listener for redirectPath
    const handleStorageChange = (changes, namespace) => {
      if (namespace === "local" && changes.redirectPath) {
        const newRedirectPath = changes.redirectPath.newValue;
        if (newRedirectPath === "open_file_upload_panel") {
          setRoute("/chat");
          chrome.storage.local.set({ redirectPath: null });
        }
      }
    };

    // Add the listener
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Initial check
    if (chrome.storage.local) {
      chrome.storage.local.get("redirectPath").then((result) => {
        if (result.redirectPath === "open_file_upload_panel") {
          setRoute("/chat");
          chrome.storage.local.set({ redirectPath: null });
        }
      });
    }

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [setRoute]);

  // useEffect(() => {
  //   if (chrome.storage.local) {
  //     chrome.storage.local.get("redirectPath").then((result) => {
  //       if (result.redirectPath === "open_file_upload_panel") {
  //         setRoute("/chat");
  //         chrome.storage.local.set({ redirectPath: null });
  //       }
  //     });
  //   }
  // }, [setRoute]);

  useEffect(() => {
    function setupCookieListener(updateUI) {
      // Listen for cookie changes
      chrome.cookies.onChanged.addListener((changeInfo) => {
        const cookie = changeInfo.cookie;
        const isProd = cookie.domain.includes(AMUREX_CONFIG.BASE_URL_WEB);

        if (cookie.name === "amurex_session" && isProd) {
          // Cookie was added or removed
          const isAuthenticated = !changeInfo.removed && cookie.value;
          updateUI(isAuthenticated);
        }
      });

      // Initial check
      checkSession(updateUI);
    }

    function checkSession(updateUI) {
      // Check localhost first
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
    }

    async function getSession() {
      let session = await chrome.cookies.get({
        url: AMUREX_CONFIG.BASE_URL_WEB,
        name: "amurex_session",
      });
      if (session && session.value) {
        return session.value;
      }
      return null;
    }

    async function checkNavItem() {
      chrome.storage.local.get(["redirect", "meetingId"]).then((result) => {
        chrome.storage.local.set({ redirect: null });
        chrome.storage.local.set({ meetingId: null });

        const value = result.redirect;
        const meetingId = result.meetingId;

        if (value === "open_file_upload_panel") {
          if (meetingId) {
            setRoute("/chat");
            setMeetingId(meetingId);
            chrome.storage.local.set({ meetingId });
            // In React Router, we'll use navigation instead of changing window.location
            // window.history.pushState({}, "", `/chat?meetingId=${meetingId}`);
            // window.dispatchEvent(new PopStateEvent("popstate"));
          } else {
            setRoute("/chat");
            // window.history.pushState({}, "", "/chat");
            // window.dispatchEvent(new PopStateEvent("popstate"));
          }
        } else if (value === "chatsidepanel") {
          setRoute("/chat");
          // window.history.pushState({}, "", "/chat");
          // window.dispatchEvent(new PopStateEvent("popstate"));
        } else if (value === "live_suggestions") {
          setRoute("/chat");
          // window.history.pushState({}, "", "/suggestions");
          // window.dispatchEvent(new PopStateEvent("popstate"));
        } else if (value === "settings") {
          chrome.tabs.create({
            url: `${AMUREX_CONFIG.BASE_URL_WEB}/settings`,
          });
        }
      });
    }

    function deleteKeysFromStorage() {
      const keysToDelete = ["mId"];

      chrome.storage.local.remove(keysToDelete, function () {
        if (chrome.runtime.lastError) {
          console.error("Error deleting keys:", chrome.runtime.lastError);
        } else {
          console.log(`Keys deleted: ${keysToDelete.join(", ")}`);
        }
      });
    }

    async function fetchAINotes() {
      try {
        // Show loading state
        setSummaryContent(
          '<div class="loading">Generating meeting notes...</div>'
        );
        setActionItems('<div class="loading">Generating action items...</div>');

        // Get transcript from storage
        const result = await chrome.storage.local.get(["transcript"]);

        if (!result.transcript || result.transcript.length === 0) {
          setSummaryContent(
            "<p>No transcript available to generate notes.</p>"
          );
          setActionItems("<p>No action items available.</p>");
          return;
        }

        // Format transcript data
        let formattedTranscript = result.transcript
          .map((entry) => ({
            personName: entry.personName,
            timeStamp: entry.timeStamp,
            transcriptText: entry.personTranscript,
          }))
          .map(
            (entry) =>
              `${entry.personName} (${entry.timeStamp})\n${entry.transcriptText}\n`
          )
          .join("");

        // Get userId first
        const userIdResponse = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ action: "getUserId" }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });

        const getMeetingId = async () => {
          const result = await chrome.storage.local.get("mId");
          return result.mId; // Extract the meetingId value
        };

        const userId = userIdResponse.userId;
        const meetingId = await getMeetingId();

        console.log(`Meeting ID retrieved: ${meetingId}`);
        console.log(`User ID retrieved: ${userId}`);

        let resultString = "";
        let plt = await chrome.storage.local.get("platform");
        let pltprop = plt.platform;

        if (pltprop === "msteams") {
          // Filter duplicates and group by speaker
          const uniqueMessages = Object.entries(result.transcript).reduce(
            (acc, [key, value]) => {
              if (key === "transcript" && Array.isArray(value)) {
                // First remove duplicates
                const withoutDuplicates = value.filter((item, index, array) => {
                  if (index === 0) return true;
                  const prev = array[index - 1];
                  return !(
                    item.message === prev.message &&
                    item.speaker === prev.speaker
                  );
                });

                // Then group consecutive messages by speaker
                const groupedTranscript = withoutDuplicates.reduce(
                  (grouped, current, index, array) => {
                    if (
                      index === 0 ||
                      current.speaker !== array[index - 1].speaker
                    ) {
                      // Start new group
                      grouped.push({
                        speaker: current.speaker,
                        message: current.message,
                        timestamp: current.timestamp,
                      });
                    } else {
                      // Append to last group's message
                      const lastGroup = grouped[grouped.length - 1];
                      lastGroup.message += ". " + current.message;
                    }
                    return grouped;
                  },
                  []
                );

                return { ...acc, [key]: groupedTranscript };
              }
              return { ...acc, [key]: value };
            },
            {}
          );

          // Format the transcript in the desired style
          formattedTranscript = Object.values(uniqueMessages)
            .map((entry) => {
              return `${entry.speaker} (${entry.timestamp})\n${entry.message}\n`;
            })
            .join("\n");
        }

        const body = {
          transcript: formattedTranscript,
          meeting_id: meetingId,
          user_id: userId,
        };

        // Make API request
        fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/end_meeting`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        })
          .then((response) => response.json())
          .then((data) => {
            // Display the Notion link and meeting notes
            setSummaryContent(`
            <div class="notes-content">${
              data.notes_content
                ? data.notes_content
                    .trim()
                    .split("\n")
                    .filter((line) => line.trim() !== "")
                    .map((line) => {
                      // Skip lines containing "Meeting Notes"
                      if (line.includes("Meeting Notes")) {
                        return "";
                      }
                      // Handle headers and list items
                      if (line.startsWith("### ")) {
                        return `<h4>${line.substring(4)}</h4>`;
                      } else if (line.startsWith("## ")) {
                        return `<h3>${line.substring(3)}</h3>`;
                      } else if (line.startsWith("# ")) {
                        return `<h2>${line.substring(2)}</h2>`;
                      } else if (
                        line.startsWith("- ") ||
                        line.startsWith("* ") ||
                        line.startsWith(" -")
                      ) {
                        return `<li>${line.substring(2)}</li>`; // Handle list items
                      } else {
                        return line // Keep other lines as is
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(
                            /\[(.*?)\]\((.*?)\)/g,
                            '<a href="$2">$1</a>'
                          );
                      }
                    })
                    .join("\n") // Restore newlines
                    .replace(
                      /(<li>.*?<\/li>)\n?(<li>.*?<\/li>)+/g,
                      (list) => `<ul>${list}</ul>`
                    ) // Wrap consecutive list items
                    .replace(/\n/g, "<br>") // Convert remaining newlines to <br>
                : "No meeting notes available."
            }</div>
          `);

            // Display the action items with markdown formatting
            setActionItems(`
            <div class="action-items">${
              data.action_items || "No action items available."
            }</div>
          `);

            // Add this after the actionItemsDiv.innerHTML line:
            // generateEmailOptions(data);
            deleteKeysFromStorage();
          })
          .catch((error) => {
            console.error("Error fetching or parsing meeting notes:", error);
            setSummaryContent(
              "<p>Failed to generate meeting notes. Please try again later.</p>"
            );
            setActionItems(
              "<p class='error-details'>Error: Failed to process server response</p>"
            );
          });
      } catch (error) {
        console.error("Error generating notes:", error);
        setSummaryContent(
          "<p>Failed to generate meeting notes. Please try again later.</p>"
        );
        setActionItems("<p class='error-details'>Error: ${error.message}</p>");
      }
    }

    // Initialize the component
    const updateUI = (isAuth) => {
      setIsAuthenticated(isAuth);
    };

    checkSession(updateUI);
    setupCookieListener(updateUI);
    checkNavItem();
    fetchAINotes();

    // Cleanup function
    return () => {
      chrome.cookies.onChanged.removeListener((changeInfo) => {
        const cookie = changeInfo.cookie;
        const isProd = cookie.domain.includes(AMUREX_CONFIG.BASE_URL_WEB);

        if (cookie.name === "amurex_session" && isProd) {
          const isAuthenticated = !changeInfo.removed && cookie.value;
          updateUI(isAuthenticated);
        }
      });
    };
  }, []);

  const handlePreviousTranscripts = async () => {
    chrome.tabs.create({
      url: `${AMUREX_CONFIG.BASE_URL_WEB}/meetings`,
      active: true,
    });
  };

  const handleSettings = () => {
    chrome.tabs.create({
      url: `${AMUREX_CONFIG.BASE_URL_WEB}/settings`,
      active: true,
    });
  };

  const handleSignIn = () => {
    chrome.tabs.create({
      url: `${AMUREX_CONFIG.BASE_URL_WEB}/login`,
      active: true,
    });
  };

  const handleSignUp = () => {
    chrome.tabs.create({
      url: `${AMUREX_CONFIG.BASE_URL_WEB}/signup`,
      active: true,
    });
  };

  const handleSectionCopy = (ref) => {
    if (ref.current) {
      const range = document.createRange();
      range.selectNode(ref.current);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand("copy");
      window.getSelection().removeAllRanges();

      // Show feedback
      const feedbackEl = document.createElement("div");
      feedbackEl.className = "copy-feedback";
      feedbackEl.textContent = "Copied!";
      document.body.appendChild(feedbackEl);

      setTimeout(() => {
        feedbackEl.remove();
      }, 2000);
    }
  };

  const handleSectionEdit = (ref) => {
    if (ref.current) {
      ref.current.contentEditable = true;
      ref.current.focus();

      // Add event listener for blur to save changes
      ref.current.addEventListener(
        "blur",
        () => {
          ref.current.contentEditable = false;
        },
        { once: true }
      );
    }
  };

  const handleEmailInputChange = (e) => {
    setEmailInput(e.target.value);
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && email.includes("@")) {
      setEmailList([...emailList, email]);
      setEmailInput("");
      setSendButtonDisabled(false);
    }
  };

  const handleRemoveEmail = (index) => {
    const newList = [...emailList];
    newList.splice(index, 1);
    setEmailList(newList);
    setSendButtonDisabled(newList.length === 0);
  };

  const handleSendEmails = async () => {
    setSendButtonText("Sending...");

    try {
      // Implementation for sending emails would go here

      // Show success
      setSendButtonText("Sent ✓");
      setTimeout(() => {
        setSendButtonText("Send");
      }, 3000);
    } catch (error) {
      console.error("Error sending emails:", error);
      setSendButtonText("Failed");
      setTimeout(() => {
        setSendButtonText("Send");
      }, 3000);
    }
  };

  const toggleExportDropdown = () => {
    setCopyDropdownActive(!copyDropdownActive);
  };

  const handleCopyToClipboard = () => {
    // Combine summary and action items
    const summaryText = summaryRef.current ? summaryRef.current.innerText : '';
    const actionItemsText = actionItemsRef.current ? actionItemsRef.current.innerText : '';
    
    const combinedText = `# Meeting Summary\n\n${summaryText}\n\n# Action Items\n\n${actionItemsText}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(combinedText).then(() => {
      // Show feedback
      const feedbackEl = document.createElement("div");
      feedbackEl.className = "copy-feedback";
      feedbackEl.textContent = "Copied to clipboard!";
      document.body.appendChild(feedbackEl);

      setTimeout(() => {
        feedbackEl.remove();
      }, 2000);
      
      // Close dropdown
      setCopyDropdownActive(false);
    });
  };

  const handleExportToApps = () => {
    // This would typically open another dropdown or modal with app options
    // For now, we'll just close the dropdown
    setCopyDropdownActive(false);
    
    // Open export options in the web app
    chrome.tabs.create({
      url: `${AMUREX_CONFIG.BASE_URL_WEB}/export`,
      active: true,
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setCopyDropdownActive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div>
      <div
        id='auth-container'
        className='auth-container'
        style={{ display: isAuthenticated ? "none" : "block" }}
      >
        <div className='auth-content'>
          <h2>Sign in to Amurex</h2>
          <p>Sign in to access your meeting notes and summaries.</p>
          <div className='auth-buttons'>
            <button
              id='sign-in-btn'
              className='sign-in-btn'
              onClick={handleSignIn}
            >
              Sign In
            </button>
            <button
              id='sign-up-btn'
              className='sign-up-btn'
              onClick={handleSignUp}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>

      <div
        id='main-container'
        className='main-container'
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
          {/* Export Notes Button */}
          <div className='button-group'>
            <div className={`dropdown ${copyDropdownActive ? 'active' : ''}`} ref={exportDropdownRef}>
              <button id='export-button' className='black-btn' onClick={toggleExportDropdown}>
                <span>Export Notes</span>
                <svg
                  className='dropdown-arrow'
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                >
                  <path
                    d='M6 9L12 15L18 9'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
              <div className='dropdown-menu'>
                <button id='copy-to-clipboard' className='dropdown-item' onClick={handleCopyToClipboard}>
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                  >
                    <path
                      d='M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24853C20 6.77534 19.7893 6.32459 19.4142 6.00001L16.9983 3.75735C16.6232 3.43277 16.1725 3.22205 15.6993 3.22205H10C8.89543 3.22205 8 4.11748 8 5.22205'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                  <span>Copy to clipboard</span>
                </button>
                <button id='share-to-apps' className='dropdown-item' onClick={handleExportToApps}>
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                  >
                    <path
                      d='M18 8A3 3 0 1 0 15 5m3 3v8M6 15a3 3 0 1 0 3 3m-3-3V8m6 4a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                  <span>Export to apps</span>
                </button>
              </div>
            </div>

            <button className='action-btn purple'>
              <svg
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M7 10L12 15L17 10'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M12 15V3'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
              Save transcript
            </button>
          </div>

          {/* Action Items Section */}
          <div className='section'>
            <div className='section-header'>
              <h3>Action items</h3>
              <div className='section-actions'>
                <button
                  className='action-btn copy-btn'
                  onClick={() => handleSectionCopy(actionItemsRef)}
                >
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24853C20 6.77534 19.7893 6.32459 19.4142 6.00001L16.9983 3.75735C16.6232 3.43277 16.1725 3.22205 15.6993 3.22205H10C8.89543 3.22205 8 4.11748 8 5.22205'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                    <path
                      d='M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </button>
                <button
                  className='action-btn edit-btn'
                  onClick={() => handleSectionEdit(actionItemsRef)}
                >
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                    <path
                      d='M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div
              id='action-items'
              ref={actionItemsRef}
              className='action-items'
              dangerouslySetInnerHTML={{ __html: actionItems }}
            ></div>
          </div>

          {/* Summary Section */}
          <div className='section'>
            <div className='section-header'>
              <h3>Summary</h3>
              <div className='section-actions'>
                <button
                  className='action-btn copy-btn'
                  onClick={() => handleSectionCopy(summaryRef)}
                >
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24853C20 6.77534 19.7893 6.32459 19.4142 6.00001L16.9983 3.75735C16.6232 3.43277 16.1725 3.22205 15.6993 3.22205H10C8.89543 3.22205 8 4.11748 8 5.22205'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                    <path
                      d='M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </button>
                <button
                  className='action-btn edit-btn'
                  onClick={() => handleSectionEdit(summaryRef)}
                >
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                    <path
                      d='M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div
              id='meeting-summary'
              ref={summaryRef}
              className='meeting-summary'
              dangerouslySetInnerHTML={{ __html: summaryContent }}
            ></div>
          </div>
        </div>

        <nav className='bottom-nav'>
          <button
            className='nav-item action-btn-2 active'
            onClick={() => setRoute("/")}
          >
            <svg
              className='nav-icon'
              viewBox='0 0 24 24'
              fill='none'
              stroke='rgba(255, 255, 255, 0.5)'
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
            to='/chat'
            id='live-suggestions-button'
            className='nav-item action-btn-2'
            onClick={() => setRoute("/chat")}
          >
            <svg
              className='nav-icon'
              viewBox='0 0 24 24'
              fill='none'
              stroke='rgba(255, 255, 255, 0.5)'
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
    </div>
  );
};

export default Sidepanel;
