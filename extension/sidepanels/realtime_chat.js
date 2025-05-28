document.addEventListener("DOMContentLoaded", () => {
  checkSession(updateUI);
  setupCookieListener(updateUI);
  setupChat();
});

function setupChat() {
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-message");
  let userName = "";

  // Get user name from storage
  chrome.storage.local.get(["userName"], (result) => {
    userName = result.userName || "You";
  });

  // Auto-resize textarea
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
    
    // Enable/disable send button based on input
    sendButton.disabled = !chatInput.value.trim();
  });

  // Send message on Enter (without shift)
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.value.trim()) {
        sendMessage();
      }
    }
  });

  // Send button click handler
  sendButton.addEventListener("click", () => {
    if (chatInput.value.trim()) {
      sendMessage();
    }
  });

  function sendMessage() {
    const messageText = chatInput.value.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Create message element
    const messageElement = createMessageElement({
      text: messageText,
      sender: userName,
      time: timestamp,
      type: 'sent'
    });

    // Add message to chat
    chatMessages.appendChild(messageElement);
    
    // Clear input
    chatInput.value = "";
    chatInput.style.height = "auto";
    sendButton.disabled = true;

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Get meetingId and userId for tracking
    chrome.storage.local.get(['mId', 'transcript', 'chatMessages'], async (result) => {
      const meetingId = result.mId || 'unknown';
      const transcript = result.transcript || [];
      const chatMessages = result.chatMessages || [];
      
      try {
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

        // Track message sent if analytics is enabled
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
              event_type: "send_chat_message",
              metadata: {
                message_length: messageText.length
              }
            }),
          }).catch(error => {
            console.error("Error tracking message:", error);
          });
        }

        // Send message and transcript to backend
        const response = await fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            message: messageText,
            meeting_id: meetingId,
            user_id: userId,
            transcript: transcript,
            chat_messages: chatMessages
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        // Show typing indicator
        showTypingIndicator();

        // Get response from server
        const data = await response.json();
        
        // Remove typing indicator and add response message
        hideTypingIndicator();
        
        if (data.response) {
          const responseElement = createMessageElement({
            text: data.response,
            sender: "Amurex",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'received'
          });
          
          chatMessages.appendChild(responseElement);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }

      } catch (error) {
        console.error("Error sending message:", error);
        hideTypingIndicator();
        
        // Show error message
        const errorElement = createMessageElement({
          text: "Sorry, I couldn't process your message. Please try again.",
          sender: "Amurex",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'received'
        });
        
        chatMessages.appendChild(errorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
  }

  function createMessageElement({ text, sender, time, type }) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    
    const messageInfo = document.createElement("div");
    messageInfo.className = "message-info";
    
    const senderSpan = document.createElement("span");
    senderSpan.className = "message-sender";
    senderSpan.textContent = sender;
    
    const timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    timeSpan.textContent = time;
    
    messageInfo.appendChild(senderSpan);
    messageInfo.appendChild(timeSpan);
    
    const messageText = document.createElement("div");
    messageText.className = "message-text";
    messageText.textContent = text;
    
    messageDiv.appendChild(messageInfo);
    messageDiv.appendChild(messageText);
    
    return messageDiv;
  }

  function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTypingIndicator() {
    const indicator = chatMessages.querySelector(".typing-indicator");
    if (indicator) {
      indicator.remove();
    }
  }
}

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

// Add event listeners for buttons
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
    const meetingId = await chrome.storage.local.get('mId');

    await fetch(`${AMUREX_CONFIG.BASE_URL_BACKEND}/track`, {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        uuid: userId,
        meeting_id: meetingId.mId,
        event_type: "close_sidebar",
      }),
    });
  }

  window.close();
});

// Add Previous Transcripts button functionality
document.getElementById("previous-transcripts").addEventListener("click", async () => {
  // Open app.amurex.ai in a new tab
  chrome.tabs.create({
    url: `${AMUREX_CONFIG.BASE_URL_WEB}/meetings`,
    active: true
  });

  // Get meetingId from storage
  const meetingId = await chrome.storage.local.get('mId');

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
            meeting_id: meetingId.mId, 
            event_type: "view_previous_transcripts" 
          }),
        }).catch(error => {
          console.error("Error tracking previous transcripts view:", error);
        });
      }
    }
  );
}); 