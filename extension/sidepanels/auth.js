let BASE_URL_WEB = AMUREX_CONFIG.BASE_URL_WEB;

function setupCookieListener(updateUI) {
  // Listen for cookie changes
  chrome.cookies.onChanged.addListener((changeInfo) => {
    const cookie = changeInfo.cookie;
    const isProd = cookie.domain.includes(BASE_URL_WEB);

    if (cookie.name === "amurex_session" && isProd) {
      // Cookie was added or removed
      const isAuthenticated = !changeInfo.removed && cookie.value;
      if (isAuthenticated) {
        updateUI(true);
      } else {
        updateUI(false);
      }
    }
  });

  // Initial check
  checkSession(updateUI);
}

function checkSession(updateUI) {
  // Check localhost first
  chrome.cookies.get(
    {
      url: BASE_URL_WEB,
      name: "amurex_session",
    },
    function (cookie) {
      if (cookie && cookie.value) {
        updateUI(true);
        return;
      }
    }
  );
}

async function getSession() {
  let session = await chrome.cookies.get({
    url: BASE_URL_WEB,
    name: "amurex_session",
  });
  if (session && session.value) {
    return session.value;
  }
  return null;
}
