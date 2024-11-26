const BASE_URL_WEB_INTERFACE = "https://app.amurex.ai";
const BASE_URL_BACKEND = "https://api.amurex.ai";
// https://api.amurex.ai / we should use this
// https://developer.chrome.com/docs/extensions/reference/api/management#type-ExtensionInstallType
// we need to refer this

document.addEventListener("DOMContentLoaded", () => {
  checkSession(updateUI);
  setupCookieListener(updateUI);
});

document.getElementById("close-btn").addEventListener("click", () => {
  window.close();
});

document.getElementById("settings-btn").addEventListener("click", () => {
  chrome.tabs.create({
    url: `${BASE_URL_WEB_INTERFACE}/settings`,
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
    url: `${BASE_URL_WEB_INTERFACE}/signin?extension=true`,
  });
});

document.getElementById("sign-up-btn").addEventListener("click", () => {
  chrome.tabs.create({
    url: `${BASE_URL_WEB_INTERFACE}/signup`,
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
        `${BASE_URL_BACKEND}/upload_meeting_file/${meetingId}/${user_id}`,
        {
          method: "POST",
          body: formData, // FormData automatically sets the correct multipart/form-data content-type
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      uploadStatus.innerHTML = `<div style="color: #4CAF50;">Upload successful!</div>`;
    } catch (error) {
      uploadStatus.innerHTML = `<div style="color: #f44336;">Upload failed: ${error.message}</div>`;
    } finally {
      // window.close();
    }
  });
});
