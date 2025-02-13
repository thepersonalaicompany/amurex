async function checkNavItem() {
  chrome.storage.local.get(["redirect", "meetingId"]).then((result) => {
    // const value = result.value;
    chrome.storage.local.set({ redirect: null });
    chrome.storage.local.set({ meetingId: null });

    const value = result.redirect;
    const meetingId = result.meetingId;

    if (value === "open_file_upload_panel") {
      if (meetingId) {
        // TODO: add the chat sidepanel to the file upload
        window.location.href = `chatsidepanel.html?meetingId=${meetingId}`;
      } else {
        window.location.href = "chatsidepanel.html";
      }
    } else if (value === "chatsidepanel") {
      window.location.href = "chatsidepanel.html";
    } else if (value === "live_suggestions") {
      window.location.href = "live_suggestions.html";
    }
  });
}

checkNavItem();
