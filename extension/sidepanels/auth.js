function setupCookieListener(updateUI) {
  // Listen for cookie changes
  chrome.cookies.onChanged.addListener((changeInfo) => {
    const cookie = changeInfo.cookie;
    const isLocalhost = cookie.domain.includes("localhost");
    const isProd = cookie.domain.includes("app.amurex.ai");

    if (cookie.name === "amurex_session" && (isLocalhost || isProd)) {
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
      url: "http://localhost:3000",
      name: "amurex_session",
    },
    function (localCookie) {
      if (localCookie && localCookie.value) {
        updateUI(true);
        return;
      }

      // If no localhost cookie, check production
      chrome.cookies.get(
        {
          url: "https://app.amurex.ai",
          name: "amurex_session",
        },
        function (prodCookie) {
          const isAuthenticated = prodCookie && prodCookie.value;
          updateUI(isAuthenticated);
        }
      );
    }
  );
}

async function getSession() {
  let session = await chrome.cookies.get({
    url: "http://localhost:3000",
    name: "amurex_session",
  });
  if (session && session.value) {
    return session.value;
  }

  session = await chrome.cookies.get({
    url: "https://app.amurex.ai",
    name: "amurex_session",
  });
  if (session && session.value) {
    return session.value;
  }
  return null;
}

