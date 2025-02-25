// Function to check if the user is authenticated
export const checkSession = async (callback) => {
  console.log("Checking session...");
  const cookies = [
    { url: "https://app.amurex.ai", name: "amurex_session" },
    { url: "http://localhost:3000", name: "amurex_session" },
  ];

  try {
    console.log("Sending checkAuthentication message...");
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "checkAuthentication", cookies },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error in checkAuthentication:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log("checkAuthentication response:", response);
            resolve(response);
          }
        }
      );
    });

    if (response && response.is_authenticated) {
      console.log("User is authenticated");
      if (callback) callback(true);
      return true;
    } else {
      console.log("User is not authenticated");
      if (callback) callback(false);
      return false;
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
    if (callback) callback(false);
    return false;
  }
};

// Function to get the session cookie
export const getSession = async () => {
  try {
    const cookie = await new Promise((resolve, reject) => {
      chrome.cookies.get(
        { url: "https://app.amurex.ai", name: "amurex_session" },
        (cookie) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(cookie);
          }
        }
      );
    });

    if (cookie && cookie.value) {
      return cookie.value;
    }
    
    // Try localhost if app.amurex.ai doesn't have the cookie
    const localCookie = await new Promise((resolve, reject) => {
      chrome.cookies.get(
        { url: "http://localhost:3000", name: "amurex_session" },
        (cookie) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(cookie);
          }
        }
      );
    });

    if (localCookie && localCookie.value) {
      return localCookie.value;
    }

    return null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
};

// Function to set up a listener for cookie changes
export const setupCookieListener = (callback) => {
  chrome.cookies.onChanged.addListener((changeInfo) => {
    const { cookie, removed } = changeInfo;
    
    if (
      (cookie.domain === "app.amurex.ai" || cookie.domain === "localhost") &&
      cookie.name === "amurex_session"
    ) {
      if (removed) {
        // Cookie was removed, user is logged out
        if (callback) callback(false);
      } else {
        // Cookie was added or modified, user is logged in
        if (callback) callback(true);
      }
    }
  });
}; 