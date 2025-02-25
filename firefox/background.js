const AMUREX_CONFIG = {
  BASE_URL_BACKEND: "https://api.amurex.ai",
  BASE_URL_WEB: "https://app.amurex.ai",
  ANALYTICS_ENABLED: true
};

// Replace Chrome API calls with Firefox browser API
browser.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    browser.tabs.create({
      url: AMUREX_CONFIG.BASE_URL_WEB + "/signup?welcome=true",
    });
  }
});

async function getUserId() {
  session = await browser.cookies.get({
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

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_CONFIG") {
    sendResponse(AMUREX_CONFIG);
    return true;
  }
  
  if (request.type === "GET_USER_ID") {
    getUserId().then(sendResponse);
    return true;
  }
  
  if (request.type === "OPEN_OPTIONS") {
    browser.runtime.openOptionsPage();
    return true;
  }
  
  if (request.type === "DOWNLOAD") {
    browser.downloads.download({
      url: request.data.url,
      filename: request.data.filename,
      saveAs: true
    });
    return true;
  }
});

// Handle sidebar toggle for Firefox
browser.browserAction.onClicked.addListener((tab) => {
  browser.sidebarAction.toggle();
});
