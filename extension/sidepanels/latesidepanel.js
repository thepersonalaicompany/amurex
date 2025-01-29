document.addEventListener("DOMContentLoaded", () => {
  checkSession(updateUI);
  setupCookieListener(updateUI);
});

document.getElementById("close-btn").addEventListener("click", () => {
  window.close();
});

async function fetchLateSummary() {
  const summaryDiv = document.getElementById("meeting-summary");
  const meetingId = document.location.href.split("meetingId=")[1];
    try {
      // strip any of the query params from the url, i.e. ?something=something
      const response = await fetch(
        `${AMUREX_CONFIG.BASE_URL_BACKEND}/late_summary/${meetingId}`
      );
  
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
  
      const data = await response.json();

      // Display the meeting summary
      summaryDiv.innerHTML = `
      <div class="notes-content">${
        data.late_summary
          ? data.late_summary
              .trim()
              .split("\n")
              .filter((line) => line.trim() !== "")
              .map((line) =>
                line.startsWith("- ")
                  ? `<li>${line.substring(2)}</li>` // Handle list items
                  : line // Keep other lines as is
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>")
                      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
              )
              .join("\n") // Restore newlines
              .replace(
                /(<li>.*?<\/li>)\n?(<li>.*?<\/li>)+/g,
                (list) => `<ul>${list}</ul>`
              ) // Wrap consecutive list items
              .replace(/\n/g, "<br>") // Convert remaining newlines to <br>
          : "No meeting notes available."
      }</div>
    `;

    } catch (error) {
      console.error('Error fetching late meeting summary:', error);
      summaryDiv.innerHTML = '<p>Failed to load meeting summary. Please try again later.</p>';
    }
}



// Also fetch notes when the page loads
document.addEventListener("DOMContentLoaded", fetchLateSummary);


function updateUI(isAuthenticated) {
  const authContainer = document.getElementById("auth-container");
  const authenticatedContent = document.getElementById("authenticated-content");

  if (isAuthenticated) {
    authContainer.style.display = "none";
    authenticatedContent.style.display = "block";
    chrome.storage.sync.set({ operationMode: "auto", isAuthenticated: true });
  } else {
    authContainer.style.display = "block";
    authenticatedContent.style.display = "none";
    chrome.storage.sync.set({ operationMode: "manual", isAuthenticated: false });
  }
}

document.getElementById("sign-in-btn").addEventListener("click", () => {
  chrome.tabs.create({
    url: `${AMUREX_CONFIG.BASE_URL_WEB}/signin?extension=true`,
  });
});

document.getElementById("sign-up-btn").addEventListener("click", () => {
  chrome.tabs.create({
    url: `${AMUREX_CONFIG.BASE_URL_WEB}/signup`,
  });
});

document.getElementById("settings-btn").addEventListener("click", () => {
  chrome.tabs.create({
    url: `${AMUREX_CONFIG.BASE_URL_WEB}/settings`,
  });
});

// Add Previous Transcripts button functionality
document.getElementById("previous-transcripts").addEventListener("click", () => {
  // Open app.amurex.ai in a new tab
  chrome.tabs.create({
    url: `${AMUREX_CONFIG.BASE_URL_WEB}/meetings`,
    active: true
  });

  // Get meetingId from URL if available
  const meetingId = window.location.href.includes('meetingId=') ? 
    window.location.href.split('meetingId=')[1].split('&')[0] : 
    'unknown';

  // Track the event if analytics is enabled
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

      if (AMUREX_CONFIG.ANALYTICS_ENABLED) {
        fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ 
            uuid: userId, 
            meeting_id: meetingId, 
            event_type: "view_previous_transcripts" 
          }),
        }).catch(error => {
          console.error("Error tracking previous transcripts view:", error);
        });
      }
    }
  );
});
