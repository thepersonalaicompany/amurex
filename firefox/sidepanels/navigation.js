async function checkNavItem() {
  chrome.storage.local.get(["redirect", "meetingId"]).then((result) => {
    // const value = result.value;
    chrome.storage.local.set({ redirect: null });
    chrome.storage.local.set({ meetingId: null });

    const value = result.redirect;
    const meetingId = result.meetingId;

    if (value === "open_file_upload_panel") {
      if (meetingId) {
        window.location.href = `file_upload_panel.html?meetingId=${meetingId}`;
      } else {
        window.location.href = "file_upload_panel.html";
      }
    } else if (value === "open_late_meeting_side_panel") {
      if (meetingId) {
        window.location.href = `lateMeetingSidePanel.html?meetingId=${meetingId}`;
      } else {
        window.location.href = "lateMeetingSidePanel.html";
      }
    } else if (value === "chatsidepanel") {
      window.location.href = "chatsidepanel.html";
    } else if (value === "live_suggestions") {
      window.location.href = "live_suggestions.html";
    }
  });
}

checkNavItem();
