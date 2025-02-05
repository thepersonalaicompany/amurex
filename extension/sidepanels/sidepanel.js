document.addEventListener("DOMContentLoaded", () => {
  checkSession(updateUI);
  setupCookieListener(updateUI);
  document.getElementById("close-btn").addEventListener("click", () => {
    window.close();
  });
});

async function fetchAINotes() {
  const summaryDiv = document.getElementById("meeting-summary");
  const actionItemsDiv = document.getElementById("action-items");

  try {
    // Show loading state
    summaryDiv.innerHTML =
      '<div class="loading">Generating meeting notes...</div>';
    actionItemsDiv.innerHTML =
      '<div class="loading">Generating action items...</div>';

    // Get transcript from storage
    const result = await chrome.storage.local.get(["transcript"]);

    if (!result.transcript || result.transcript.length === 0) {
      summaryDiv.innerHTML =
        "<p>No transcript available to generate notes.</p>";
      actionItemsDiv.innerHTML = "<p>No action items available.</p>";
      return;
    }

    // Format transcript data
    const formattedTranscript = result.transcript
      .map((entry) => ({
        personName: entry.personName,
        timeStamp: entry.timeStamp,
        transcriptText: entry.personTranscript,
      }))
      .map(
        (entry) =>
          `${entry.personName} (${entry.timeStamp})\n${entry.transcriptText}\n`
      )
      .join("");

    const body = {
      transcript: formattedTranscript,
    };

    // Make API request
    const response = await fetch(
      `${AMUREX_CONFIG.BASE_URL_BACKEND}/generate_actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();

    // Display the Notion link and meeting notes
    summaryDiv.innerHTML = `
      <div class="notes-content">${
        data.notes_content
          ? data.notes_content
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

    // Display the action items with markdown formatting
    actionItemsDiv.innerHTML = `
      <div class="action-items">${
        data.action_items || "No action items available."
      }</div>
    `;

    // Add this after the actionItemsDiv.innerHTML line:
    generateEmailOptions(data);
  } catch (error) {
    console.error("Error generating notes:", error);
    summaryDiv.innerHTML =
      "<p>Failed to generate meeting notes. Please try again later.</p>";
    actionItemsDiv.innerHTML = `<p class="error-details">Error: ${error.message}</p>`;
  }
}

// Also fetch notes when the page loads
document.addEventListener("DOMContentLoaded", fetchAINotes);

// Add this after the fetchAINotes function
function generateEmailOptions(data) {
  const emailActionsDiv = document.getElementById("email-actions");
  const emailList = emailActionsDiv.querySelector(".email-list");
  const emailInput = document.getElementById("email-input");
  const addButton = document.getElementById("add-email");
  const sendButton = document.getElementById("send-emails");

  function addEmail(email) {
    const div = document.createElement("div");
    div.className = "email-option";
    div.innerHTML = `
      <input type="checkbox" class="email-checkbox" value="${email}" checked>
      <span>${email}</span>
      <button class="remove-email">&times;</button>
    `;

    // Add remove button handler
    div.querySelector(".remove-email").addEventListener("click", () => {
      div.remove();
      updateSendButtonState();
    });

    // Add checkbox handler
    div
      .querySelector(".email-checkbox")
      .addEventListener("change", updateSendButtonState);

    emailList.appendChild(div);
    emailInput.value = ""; // Clear input after adding
    updateSendButtonState();
  }

  function updateSendButtonState() {
    const checkboxes = emailList.querySelectorAll(".email-checkbox");
    sendButton.disabled = ![...checkboxes].some((cb) => cb.checked);
  }

  // Add email button click handler
  addButton.addEventListener("click", () => {
    const email = emailInput.value.trim();
    if (email && email.includes("@")) {
      addEmail(email);
    }
  });

  // Add email on Enter key
  emailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const email = emailInput.value.trim();
      if (email && email.includes("@")) {
        addEmail(email);
      }
    }
  });

  // Extract participants from notes_content
  const participantsMatch = data.notes_content
    ? data.notes_content.match(/\*\*Participants:\*\*\n((?:- [^\n]+\n)+)/)
    : null;
  const participants = participantsMatch
    ? participantsMatch[1]
        .split("\n")
        .filter((line) => line.startsWith("- "))
        .map((line) => line.substring(2))
    : [];

  // Create email options
  participants.forEach((participant) => {
    const div = document.createElement("div");
    div.className = "email-option";
    div.innerHTML = `
      <input type="checkbox" class="email-checkbox" value="${participant}">
      <span>Send summary to ${participant}</span>
    `;
    emailList.appendChild(div);
  });

  // Handle checkbox changes
  const checkboxes = emailList.querySelectorAll(".email-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      sendButton.disabled = ![...checkboxes].some((cb) => cb.checked);
    });
  });

  // Handle send button click
  sendButton.addEventListener("click", async () => {
    const checkboxes = emailList.querySelectorAll(".email-checkbox");
    const selectedEmails = [...checkboxes]
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    try {
   // Get meetingId from URL if available
   const meetingId = window.location.href.includes('meetingId=') ? 
   window.location.href.split('meetingId=')[1].split('&')[0] : 
   'unknown';

     // Get userId first
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


      const response = await fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          emails: selectedEmails,
          action_items: document.querySelector("#action-items").innerHTML,
          meeting_summary: document.querySelector("#meeting-summary").innerHTML,
        }),
      });

      if (!response.ok) throw new Error("Failed to send emails");

      // Track email sending only if analytics is enabled
      if (AMUREX_CONFIG.ANALYTICS_ENABLED) {
        await fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/track`, {
          method: "POST", 
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            uuid: userId,
            meeting_id: meetingId,
            event_type: "send_emails",
            metadata: {
              recipient_count: selectedEmails.length
            }
          }),
        });
      }

      // Show success state
      sendButton.innerHTML = "Emails Sent Successfully &#x2713;";
      sendButton.disabled = true;

      // Close sidebar after 2 seconds
    } catch (error) {
      console.error("Error sending emails:", error);
      sendButton.innerHTML = "Failed to Send Emails ✗";
      sendButton.disabled = false;
    }
  });
}

document.getElementById("download-transcript").addEventListener("click", () => {

  chrome.storage.local.get(
    ["transcript", "meetingTitle", "meetingStartTimeStamp"],
    function (result) {
      const meetingId = window.location.href.includes('meetingId=') ? 
      window.location.href.split('meetingId=')[1].split('&')[0] : 
      'unknown';

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

          // Make tracking request only if analytics is enabled
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
                event_type: "download_transcript" 
              }),
            }).catch(error => {
              console.error("Error tracking download:", error);
            });
          }

          // Handle transcript download
          if (result.transcript) {
            chrome.runtime.sendMessage({ type: "download" });
          } else {
            alert("No transcript available to download");
          }
        }
      );
    }
  );
});

document.getElementById("copy-to-clipboard").addEventListener("click", () => {
  const copyText = document.getElementById("copy-to-clipboard-text");
  const originalText = copyText.textContent;
  
  copyText.textContent = "Copied!";
  
  // Reset text after 2 seconds
  setTimeout(() => {
    copyText.textContent = originalText;
  }, 2000);

  chrome.storage.local.get(
    ["transcript", "meetingTitle", "meetingStartTimeStamp"],
    function (result) {
      const meetingId = window.location.href.includes('meetingId=') ? 
      window.location.href.split('meetingId=')[1].split('&')[0] : 
      'unknown';

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

          // Make tracking request only if analytics is enabled
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
                event_type: "copy_to_clipboard" 
              }),
            }).catch(error => {
              console.error("Error tracking copy to clipboard:", error);
            });
          }

          // Copy to clipboard
          const meetingSummary = document.querySelector("#meeting-summary").innerText;
          const actionItems = document.querySelector("#action-items").innerText;

          // Clean and format the content
          const cleanActionItems = actionItems
            .split('\n')
            .filter(item => item.trim() && !item.startsWith('#')) // Remove empty lines and headers
            .map(line => {
              // If line starts with * or -, convert to checkbox format
              if (line.match(/^[*-]/)) {
                return line.replace(/^[*-]+\s*/, '- [ ] ').trim();
              }
              // If no marker, add checkbox format
              return `- [ ] ${line.trim()}`;
            })
            .join('\n');

          const cleanSummary = meetingSummary
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#')) // Remove empty lines and headers
            .map(line => {
              // If line starts with * or -, keep the marker but clean up extra spaces
              if (line.match(/^[*-]/)) {
                return line.replace(/^([*-]+)\s*/, '$1 ').trim();
              }
              return line.trim();
            })
            .join('\n');

          const markdownText = `## Action Items\n${cleanActionItems}\n\n## Meeting Summary\n${cleanSummary}`;
          navigator.clipboard.writeText(markdownText);
        }
      );
    }
  );
});


function updateUI(isAuthenticated) {
  console.log("isAuthenticated", isAuthenticated);
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

document.getElementById("settings-btn").addEventListener("click", () => {
  chrome.tabs.create({
    url: `${AMUREX_CONFIG.BASE_URL_WEB}/settings`,
  });
});
