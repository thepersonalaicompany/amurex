// Function to check if a file has been uploaded
export const checkFileUploadStatus = async () => {
  try {
    const result = await chrome.storage.local.get(['isFileUploaded']);
    return result.isFileUploaded || false;
  } catch (error) {
    console.error('Error checking file upload status:', error);
    return false;
  }
};

// Function to set the file upload status
export const setFileUploadStatus = async (status) => {
  try {
    await chrome.storage.local.set({ isFileUploaded: status });
    return true;
  } catch (error) {
    console.error('Error setting file upload status:', error);
    return false;
  }
};

// Function to listen for changes in the file upload status
export const setupFileUploadStatusListener = (callback) => {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.isFileUploaded) {
      callback(changes.isFileUploaded.newValue);
    }
  });
};

// Function to get the current navigation item
export const getCurrentNavItem = async () => {
  try {
    const result = await chrome.storage.local.get(['navItem']);
    return result.navItem || 'summary';
  } catch (error) {
    console.error('Error getting current navigation item:', error);
    return 'summary';
  }
};

// Function to set the current navigation item
export const setCurrentNavItem = async (navItem) => {
  try {
    await chrome.storage.local.set({ navItem });
    return true;
  } catch (error) {
    console.error('Error setting current navigation item:', error);
    return false;
  }
};

// Function to check if we should redirect to a specific page
export const checkRedirect = async () => {
  try {
    const result = await chrome.storage.local.get(['redirect', 'meetingId']);
    
    // Clear the redirect after reading it
    await chrome.storage.local.set({ redirect: null });
    
    if (result.redirect) {
      const redirect = result.redirect;
      const meetingId = result.meetingId;
      
      // Clear the meetingId after reading it
      await chrome.storage.local.set({ meetingId: null });
      
      return { redirect, meetingId };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking redirect:', error);
    return null;
  }
}; 