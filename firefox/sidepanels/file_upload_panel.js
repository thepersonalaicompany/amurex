document.addEventListener("DOMContentLoaded", () => {
  checkSession(updateUI);
  setupCookieListener(updateUI);
});

document.getElementById("close-btn").addEventListener("click", async () => {
  // Track closing sidebar only if analytics is enabled
  if (AMUREX_CONFIG.ANALYTICS_ENABLED) {
    const userIdResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "getUserId" },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        }
      );
    });

    const userId = userIdResponse.userId;
    const meetingId = window.location.href.includes('meetingId=') ? 
    window.location.href.split('meetingId=')[1].split('&')[0] : 
    'unknown';

    await fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/track`, {
          method: "POST", 
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            uuid: userId,
            meeting_id: meetingId,
            event_type: "close_sidebar",
          }),
        });
      }

      window.close();
});

document.getElementById("settings-btn").addEventListener("click", () => {
  chrome.tabs.create({
    url: `${AMUREX_CONFIG.BASE_URL_WEB}/settings`,
  });
});

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
    chrome.storage.sync.set({
      operationMode: "manual",
      isAuthenticated: false,
    });
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

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const uploadStatus = document.getElementById("upload-status");

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create FormData with the expected format
    const formData = new FormData();
    formData.append("file", file, file.name);

    // Show upload starting
    uploadStatus.innerHTML = `
      <div>Uploading ${file.name}...</div>
      <div class="upload-progress">
        <div class="upload-progress-bar" style="width: 0%"></div>
      </div>
    `;

    const meetingId = document.location.href.split("meetingId=")[1];
    const session = await getSession();
    const parsedSession = JSON.parse(decodeURIComponent(session));
    const user_id = parsedSession.user.id;

    try {
      const response = await fetch(
        `${AMUREX_CONFIG.BASE_URL_BACKEND}/upload_meeting_file/${meetingId}/${user_id}`,
        {
          method: "POST",
          body: formData, // FormData automatically sets the correct multipart/form-data content-type
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      chrome.storage.local.set({ isFileUploaded: true });
      uploadStatus.innerHTML = `<div style="color: #4CAF50;">Upload successful!</div>`;
      
    } catch (error) {
      uploadStatus.innerHTML = `<div style="color: #f44336;">Upload failed: ${error.message}</div>`;
    } finally {
      // window.close();
    }
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
