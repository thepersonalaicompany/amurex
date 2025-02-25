/**
 * Background script for the Chrome extension
 */

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);

  // Handle different message types
  if (message.type === "new_meeting_started") {
    // Saving current tab id and url, to check when this tab is closed
    const tabId = sender.tab.id;
    const tabUrl = sender.tab.url;
    
    chrome.storage.local.set({ 
      meetingTabId: tabId,
      meetingTabUrl: tabUrl
    }, () => {
      console.log("Meeting tab id and url saved:", tabId, tabUrl);
    });
  } else if (message.type === "meeting_ended") {
    chrome.storage.local.set({ hasMeetingEnded: true }, () => {
      console.log("Meeting ended flag set");
    });
  } else if (message.type === "open_side_panel" || 
             message.type === "open_late_meeting_side_panel" || 
             message.type === "open_file_upload_panel") {
    // Handle opening side panel
    const path = {
      "open_side_panel": "react/index.html",
      "open_late_meeting_side_panel": "react/index.html",
      "open_file_upload_panel": "react/index.html?page=liveSuggestions"
    }[message.type];
    
    chrome.sidePanel.setOptions({
      tabId: sender.tab.id,
      path: path,
      enabled: true
    });
    
    chrome.sidePanel.open({ tabId: sender.tab.id });
    chrome.storage.local.set({ redirect: message.type });
    
    if (message.meetingId) {
      chrome.storage.local.set({ meetingId: message.meetingId });
    }
  }

  // Handle different message actions
  switch (message.action) {
    case 'trackEvent':
      handleTrackEvent(message, sendResponse);
      break;
    case 'downloadTranscript':
      handleDownloadTranscript(sendResponse);
      break;
    case 'checkAuthentication':
      handleCheckAuthentication(message, sendResponse);
      break;
    case 'login':
      handleLogin(message, sendResponse);
      break;
    case 'logout':
      handleLogout(sendResponse);
      break;
    default:
      if (message.action) {
        console.log('Unknown message action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
      }
  }

  // Return true to indicate that we will send a response asynchronously
  return true;
});

// Listen for tab removal to detect when a meeting tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  // Get the stored meeting tab ID and other data
  const data = await chrome.storage.local.get(['meetingTabId', 'hasMeetingEnded', 'platform']);
  
  // Only proceed if this is the meeting tab
  if (tabId === data.meetingTabId) {
    console.log('Meeting tab closed, checking if we should show notification');
    
    // Get the tab URL from storage
    const urlData = await chrome.storage.local.get(['meetingTabUrl']);
    const tabUrl = urlData.meetingTabUrl || '';
    
    // Skip notification for landing pages
    if (tabUrl.includes('meet.google.com/landing') || 
        tabUrl.includes('teams.microsoft.com/v2/') ||
        tabUrl.includes('teams.live.com/v2/')) {
      console.log('Tab is a landing page, skipping notification');
      return;
    }
    
    // Skip if the meeting has already ended
    if (data.hasMeetingEnded) {
      console.log('Meeting already ended, skipping notification');
      return;
    }
    
    console.log('Successfully intercepted tab close for meeting');
    
    // Determine which landing page to open based on platform
    const landingUrl = data.platform === 'msteams' 
      ? 'https://teams.live.com/v2/' 
      : 'https://meet.google.com/landing';
    
    try {
      // Open a new tab with the landing page
      const newTab = await chrome.tabs.create({ url: landingUrl });
      
      // Wait a bit for the tab to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Inject the notification
      await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        function: injectNotification
      });
      console.log('Notification injection script executed');
    } catch (error) {
      console.error('Error handling tab close:', error);
    }
  }
});

/**
 * Injects a notification into the page
 * This function runs in the context of the web page
 */
async function injectNotification() {
  // Wait for the body to be available
  if (!document.body) {
    await new Promise(resolve => {
      new MutationObserver((mutations, observer) => {
        if (document.body) {
          observer.disconnect();
          resolve();
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    });
  }
  
  console.log('Injecting notification');
  
  // Get the HTML element
  const html = document.querySelector('html');
  
  // Create notification container
  const notification = document.createElement('div');
  notification.id = 'live-notification';
  
  // Create notification elements
  const img = document.createElement('img');
  const text = document.createElement('p');
  const buttons = document.createElement('div');
  
  // Style the notification
  notification.style.cssText = `
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
  
  // Set up the logo
  img.setAttribute('src', 'https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75');
  img.setAttribute('height', '32px');
  img.setAttribute('width', '32px');
  img.style.cssText = 'border-radius: 4px';
  
  // Set up the text
  text.style.cssText = `
    color: #fff;
    margin: 10px 0;
  `;
  text.innerHTML = 'Meeting ended. Would you like to see the summary and action items?';
  
  // Set up the buttons container
  buttons.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
  
  // Create Yes button
  const yesButton = document.createElement('button');
  yesButton.textContent = 'Yes';
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
  const noButton = document.createElement('button');
  noButton.id = 'no-button';
  noButton.textContent = 'No';
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
  
  // Add event listeners to buttons
  yesButton.addEventListener('click', () => {
    console.log('Yes button clicked');
    chrome.runtime.sendMessage({ type: 'open_side_panel' });
    notification.remove();
  });
  
  noButton.addEventListener('click', () => {
    notification.remove();
  });
  
  // Assemble the notification
  notification.appendChild(img);
  notification.appendChild(text);
  notification.appendChild(buttons);
  buttons.appendChild(yesButton);
  buttons.appendChild(noButton);
  
  // Add to the page
  if (html) {
    html.append(notification);
  }
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

/**
 * Handle tracking events
 * @param {Object} message - The message containing event details
 * @param {Function} sendResponse - Function to send a response
 */
function handleTrackEvent(message, sendResponse) {
  const { eventName, properties } = message;
  console.log(`Tracking event: ${eventName}`, properties);
  
  // In a real implementation, this would send the event to an analytics service
  // For now, we'll just log it
  
  sendResponse({ success: true });
}

/**
 * Handle downloading the transcript
 * @param {Function} sendResponse - Function to send a response
 */
function handleDownloadTranscript(sendResponse) {
  console.log('Downloading transcript');
  
  // In a real implementation, this would fetch the transcript from an API
  // and trigger a download using chrome.downloads.download()
  
  // For now, we'll create a dummy transcript
  const transcript = `Meeting Transcript
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

[00:00:00] Speaker 1: Hello everyone, thanks for joining today's meeting.
[00:00:05] Speaker 2: Hi there, glad to be here.
[00:00:10] Speaker 1: Let's discuss the project timeline.
[00:00:15] Speaker 3: I think we need to adjust the deadline.
`;

  // Create a blob and download it
  const blob = new Blob([transcript], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: `transcript_${new Date().toISOString().split('T')[0]}.txt`,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Error downloading transcript:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      console.log('Transcript download started with ID:', downloadId);
      sendResponse({ success: true, downloadId });
    }
    
    // Clean up the blob URL
    URL.revokeObjectURL(url);
  });
}

/**
 * Handle checking authentication status
 * @param {Object} message - The message containing cookies to check
 * @param {Function} sendResponse - Function to send a response
 */
function handleCheckAuthentication(message, sendResponse) {
  console.log('Checking authentication status');
  
  // Check the cookies provided in the message
  const checkCookies = async () => {
    for (const cookie of message.cookies) {
      try {
        const foundCookie = await chrome.cookies.get({
          url: cookie.url,
          name: cookie.name
        });
        
        if (foundCookie && foundCookie.value) {
          console.log('Found valid cookie at', cookie.url);
          return { is_authenticated: true, cookie: foundCookie };
        }
      } catch (error) {
        console.error('Error checking cookie:', error);
      }
    }
    
    console.log('No valid cookies found');
    return { is_authenticated: false };
  };
  
  checkCookies().then(result => {
    console.log('Sending authentication result:', result);
    sendResponse(result);
  });
}

/**
 * Handle user login
 * @param {Object} message - The message containing login credentials
 * @param {Function} sendResponse - Function to send a response
 */
function handleLogin(message, sendResponse) {
  const { email, password } = message;
  console.log('Logging in user:', email);
  
  // In a real implementation, this would send the credentials to an API
  // For now, we'll simulate a successful login
  
  // Simulate API call delay
  setTimeout(() => {
    // Simple validation
    if (!email || !password) {
      sendResponse({ success: false, error: 'Email and password are required' });
      return;
    }
    
    if (!email.includes('@')) {
      sendResponse({ success: false, error: 'Invalid email format' });
      return;
    }
    
    // Store user info in chrome.storage.local
    chrome.storage.local.set({ 
      user: { email, name: email.split('@')[0] }
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error storing user:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ 
          success: true, 
          user: { email, name: email.split('@')[0] }
        });
      }
    });
  }, 1000);
}

/**
 * Handle user logout
 * @param {Function} sendResponse - Function to send a response
 */
function handleLogout(sendResponse) {
  console.log('Logging out user');
  
  // In a real implementation, this would invalidate the session with an API
  // For now, we'll just remove the user from chrome.storage.local
  
  chrome.storage.local.remove('user', () => {
    if (chrome.runtime.lastError) {
      console.error('Error removing user:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ success: true });
    }
  });
}

// Initialize the extension
function initialize() {
  console.log('Initializing Amurex extension');
  
  // Set up context menu items
  chrome.contextMenus.create({
    id: 'amurex',
    title: 'Amurex',
    contexts: ['all']
  });
  
  chrome.contextMenus.create({
    id: 'amurex-summary',
    parentId: 'amurex',
    title: 'View Meeting Summary',
    contexts: ['all']
  });
  
  chrome.contextMenus.create({
    id: 'amurex-suggestions',
    parentId: 'amurex',
    title: 'View Live Suggestions',
    contexts: ['all']
  });
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'amurex-summary') {
      chrome.sidePanel.open({ tabId: tab.id });
      chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'react/index.html#/summary'
      });
    } else if (info.menuItemId === 'amurex-suggestions') {
      chrome.sidePanel.open({ tabId: tab.id });
      chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'react/index.html#/suggestions'
      });
    }
  });
}

// Initialize when the extension is installed or updated
chrome.runtime.onInstalled.addListener(initialize);

// Log when the background script is loaded
console.log('Amurex background script loaded'); 