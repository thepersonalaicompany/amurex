// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    // Open welcome page in new tab
    chrome.tabs.create({
      url: "https://app.amurex.ai/signin?welcome=true",
    });
  } else if (details.reason == "update") {
    let thisVersion = chrome.runtime.getManifest().version;
    console.log(
      "Updated from " + details.previousVersion + " to " + thisVersion + "!"
    );
  }
});

async function getUserId() {
  let session = await chrome.cookies.get({
    url: "http://localhost:3000",
    name: "amurex_session",
  });
  if (session && session.value) {
    const decodedSession = JSON.parse(decodeURIComponent(session.value));
    const userId = decodedSession.user.id;
    return userId;
  }

  session = await chrome.cookies.get({
    url: "https://app.amurex.ai",
    name: "amurex_session",
  });
  if (session && session.value) {
    const decodedSession = JSON.parse(decodeURIComponent(session.value));
    const userId = decodedSession.user.id;
    return userId;
  }
  return null;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type == "new_meeting_started") {
    // Saving current tab id, to download transcript when this tab is closed
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      chrome.storage.local.set({ meetingTabId: tabId }, function () {
        console.log("Meeting tab id saved");
      });
    });
  } else if (message.type == "download") {
    // Invalidate tab id since transcript is downloaded, prevents double downloading of transcript from tab closed event listener
    downloadTranscript();
  } else if (message.action === "getUserId") {
    (async () => {
      const userId = await getUserId();
      sendResponse({ userId });
    })();
    return true;
  } else if (message.action === "checkAuthentication") {
    // Check cookies sequentially
    // const checkCookies = async () => {
    // Make the message handler async
    (async () => {
      for (const cookieInfo of message.cookies) {
        const cookie = await chrome.cookies.get({
          url: cookieInfo.url,
          name: cookieInfo.name,
        });

        if (cookie && cookie.value) {
          sendResponse({ is_authenticated: true });
          return;
        }
      }
      sendResponse({ is_authenticated: false });
    })();

    return true;
    // };
  } else if (
    message.type === "open_side_panel" ||
    message.type === "open_late_meeting_side_panel" ||
    message.type === "open_file_upload_panel"
  ) {
    // Map message types to their corresponding paths
    const pathMap = {
      open_side_panel: "sidepanels/sidepanel.html",
      open_late_meeting_side_panel: `sidepanels/lateMeetingSidePanel.html${
        message.meetingId ? `?meetingId=${message.meetingId}` : ""
      }`,
      open_file_upload_panel: `sidepanels/file_upload_panel.html${
        message.meetingId ? `?meetingId=${message.meetingId}` : ""
      }`,
    };

    const panelPath = pathMap[message.type];

    chrome.sidePanel
      .open({ tabId: sender.tab.id }, async () => {
        await chrome.storage.local.set({ redirect: message.type });
        if (message.meetingId) {
          await chrome.storage.local.set({ meetingId: message.meetingId });
        }
      })
      .then(() => {
        return chrome.sidePanel.setOptions({
          tabId: sender.tab.id,
          path: panelPath,
          enabled: true,
        });
      })
      .then(() => {
        // Set the current navigation item in storage
        let navItem;
        if (message.type === "open_late_meeting_side_panel") {
          navItem = "lateMeetingSidePanel";
        } else if (message.type === "open_file_upload_panel") {
          navItem = "file_upload_panel";
        } else if (message.type === "open_side_panel") {
          navItem = "sidepanel";
        } else {
          console.error("Invalid side panel type");
        }

        return chrome.storage.local.set({ navItem });
      })
      .catch((error) => console.error("Error handling side panel:", error));
  }
});

// Download transcript if meeting tab is closed
chrome.tabs.onRemoved.addListener(function (tabid) {
  chrome.storage.local.get(["meetingTabId"], function (data) {
    if (tabid == data.meetingTabId) {
      console.log("Successfully intercepted tab close");
      // downloadTranscript()
      // Clearing meetingTabId to prevent misfires of onRemoved until next meeting actually starts
      chrome.storage.local.set({ meetingTabId: null }, function () {
        console.log("Meeting tab id cleared for next meeting");
      });
    }
  });
});

function downloadTranscript() {
  chrome.storage.local.get(
    [
      "userName",
      "transcript",
      "chatMessages",
      "meetingTitle",
      "meetingStartTimeStamp",
    ],
    function (result) {
      if (result.userName && result.transcript && result.chatMessages) {
        // Create file name if values or provided, use default otherwise
        const fileName =
          result.meetingTitle && result.meetingStartTimeStamp
            ? `Amurex/Transcript-${result.meetingTitle} at ${result.meetingStartTimeStamp}.txt`
            : `Amurex/Transcript.txt`;

        // Create an array to store lines of the text file
        const lines = [];

        // Iterate through the transcript array and format each entry
        result.transcript.forEach((entry) => {
          lines.push(`${entry.personName} (${entry.timeStamp})`);
          lines.push(entry.personTranscript);
          // Add an empty line between entries
          lines.push("");
        });
        lines.push("");
        lines.push("");

        if (result.chatMessages.length > 0) {
          // Iterate through the chat messages array and format each entry
          lines.push("---------------");
          lines.push("CHAT MESSAGES");
          lines.push("---------------");
          result.chatMessages.forEach((entry) => {
            lines.push(`${entry.personName} (${entry.timeStamp})`);
            lines.push(entry.chatMessageText);
            // Add an empty line between entries
            lines.push("");
          });
          lines.push("");
          lines.push("");
        }

        // Join the lines into a single string, replace "You" with userName from storage
        const textContent = lines
          .join("\n")
          .replace(/You \(/g, result.userName + " (");

        // Create a blob containing the text content
        const blob = new Blob([textContent], { type: "text/plain" });

        // Read the blob as a data URL
        const reader = new FileReader();

        // Download once blob is read
        reader.onload = function (event) {
          const dataUrl = event.target.result;

          // Create a download with Chrome Download API
          chrome.downloads
            .download({
              url: dataUrl,
              filename: fileName,
              conflictAction: "uniquify",
            })
            .then(() => {
              console.log("Transcript downloaded to Amurex directory");
            })
            .catch((error) => {
              console.log(error);
              chrome.downloads.download({
                url: dataUrl,
                filename: "Amurex/Transcript.txt",
                conflictAction: "uniquify",
              });
              console.log(
                "Invalid file name. Transcript downloaded to Amurex directory with simple file name."
              );
            });
        };

        // Read the blob and download as text file
        reader.readAsDataURL(blob);
      } else console.log("No transcript found");
    }
  );
}

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.setOptions({
    enabled: true,
    path: "sidepanels/sidepanel.html",
  });
  chrome.sidePanel.open({ tabId: tab.id });
});
