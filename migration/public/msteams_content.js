const AMUREX_CONFIG = {
  BASE_URL_BACKEND: "https://api.amurex.ai",
  BASE_URL_WEB: "https://app.amurex.ai",
  ANALYTICS_ENABLED: true
};

// Set platform to MS Teams
chrome.storage.local.set({ platform: "msteams" });

// Extract meeting ID from URL
function extractMeetingId() {
  const url = window.location.href;
  const regex = /\/([a-zA-Z0-9-]+)(\?|$)/;
  const match = url.match(regex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return "unknown-meeting";
}

const meetingId = extractMeetingId();
chrome.storage.local.set({ mId: meetingId });

// Send message to background script that a new meeting has started
chrome.runtime.sendMessage({ type: "new_meeting_started" });

// Store the current tab URL for later use
chrome.storage.local.set({ meetingTabUrl: window.location.href });

// Listen for messages from the page
window.addEventListener("message", function (event) {
  // We only accept messages from ourselves
  if (event.source != window) return;

  if (event.data.type && event.data.type == "FROM_PAGE") {
    // Forward the message to the background script
    chrome.runtime.sendMessage(event.data);
  }
});

// Create a button to open the side panel
function createSidePanelButton() {
  const button = document.createElement("button");
  button.id = "amurex-sidepanel-button";
  button.innerHTML = `
    <img src="https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75" alt="Amurex" width="24" height="24" />
  `;
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #c76dcc;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  `;
  
  button.addEventListener("click", function() {
    chrome.runtime.sendMessage({ type: "open_side_panel" });
  });
  
  document.body.appendChild(button);
}

// Create a button to open the late meeting side panel
function createLateMeetingSidePanelButton() {
  const button = document.createElement("button");
  button.id = "amurex-late-meeting-button";
  button.innerHTML = `
    <img src="https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75" alt="Amurex" width="24" height="24" />
    <span>Late to meeting?</span>
  `;
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 8px 16px;
    border-radius: 20px;
    background: #c76dcc;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 9999;
    font-family: 'Segoe UI', sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  `;
  
  button.addEventListener("click", function() {
    chrome.runtime.sendMessage({ 
      type: "open_late_meeting_side_panel",
      meetingId: meetingId
    });
  });
  
  document.body.appendChild(button);
}

// Create a button to open the file upload panel
function createFileUploadButton() {
  const button = document.createElement("button");
  button.id = "amurex-file-upload-button";
  button.innerHTML = `
    <img src="https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75" alt="Amurex" width="24" height="24" />
    <span>Upload Context</span>
  `;
  button.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    padding: 8px 16px;
    border-radius: 20px;
    background: #c76dcc;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 9999;
    font-family: 'Segoe UI', sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  `;
  
  button.addEventListener("click", function() {
    chrome.runtime.sendMessage({ 
      type: "open_file_upload_panel",
      meetingId: meetingId
    });
  });
  
  document.body.appendChild(button);
}

// Wait for the page to load
window.addEventListener("load", async function() {
  // Create the main button
  createSidePanelButton();
  
  // Get storage data
  const storage = await chrome.storage.local.get(['mId', 'meetingTabId']);
  
  // Only show late meeting button if meeting has started
  if (storage.meetingTabId) {
    createLateMeetingSidePanelButton();
  }
  
  // Only show upload context button if we have a meetingId
  if (storage.mId && storage.mId !== 'unknown') {
    createFileUploadButton();
  }
  
  // Listen for meeting end
  window.addEventListener("beforeunload", function() {
    chrome.runtime.sendMessage({ type: "meeting_ended" });
  });
}); 