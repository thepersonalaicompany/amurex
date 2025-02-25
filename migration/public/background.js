const AMUREX_CONFIG = {
  // there is one more config in the content.js script
  BASE_URL_BACKEND: "https://api.amurex.ai",
  BASE_URL_WEB: "https://app.amurex.ai",
  ANALYTICS_ENABLED: true
};

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    // Open welcome page in new tab
    chrome.tabs.create({
      url: AMUREX_CONFIG.BASE_URL_WEB + "/signup?welcome=true",
    });
  } else if (details.reason == "update") {
    let thisVersion = chrome.runtime.getManifest().version;
    console.log(
      "Updated from " + details.previousVersion + " to " + thisVersion + "!"
    );
  }
});

async function getUserId() {
  session = await chrome.cookies.get({
    url: AMUREX_CONFIG.BASE_URL_WEB,
    name: "amurex_session",
  });
  if (session && session.value) {
    const decodedSession = JSON.parse(decodeURIComponent(session.value));
    const userId = decodedSession.user.id;
    return userId;
  }
  return null;
}

async function getPlatform() {
  const platform = await chrome.storage.local.get("platform");
  return platform.platform;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type == "new_meeting_started") {
    // Saving current tab id, to download transcript when this tab is closed
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      chrome.storage.local.set({ meetingTabId: tabId }, function () {
        console.log("Meeting tab id saved");
      });
    });
  } else if (message.type == "download") {
    // Invalidate tab id since transcript is downloaded, prevents double downloading of transcript from tab closed event listener
    downloadTranscript();
  } else if (message.action === "getUserId") {
    getUserId().then(userId => {
      sendResponse({ userId });
    });
    return true; // Required to use sendResponse asynchronously
  } else if (message.action === "checkAuthentication") {
    console.log("Received checkAuthentication message", message);
    
    // Check if any of the cookies exist
    const checkCookies = async () => {
      for (const cookieInfo of message.cookies) {
        try {
          const cookie = await chrome.cookies.get({
            url: cookieInfo.url,
            name: cookieInfo.name
          });
          
          if (cookie && cookie.value) {
            console.log("Found valid cookie at", cookieInfo.url);
            return { is_authenticated: true, cookie };
          }
        } catch (error) {
          console.error("Error checking cookie:", error);
        }
      }
      
      console.log("No valid cookies found");
      return { is_authenticated: false };
    };
    
    checkCookies().then(result => {
      console.log("Sending authentication result:", result);
      sendResponse(result);
    });
    
    return true; // Required to use sendResponse asynchronously
  } else if ( message.type === "meeting_ended") {
    chrome.storage.local.set({ hasMeetingEnded: true }, function () {
      console.log("Meeting ended flag set");
    });
    // deleteKeysFromStorage();
  } 
    else if (
    message.type === "open_side_panel" ||
    message.type === "open_late_meeting_side_panel" ||
    message.type === "open_file_upload_panel"
  ) {
    const pathMap = {
      open_side_panel: "index.html",
      open_file_upload_panel: `index.html?page=liveSuggestions`
    };

    const panelPath = pathMap[message.type];

    // Set options first
    chrome.sidePanel.setOptions({
      tabId: sender.tab.id,
      path: panelPath,
      enabled: true,
    });

    // Open the panel
    chrome.sidePanel.open({ tabId: sender.tab.id });

    // Set storage values
    chrome.storage.local.set({ redirect: message.type });
    
    if (message.meetingId) {
      chrome.storage.local.set({ meetingId: message.meetingId });
    }

    // Set the navigation item
    let navItem;
    if (message.type === "open_file_upload_panel") {
      navItem = "file_upload_panel";
    } else if (message.type === "open_side_panel") {
      // Make tracking request with valid userId
      (async () => {
        const userId = await getUserId();
        if (userId) {
          fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/track`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ 
              uuid: userId,
              event_type: "open_sidepanel",
              meeting_id: "unknown"
            }),
          }).catch(error => {
            console.error("Error tracking sidepanel open:", error);
          });
        }
      })();
      navItem = "sidepanel";
    } else {
      console.error("Invalid side panel type");
    }

    chrome.storage.local.set({ navItem });
  } else if (message.type === "fetch_late_summary") {
    console.log("Fetching late summary");
    console.log(message);
    fetchLateSummary(message.meetingId)
      .then(data => { 
        console.log("Late summary fetched");
        console.log(data);
        
        sendResponse({ success: true, data }); })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  } else if (message.type === 'check_meeting_status') {
    const checkUrl = `${message.baseUrl}/check_meeting/${message.meetingId}`;
    
    // First try without the header
    fetch(checkUrl, {
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(response => response.json())
      .catch(() => {
        return fetch(checkUrl, {
          headers: {
            'Accept': 'application/json',
          }
        }).then(response => response.json());
      })
      .then(data => {
        sendResponse(data);
      })
      .catch(error => {
        console.error("Error checking meeting status:", error);
        // Fallback response
        sendResponse({ 
          is_meeting: true,
          error: error.message 
        });
      });
      
    return true; // Required to use sendResponse asynchronously
  } else if (message.type === "check_meeting_ended") {
    chrome.storage.local.get(['hasMeetingEnded'], function(result) {
        sendResponse({ hasMeetingEnded: result.hasMeetingEnded });
    });
    return true; // Required for async response
  } else if (message.type === "get_platform") {
    (async () => {
      const platform = await getPlatform();
      sendResponse({ platform });
    })();
    return true;
  }
});


// Download transcript if meeting tab is closed
chrome.tabs.onRemoved.addListener(async function (tabid) {
  const data = await chrome.storage.local.get(["meetingTabId", "hasMeetingEnded", "platform"]);
  
  if (tabid == data.meetingTabId) {
    console.log("Successfully intercepted tab close");
    
    // Create new tab with platform-specific URL
    const redirectUrl = data.platform === "msteams" 
      ? "https://teams.live.com/v2/"
      : "https://meet.google.com/landing";
      
    const newTab = await chrome.tabs.create({ url: redirectUrl });

    // Wait a bit for the page to start loading
    await new Promise(resolve => setTimeout(resolve, 500));

    // Execute script in the new tab
    try {
      await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        function: injectNotification,
      });
      console.log("Notification injection script executed");
    } catch (error) {
      console.error("Error injecting notification:", error);
    }
  }
});

// Function to inject notification into the page
async function injectNotification() {
  // Wait for the document body to be available
  if (!document.body) {
    await new Promise(resolve => {
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          obs.disconnect();
          resolve();
        }
      });
      
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    });
  }

  console.log("Injecting notification");
  let html = document.querySelector("html");
  let obj = document.createElement("div");
  obj.id = "live-notification";
  let logo = document.createElement("img");
  let text = document.createElement("p");
  let buttonContainer = document.createElement("div");

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
    color: #fff;
    margin: 10px 0;
  `;
  text.innerHTML = "Meeting ended. Would you like to see the summary and action items?";

  // Style button container
  buttonContainer.style.cssText = "display: flex; gap: 10px; margin-top: 10px;";

  // Create Yes button
  let yesButton = document.createElement("button");
  yesButton.textContent = "Yes";
  yesButton.style.cssText = `
    background: #c76dcc;
    color: white;
    border: none;
    padding: 5px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-family: "Host Grotesk", sans-serif;
    font-weight: 500;
  `;

  // Create No button
  let noButton = document.createElement("button");
  noButton.id = "no-button";
  noButton.textContent = "No";
  noButton.style.cssText = `
    background: transparent;
    color: #c76dcc;
    border: 1px solid #c76dcc;
    padding: 5px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-family: "Host Grotesk", sans-serif;
    font-weight: 500;
  `;

  // Add click handlers
  yesButton.addEventListener("click", () => {
    console.log("Yes button clicked");
    chrome.runtime.sendMessage({ type: "open_side_panel" });
    obj.remove();
  });

  noButton.addEventListener("click", () => {
    obj.remove();
  });

  // Assemble the components
  obj.appendChild(logo);
  obj.appendChild(text);
  obj.appendChild(buttonContainer);
  buttonContainer.appendChild(yesButton);
  buttonContainer.appendChild(noButton);

  if (html) html.append(obj);

  // Auto-hide after 4 seconds
  setTimeout(() => {
    if (obj && obj.parentNode) {
      obj.remove();
    }
  }, 4000);
}

function downloadTranscript() {
  chrome.storage.local.get(
    [
      "userName",
      "transcript",
      "meetingTitle",
      "meetingStartTimeStamp",
    ],
    async function (result) {
      if (result.transcript) {
        let plt = await chrome.storage.local.get("platform");
        let pltprop = plt.platform;

        let textContent; // Declare textContent outside the if/else blocks
        let fileName;

        if (pltprop === "msteams") {
          fileName =
          result.meetingStartTimeStamp
            ? `Amurex/Transcript | MS Teams meeting at ${result.meetingStartTimeStamp}.txt`
            : `Amurex/Transcript.txt`;

          const uniqueMessages = Object.entries(result.transcript).reduce((acc, [key, value]) => {
            if (key === 'transcript' && Array.isArray(value)) {
                // First remove duplicates
              const withoutDuplicates = value.filter((item, index, array) => {
                  if (index === 0) return true;
                  const prev = array[index - 1];
                  return !(item.message === prev.message && item.speaker === prev.speaker);
              });

              // Then group consecutive messages by speaker
              const groupedTranscript = withoutDuplicates.reduce((grouped, current, index, array) => {
                  if (index === 0 || current.speaker !== array[index - 1].speaker) {
                      // Start new group
                      grouped.push({
                          speaker: current.speaker,
                          message: current.message,
                          timestamp: current.timestamp
                      });
                  } else {
                      // Append to last group's message
                      const lastGroup = grouped[grouped.length - 1];
                      lastGroup.message += '. ' + current.message;
                  }
                  return grouped;
              }, []);

              return { ...acc, [key]: groupedTranscript };
            }
            return { ...acc, [key]: value };
          }, {});

          // Format the transcript in the desired style
          textContent = Object.values(uniqueMessages).map(entry => {
            return `${entry.speaker} (${entry.timestamp})\n${entry.message}\n`;
          }).join('\n');

          console.log("MS Teams transcript:", textContent);
        } else {

          fileName =
          result.meetingTitle && result.meetingStartTimeStamp
            ? `Amurex/Transcript | Google Meet at ${result.meetingStartTimeStamp}.txt`
            : `Amurex/Transcript.txt`;

          // Create an array to store lines of the text file
          const lines = [];

          // Iterate through the transcript array and format each entry
          result.transcript.forEach((entry) => {
            lines.push(`${entry.personName} (${entry.timeStamp})`);
            lines.push(entry.personTranscript);
            // Add an empty line between entries
            lines.push("");
          });
          lines.push("");
          lines.push("");

          // Join the lines into a single string, replace "You" with userName from storage
          textContent = lines
            .join("\n")
            .replace(/You \(/g, result.userName + " (");

          console.log("Regular transcript:", textContent);
        }
        
        // Create a blob containing the text content
        const blob = new Blob([textContent], { type: "text/plain" });
        
        // Read the blob as a data URL
        const reader = new FileReader();

        // Download once blob is read
        reader.onload = function (event) {
          const dataUrl = event.target.result;

          // Create a download with Chrome Download API
          chrome.downloads
            .download({
              url: dataUrl,
              filename: fileName,
              conflictAction: "uniquify",
            })
            .then(() => {
              console.log("Transcript downloaded to Amurex directory");
            })
            .catch((error) => {
              console.log(error);
              chrome.downloads.download({
                url: dataUrl,
                filename: "Amurex/Transcript.txt",
                conflictAction: "uniquify",
              });
              console.log(
                "Invalid file name. Transcript downloaded to Amurex directory with simple file name."
              );
            });
        };

        // Read the blob and download as text file
        reader.readAsDataURL(blob);
      } else console.log("No transcript found");
    }
  );
}

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.setOptions({
    enabled: true,
    path: "index.html",
  });
  chrome.sidePanel.open({ tabId: tab.id });
});

async function fetchLateSummary(meetingId) {
  try {
    console.log(`meetingId: ${meetingId}`);
    console.log(meetingId);
    
    const response = await fetch(
      `https://api.amurex.ai/late_summary/${meetingId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Log the response status and text for debugging
    console.log("Response status:", response.status);
    const text = await response.text(); // Read the response as text
    console.log("Response text:", text); // Log the response text

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${text}`);
    }

    // Attempt to parse the response as JSON
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error('Error fetching late meeting summary:', error);
    throw error;
  }
}