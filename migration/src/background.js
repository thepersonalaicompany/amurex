/**
 * Background script for the Chrome extension
 */

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);

  // Handle different message actions
  switch (message.action) {
    case 'trackEvent':
      handleTrackEvent(message, sendResponse);
      break;
    case 'downloadTranscript':
      handleDownloadTranscript(sendResponse);
      break;
    case 'checkAuthentication':
      handleCheckAuthentication(sendResponse);
      break;
    case 'login':
      handleLogin(message, sendResponse);
      break;
    case 'logout':
      handleLogout(sendResponse);
      break;
    default:
      console.log('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }

  // Return true to indicate that we will send a response asynchronously
  return true;
});

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
 * @param {Function} sendResponse - Function to send a response
 */
function handleCheckAuthentication(sendResponse) {
  console.log('Checking authentication status');
  
  // In a real implementation, this would check for valid cookies or tokens
  // For now, we'll check if there's a user in chrome.storage.local
  
  chrome.cookies.getAll({ domain: '.amurex.io' }, (cookies) => {
    const authCookie = cookies.find(cookie => cookie.name === 'auth_token');
    const isAuthenticated = !!authCookie;
    
    console.log('Authentication status:', isAuthenticated);
    sendResponse({ isAuthenticated });
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