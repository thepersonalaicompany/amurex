const plt = {platform: "msteams"};
chrome.storage.local.set(plt);
console.log("MS teams platform local variable has been set");

async function isAuthenticated() {
    try {
      // Send message to background script to check cookies
      const response = await chrome.runtime.sendMessage({
        action: "checkAuthentication",
        cookies: [
          {
            url: "http://localhost:3000",
            name: "amurex_session",
          },
          {
            url: "https://app.amurex.ai",
            name: "amurex_session",
          },
        ],
      });
  
      return response.is_authenticated;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
}

function setupWebSocket(meetingId) {
    console.log("Setting up WebSocket");
  
    // Get userId first, then set up WebSocket
    chrome.runtime.sendMessage(
      {
        action: "getUserId",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error getting user id:", chrome.runtime.lastError);
          return;
        }
  
        const userId = response.userId;
        console.log("WS User ID:", userId);
        console.log("WS Meeting ID:", meetingId);
  
        // const setMeetingId = async (mId) => {
        //   return new Promise((resolve, reject) => {
        //     chrome.storage.local.set({ mId }, () => {
        //       if (chrome.runtime.lastError) {
        //         return reject(chrome.runtime.lastError);
        //       }
        //       resolve(`WS Meeting ID set to: ${mId}`);
        //     });
        //   });
        // };
  
        // (async () => {
        //   try {
        //     const result = await setMeetingId(meetingId);
        //     console.log(result);
        //   } catch (error) {
        //     console.error("Error setting Meeting ID:", error);
        //   }
        // })();
  
        // https://a8f8-162-205-132-11.ngrok-free.app

        // const wsUrl = `wss://${BASE_URL_BACKEND.replace(
        //   "https://",
        //   ""
        // )}/ws?meeting_id=${meetingId}&user_id=${userId}`;

        const wsUrl = `wss://a8f8-162-205-132-11.ngrok-free.app/ws?meeting_id=${meetingId}&user_id=${userId}`;
  
        console.log("WebSocket URL:", wsUrl);
  
        ws = new WebSocket(wsUrl);
  
        ws.onopen = () => {
          console.log("WebSocket Connected");
        };
  
        ws.onclose = () => {
          console.log("WebSocket Disconnected");
          // Attempt to reconnect after 5 seconds
        };
  
        ws.onerror = (error) => {
          console.error("WebSocket Error:", error);
        };
      }
    );
}

function overWriteChromeStorage(keys, sendDownloadMessage) {
    const objectToSave = {};
    // Hard coded list of keys that are accepted
    if (keys.includes("userName")) objectToSave.userName = userName;
    if (keys.includes("transcript")) objectToSave.transcript = transcript;
    if (keys.includes("meetingTitle")) objectToSave.meetingTitle = meetingTitle;
    if (keys.includes("meetingStartTimeStamp"))
      objectToSave.meetingStartTimeStamp = meetingStartTimeStamp;
    if (keys.includes("chatMessages")) objectToSave.chatMessages = chatMessages;
  
    chrome.storage.local.set(objectToSave, function () {
      console.log("Saved to chrome storage", keys);
    });
}

const timeFormat = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
};

let meetingStartTimeStamp = new Date()
    .toLocaleString("default", timeFormat)
    .replace(/[/:]/g, "-")
    .toUpperCase();
overWriteChromeStorage(["meetingStartTimeStamp"], false);

// Ensure these variables are defined globally
let captionsActivated = false;
let observerInitialized = false;
let transcriptMessages = [];
let transcript = [];

function showNotification(extensionStatusJSON) {
    // Banner CSS
    let html = document.querySelector("html");
    let obj = document.createElement("div");
    let logo = document.createElement("img");
    let text = document.createElement("p");
  
    // Style the container
    obj.style.cssText = `
        position: fixed;
        top: 20px;
        right: 50%;
        transform: translateX(50%);
        background: black;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        width: 400px;
        font-family: "Host Grotesk", sans-serif;
      `;
  
    // Style logo
    logo.setAttribute(
      "src",
      "https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
    );
    logo.setAttribute("height", "32px");
    logo.setAttribute("width", "32px");
    logo.style.cssText = "border-radius: 4px";
  
    // Style text
    text.style.cssText = `
        color: ${extensionStatusJSON.status === 200 ? "#fff" : "#c76dcc"};
        margin: 10px 0;
      `;
    text.innerHTML = extensionStatusJSON.message;
  
    // Watch for the end button
    const checkEndButton = setInterval(() => {
      const endButtonExists = contains(
        meetingEndIconData.selector,
        meetingEndIconData.text
      ).length > 0;
  
      if (endButtonExists) {
        obj.style.display = "none";
        clearInterval(checkEndButton);
      }
    }, 1000);
  
    obj.appendChild(logo);
    obj.appendChild(text);
    if (html) html.append(obj);
}

// Generate a UUID for the meeting ID
const generateMeetingId = () => {
    return 'ms-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

function showNotificationContextual(extensionStatusJSON) {
    // Banner CSS
    let html = document.querySelector("html");
    let obj = document.createElement("div");
    let logo = document.createElement("img");
    let text = document.createElement("p");
    let buttonContainer = document.createElement("div");
    obj.style.backgroundColor = "black";
  
    logo.setAttribute(
      "src",
      "https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
    );
    logo.setAttribute("height", "32px");
    logo.setAttribute("width", "32px");
    logo.style.cssText = "border-radius: 4px";
  
    // Style the button container
    buttonContainer.style.cssText =
      "display: flex; justify-content: center; margin-top: 10px;";
  
    // Create Open Panel button
    let openPanelButton = document.createElement("button");
    openPanelButton.textContent = "Upload Meeting Files";
    openPanelButton.style.cssText = `
      background: #c76dcc;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-family: "Host Grotesk", sans-serif;
      font-weight: 500;
      transition: background 0.2s;
    `;
  
    openPanelButton.addEventListener("mouseover", () => {
      openPanelButton.style.background = "#c76dcc";
    });
  
    openPanelButton.addEventListener("mouseout", () => {
      openPanelButton.style.background = "#c76dcc";
    });
  
    // Add click handler
    openPanelButton.addEventListener("click", () => {
      const meetingId = window.location.pathname.split("/")[1].split("?")[0];
      chrome.runtime.sendMessage({
        type: "open_file_upload_panel",
        meetingId: meetingId,
      });
      obj.remove(); // Remove notification after clicking
    });
  
    // Remove banner after 5s
    setTimeout(() => {
      obj.style.display = "none";
    }, 5000);
  
    if (extensionStatusJSON.status == 200) {
      obj.style.cssText = `color: #2A9ACA; ${commonCSS}`;
      text.innerHTML = extensionStatusJSON.message;
    } else {
      obj.style.cssText = `color: orange; ${commonCSS}`;
      text.innerHTML = extensionStatusJSON.message;
    }
  
    buttonContainer.appendChild(openPanelButton);
    obj.prepend(buttonContainer);
    obj.prepend(text);
    obj.prepend(logo);
    if (html) html.append(obj);
}

// Function to check if a Teams meeting has started
async function checkTeamsMeetingStart() {
    const is_authenticated = await isAuthenticated();
    if (!is_authenticated) {
      showNotification({
        status: 401,
        message: "<strong>Please sign in to Amurex</strong> <br /> Click on the extension icon to sign in.",
      });
    }

    const meetingStartIndicator = document.querySelector("#hangup-button");

    // Check if meeting is active and captions haven't been activated yet
    if (meetingStartIndicator && !captionsActivated) {
        console.log("Microsoft Teams meeting has started.");
        captionsActivated = true;

        try {
            await activateCaptionsInTeams();
            
            // First click show more button
            const showMoreButton = document.getElementById("callingButtons-showMoreBtn");
            if (!showMoreButton) {
                console.log("Show more button not found");
                return;
            }
            
            console.log("Clicking show more button");
            showMoreButton.click();
            
            // Then wait for and click meeting info button
            const meetingInfoButton = await waitForElement("meeting-info-button", 5000);
            if (!meetingInfoButton) {
                console.log("Meeting info button not found");
                return;
            }
            
            console.log("Clicking meeting info button");
            meetingInfoButton.click();
            
            // Wait for meeting info panel to appear
            const appLayoutArea = await new Promise((resolve) => {
                const observer = new MutationObserver((mutations, obs) => {
                    const element = document.querySelector('[data-tid="app-layout-area--end"]');
                    if (element) {
                        obs.disconnect();
                        resolve(element);
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                // Timeout after 5 seconds
                setTimeout(() => {
                    observer.disconnect();
                    resolve(null);
                }, 5000);
            });

            if (!appLayoutArea) {
                console.log("App layout area did not appear");
                return;
            }

            // Wait for meeting info text to appear
            const meetingInfoDiv = await new Promise((resolve) => {
                const observer = new MutationObserver((mutations, obs) => {
                    const element = appLayoutArea.querySelector('div.me-email-text');
                    if (element) {
                        obs.disconnect();
                        resolve(element);
                    }
                });

                observer.observe(appLayoutArea, {
                    childList: true,
                    subtree: true
                });

                // Timeout after 5 seconds
                setTimeout(() => {
                    observer.disconnect();
                    resolve(null);
                }, 5000);
            });

            if (!meetingInfoDiv) {
                console.log("Meeting info text not found");
                return;
            }

            // Extract meeting ID
            const meetingIdMatch = meetingInfoDiv.textContent.match(/Meeting ID:\s*(\d+\s*\d+\s*\d+\s*\d+\s*\d+)/);
            if (meetingIdMatch) {
                const meetingId = meetingIdMatch[1].replace(/\s+/g, '');
                console.log('Extracted Meeting ID:', meetingId);
                chrome.storage.local.set({ meetingId });
                
                // Set up websocket with the extracted meetingId directly
                setupWebSocket(meetingId);

                console.log(`this is observerinitialized: ${observerInitialized}`);
                
                // Initialize the observer only once
                if (!observerInitialized) {
                    await waitForTranscriptWrapper();
                    setupObserver();
                    console.log(`this is captionsactivated: ${captionsActivated}`);
                    observerInitialized = true;

                    const setMeetingId = async (mId) => {
                        return new Promise((resolve, reject) => {
                            chrome.storage.local.set({ mId }, () => {
                                if (chrome.runtime.lastError) {
                                    return reject(chrome.runtime.lastError);
                                }
                                resolve(`Meeting ID set to: ${mId}`);
                            });
                        });
                    };
                
                    try {
                        const result = await setMeetingId(meetingId);
                        console.log(result);
                    } catch (error) {
                        console.error("Error setting Meeting ID:", error);
                    }
                }
            }
            
            // Close the panel
            const closeButton = await waitForElement("rail-header-close-button", 5000);
            if (!closeButton) {
                console.log("Close button not found");
                return;
            }
            
            console.log("Closing meeting info panel");
            closeButton.click();

            // setting up websocket to create a new late_meeting record in supabase
            await waitForMeetingId(window);
        } catch (error) {
            console.error("Error during meeting start sequence:", error);
        }
    } else if (!meetingStartIndicator) {
        // Reset flags when meeting ends
        captionsActivated = false;
        observerInitialized = false;
        
        // Save the transcript to local storage when the meeting ends
        if (transcriptMessages.length > 0) {
            localStorage.setItem('transcript', JSON.stringify(transcriptMessages));
            console.log("Transcript saved as local variable.");

            // Retrieve and process the transcript
            transcript = JSON.parse(localStorage.getItem('transcript'));

            // Convert the transcript object into a formatted string
            let transcriptString = transcript.map(entry => {
                return `Time: ${entry.timestamp}\nSpeaker: ${entry.speaker}\nText: ${entry.message}\n---`;
            }).join('\n\n');

            console.log("Formatted Transcript:\n" + transcriptString);
        
            storeTranscript();
            chrome.runtime.sendMessage({ type: "meeting_ended" });
            chrome.runtime.sendMessage({ type: "open_side_panel" });
            transcriptMessages = []; // Clear the messages after saving
        }
    }
}

// Function to activate captions in Teams
function activateCaptionsInTeams() {
    return new Promise(async (resolve) => {
        try {
            // Step 1: Click show more button and wait for menu
            const showMoreButton = document.getElementById("callingButtons-showMoreBtn");
            if (!showMoreButton) {
                console.log("Show more button not found");
                return resolve();
            }
            
            console.log("Clicking show more button");
            showMoreButton.click();
            
            // Wait for language menu to appear
            const languageSpeechMenuControl = await waitForElement("LanguageSpeechMenuControl-id", 5000);
            if (!languageSpeechMenuControl) {
                console.log("Language menu did not appear");
                return resolve();
            }

            console.log("Clicking language menu");
            languageSpeechMenuControl.click();

            // Wait for captions button to appear
            const captionsButton = await waitForElement("closed-captions-button", 5000);
            if (!captionsButton) {
                console.log("Captions button did not appear");
                return resolve();
            }

            console.log("Clicking captions button");
            captionsButton.click();
            console.log("Captions activated in Microsoft Teams");
            hideCaptionsRenderer();
            resolve();

        } catch (error) {
            console.error("Error activating captions:", error);
            resolve();
        }
    });
}

// Helper function to wait for an element
function waitForElement(elementId, timeout) {
    return new Promise((resolve) => {
        const element = document.getElementById(elementId);
        if (element) {
            return resolve(element);
        }

        const startTime = Date.now();
        const observer = new MutationObserver(() => {
            const element = document.getElementById(elementId);
            if (element) {
                observer.disconnect();
                resolve(element);
            } else if (Date.now() - startTime >= timeout) {
                observer.disconnect();
                resolve(null);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// Function to wait for the transcript wrapper to load
function waitForTranscriptWrapper() {
    return new Promise((resolve) => {
        const checkWrapper = setInterval(() => {
            const transcriptWrapper = document.querySelector('[data-tid="closed-caption-v2-window-wrapper"]');

            if (transcriptWrapper) {
                clearInterval(checkWrapper);
                resolve(); // Resolve the promise when the wrapper is found
            }
        }, 1000); // Check every 500 milliseconds
    });
}


function storeTranscript() {
    // Prepare the object to save
    const objectToSave = {
        transcript: transcript, // Assuming 'transcript' is your transcript array
        // Add any other data you want to store
    };

    // Store the transcript in local storage
    chrome.storage.local.set(objectToSave, function () {
        console.log("Transcript saved to chrome storage");
    });
}


function setupObserver() {
    const transcriptWrapper = document.querySelector('[data-tid="closed-caption-v2-window-wrapper"]');
    
    if (transcriptWrapper) {
        console.log("Found the transcript wrapper");

        const virtualListContent = transcriptWrapper.querySelector('[data-tid="closed-caption-v2-virtual-list-content"]');

        if (virtualListContent) {
            console.log("Found the virtual list content");

            const config = { childList: true, subtree: true };

            const callback = (mutationsList, observer) => {
                mutationsList.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && node.matches('div')) {
                                const messageDivs = node.querySelectorAll('.ui-chat__item__message');
                                messageDivs.forEach(messageDiv => {
                                    const nameElement = messageDiv.querySelector('.ui-chat__message__author');
                                    const messageElement = messageDiv.querySelector('[data-tid="closed-caption-text"]');
                                    
                                    const speakerName = nameElement ? nameElement.textContent.trim() : "Unknown";
                                    const messageText = messageElement ? messageElement.textContent.trim() : "";

                                    // Push the initial message to transcriptMessages
                                    transcriptMessages.push({ 
                                        speaker: speakerName, 
                                        message: messageText,
                                        timestamp: new Date().toLocaleString() // Add local timestamp
                                    });

                                    // Set up an observer for the message text element
                                    const messageObserver = new MutationObserver(() => {
                                        const updatedMessageText = messageElement.textContent.trim();
                                        console.log(`updatedMessageText: ${updatedMessageText}`);
                                        if (updatedMessageText !== messageText) {
                                            console.log(`Updated Message: ${updatedMessageText}`);
                                            // Update the last message in the transcript array
                                            const lastMessage = transcriptMessages[transcriptMessages.length - 1];
                                            lastMessage.message = updatedMessageText;
                                            // No need to update timestamp for edits
                                        }
                                    });

                                    messageObserver.observe(messageElement, { childList: true, characterData: true, subtree: true });
                                });

                                // here
                            } else {
                                console.log("Node does not match expected chat message structure.");
                            }
                        });
                    }
                });
            };

            const observer = new MutationObserver(callback);
            observer.observe(virtualListContent, config);

            console.log("MutationObserver initialized for Microsoft Teams transcript.");
        } else {
            console.log("No virtual list content found. Retrying in 500ms...");
            setTimeout(setupObserver, 1000); // Retry after 500 milliseconds
        }
    } else {
        console.log("Transcript wrapper not found. Waiting for content...");
        // Optionally, you can set a timeout or retry mechanism here
    }
}

// Function to add CSS to hide captions renderer
function hideCaptionsRenderer() {
    const style = document.createElement('style');
    style.textContent = `
        [data-tid="closed-caption-renderer-wrapper"] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

// Set an interval to check for meeting start every second
setInterval(checkTeamsMeetingStart, 1000);

function waitForMeetingId(context) {
    return new Promise((resolve) => {
        if (context.meetingIdObj) {
            resolve();
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (context.meetingIdObj) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}