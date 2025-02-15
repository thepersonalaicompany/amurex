const plt = {platform: "gmeet"};
chrome.storage.local.set(plt);
console.log("Google Meet platform local variable has been set");


//*********** GLOBAL VARIABLES **********//
const timeFormat = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
};
const extensionStatusJSON_bug = {
  status: 400,
  message:
    "<strong>Amurex encountered a new error</strong> <br /> Please report it <a href='https://discord.gg/ftUdQsHWbY' target='_blank'>here</a>.",
};
const reportErrorMessage =
  "There is a bug in Amurex. Please report it at https://discord.gg/ftUdQsHWbY";
const mutationConfig = { childList: true, attributes: true, subtree: true };

const BASE_URL_BACKEND = "https://api.amurex.ai";

// Name of the person attending the meeting
let userName = "You";
overWriteChromeStorage(["userName"], false);
// Transcript array that holds one or more transcript blocks
// Each transcript block (object) has personName, timeStamp and transcriptText key value pairs
let transcript = [];
// Buffer variables to dump values, which get pushed to transcript array as transcript blocks, at defined conditions
let personNameBuffer = "",
  transcriptTextBuffer = "",
  timeStampBuffer = undefined;

// Buffer variables for deciding when to push a transcript block
let beforePersonName = "",
  beforeTranscriptText = "";
// Chat messages array that holds one or chat messages of the meeting
// Each message block(object) has personName, timeStamp and messageText key value pairs
let chatMessages = [];
overWriteChromeStorage(["chatMessages"], false);
chrome.storage.local.set({ isFileUploaded: false });

// Capture meeting start timestamp and sanitize special characters with "-" to avoid invalid filenames
let meetingStartTimeStamp = new Date()
  .toLocaleString("default", timeFormat)
  .replace(/[/:]/g, "-")
  .toUpperCase();
let meetingTitle = document.title;
overWriteChromeStorage(["meetingStartTimeStamp", "meetingTitle"], false);
// Capture invalid transcript and chat messages DOM element error for the first time
let isTranscriptDomErrorCaptured = false;
let isChatMessagesDomErrorCaptured = false;
// Capture meeting begin to abort userName capturing interval
let hasMeetingStarted = false;
// Capture meeting end to suppress any errors
let hasMeetingEnded = false;

let extensionStatusJSON;

checkExtensionStatus().then(() => {
  // Read the status JSON
  chrome.storage.local.get(["extensionStatusJSON"], function (result) {
    extensionStatusJSON = result.extensionStatusJSON;
    console.log("Extension status " + extensionStatusJSON.status);

    // Enable extension functions only if status is 200
    if (extensionStatusJSON.status == 200) {
      // NON CRITICAL DOM DEPENDENCY. Attempt to get username before meeting starts. Abort interval if valid username is found or if meeting starts and default to "You".
      checkElement(".awLEm").then(() => {
        // Poll the element until the textContent loads from network or until meeting starts
        const captureUserNameInterval = setInterval(() => {
          userName = document.querySelector(".awLEm").textContent;
          if (userName || hasMeetingStarted) {
            clearInterval(captureUserNameInterval);
            // Prevent overwriting default "You" where element is found, but valid userName is not available
            if (userName != "") overWriteChromeStorage(["userName"], false);
          }
        }, 100);
      });

      // 1. Meet UI prior to July/Aug 2024
      meetingRoutines(1);

      // 2. Meet UI post July/Aug 2024
      meetingRoutines(2);
    } else {
      // Show downtime message as extension status is 400
      showNotification(extensionStatusJSON);
    }
  });
});

// Add after global variables
let ws = null;
let transcriptProcessingInterval = null;

function setupWebSocket() {
  console.log("Setting up WebSocket");
  const meetingId = document.location.pathname.split("/")[1];

  // Get userId first, then set up WebSocket
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
      console.log("User ID:", userId);
      console.log("Meeting ID:", meetingId);

      const setMeetingId = async (mId) => {
        return new Promise((resolve, reject) => {
          chrome.storage.local.set({ mId }, () => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }
            resolve(`Meeting ID set to: ${mId}`);
          });
        });
      };

      (async () => {
        try {
          const result = await setMeetingId(meetingId); // Replace '12345' with your desired meeting ID
          console.log(result);
        } catch (error) {
          console.error("Error setting Meeting ID:", error);
        }
      })();

      const wsUrl = `wss://${BASE_URL_BACKEND.replace(
        "https://",
        ""
      )}/ws?meeting_id=${meetingId}&user_id=${userId}`;

      console.log("WebSocket URL:", wsUrl);

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket Connected");
      };

      ws.onclose = () => {
        console.log("WebSocket Disconnected");
        // Attempt to reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };
    }
  );
}

function checkStoredTranscripts() {
  chrome.storage.local.get(["transcript"], function (result) {
    // Optional: log more detailed information
    if (result.transcript) {
      result.transcript.forEach((entry, index) => {
        console.log(`Entry ${index + 1}:`);
        console.log(`Speaker: ${entry.personName}`);
        console.log(`Time: ${entry.timeStamp}`);
        console.log(`Text: ${entry.personTranscript}`);
        console.log("---");
      });
    }
  });
}

async function isAuthenticated() {
  try {
    // Send message to background script to check cookies
    const response = await chrome.runtime.sendMessage({
      action: "checkAuthentication",
      cookies: [
        {
          url: "http://localhost:3000",
          name: "amurex_session",
        },
        {
          url: "https://app.amurex.ai",
          name: "amurex_session",
        },
      ],
    });

    return response.is_authenticated;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

// Fetches extension status from GitHub and saves to chrome storage. Defaults to 200, if remote server is unavailable.
async function checkExtensionStatus() {
  const defaultStatus = {
    status: 200,
    message:
      "<strong class='caption-strong'>Amurex is running</strong> <br /><p class='caption-warning'>Do not turn off captions</p><style>.caption-strong { color: #c76dcc; } .caption-warning { color: white; }</style>",
  };

  try {
    const response = await fetch(`${BASE_URL_BACKEND}/health_check`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    await chrome.storage.local.set({
      extensionStatusJSON: {
        status: 200,
        message: defaultStatus.message,
      },
    });
  } catch (error) {
    console.error("Error checking extension status:", error);
    // Set default value if request fails
    await chrome.storage.local.set({
      extensionStatusJSON: defaultStatus,
    });
  }
}

// Modify doStuff to be debounced
const debouncedDoStuff = async function () {
  if (!window.location.hostname.includes("meet.google.com")) {
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    const meetingId = document.location.pathname.split("/")[1].split("?")[0];
    const formattedPayload = `${personNameBuffer} (${timeStampBuffer})\n${transcriptTextBuffer}\n`;
    let userId;
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getUserId",
      });
      userId = response.userId;
    } catch (error) {
      console.error("Error getting user id", error);
      return;
    }

    if (formattedPayload.length === 0) {
      return;
    }

    // Send suggestion check via WebSocket
    chrome.storage.local.get(["isFileUploaded"], function (result) {
      const isFileUploaded = result.isFileUploaded;

      // Now you can use isFileUploaded in your WebSocket message
      ws.send(
        JSON.stringify({
          type: "check_suggestion",
          data: {
            transcript: formattedPayload,
            user_id: userId,
            isFileUploaded: isFileUploaded,
          },
        })
      );
    });

    // Handle the response in WebSocket onmessage
    ws.onmessage = (event) => {
      if (!event.data) {
        return;
      }
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
        chrome.storage.local.get(["meetingQA"], function (result) {
          let qaHistory = result.meetingQA || [];
          qaHistory.push({
            timestamp: new Date().toISOString(),
            question: "Error processing response",
            answer: "Failed to generate meeting notes. Please try again later.",
            meetingId: document.location.pathname.split("/")[1].split("?")[0],
            type: "error_notification",
          });
          chrome.storage.local.set({ meetingQA: qaHistory }, function () {
            console.log("Error notification stored in meetingQA");
          });
        });
        return;
      }
      // Check for exceeded_response type
      if (data.type === "exceeded_response") {
        console.log("Response limit exceeded, stopping transcript processing");
        if (transcriptProcessingInterval) {
          clearInterval(transcriptProcessingInterval);
          transcriptProcessingInterval = null;
        }

        // Add notification to meetingQA
        chrome.storage.local.get(["meetingQA"], function (result) {
          let qaHistory = result.meetingQA || [];
          qaHistory.push({
            timestamp: new Date().toISOString(),
            question: "Only limited suggestions allowed per meeting in beta.",
            answer:
              "To get more suggestions and access to more exciting features, join our early adopters list at <a href='https://amurex.ai/early' target='_blank'>waitlist</a>.",
            meetingId: meetingId,
            type: "system_notification",
          });

          chrome.storage.local.set(
            {
              meetingQA: qaHistory,
            },
            function () {
              console.log("Exceeded response notification stored in meetingQA");
            }
          );
        });

        return;
      }

      if (data.type && data.type === "suggestion_response") {
        const generatedSuggestions = data.generated_suggestion;
        const questionAnswered = data.last_question;
        if (!generatedSuggestions && !questionAnswered) {
          console.log("No question or answer to store");
          return;
        }

        chrome.storage.local.get(["meetingQA"], function (result) {
          let qaHistory = result.meetingQA || [];
          if (!(questionAnswered && generatedSuggestions)) {
            console.log("No question or answer to store");
            return;
          }
          qaHistory.push({
            timestamp: new Date().toISOString(),
            question: questionAnswered,
            answer: generatedSuggestions,
            meetingId: meetingId,
          });

          chrome.storage.local.set(
            {
              meetingQA: qaHistory,
            },
            function () {
              console.log("Q&A stored in chrome storage");
            }
          );
        });
      }
    };
  }
};

function meetingRoutines(uiType) {
  const meetingEndIconData = {
    selector: "",
    text: "",
  };
  const captionsIconData = {
    selector: "",
    text: "",
  };

  const videoPreview = ".ZUpb4c";
  // Different selector data for different UI versions
  switch (uiType) {
    case 1:
      meetingEndIconData.selector = ".google-material-icons";
      meetingEndIconData.text = "call_end";
      captionsIconData.selector = ".material-icons-extended";
      captionsIconData.text = "closed_caption_off";
      break;
    case 2:
      meetingEndIconData.selector = ".google-symbols";
      meetingEndIconData.text = "call_end";
      captionsIconData.selector = ".google-symbols";
      captionsIconData.text = "closed_caption_off";
    default:
      break;
  }

  checkElement(videoPreview).then(() => {
    // console.log("Video preview found");
    // make a request to the backend to check if the meeting has started
    const meetingId = document.location.pathname.split("/")[1];
    fetch(`${BASE_URL_BACKEND}/check_meeting/${meetingId}`)
      .then((response) => response.json())
      .then((data) => {
        const meetingStarted = data.is_meeting;
        if (meetingStarted) {
          showNotificationLive({
            status: 200,
            message:
              "Meeting has started. Need a summary of what has been said?",
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching meeting started status", error);
      });
  });

  // CRITICAL DOM DEPENDENCY. Wait until the meeting end icon appears, used to detect meeting start
  checkElement(meetingEndIconData.selector, meetingEndIconData.text).then(
    async () => {
      chrome.runtime.sendMessage(
        { type: "new_meeting_started" },
        function (response) {
          console.log(response);
        }
      );
      hasMeetingStarted = true;
      chrome.storage.local.set({ meetingQA: [] }, function () {
        console.log("Meeting QA cleared due to meeting start");
      });

      setupWebSocket();

      // Start the transcript processing interval
      transcriptProcessingInterval = setInterval(debouncedDoStuff, 5000);

      // Add tab press event listener
      document.addEventListener("keydown", function (event) {
        if (event.key === "Tab" && !hasMeetingEnded) {
          event.preventDefault(); // Prevent default tab behavior

          // Show loading notification
          showNotification({
            status: 200,
            message: "<strong>Loading suggestions...</strong>",
          });

          let meetingId = document.location.pathname.split("/")[1];
          fetch(`${BASE_URL_BACKEND}/suggestions/${meetingId}`)
            .then((response) => {
              return response.json();
            })
            .then((data) => {
              if (data.suggestions) {
                // Create suggestion notification content
                const suggestionsHtml = data.suggestions
                  .split("\n")
                  .map((suggestion) => `<li>${suggestion}</li>`)
                  .join("");

                const notificationContent = `
                  <strong>Suggested Questions:</strong>
                  <ul style="
                    list-style-type: none;
                    padding-left: 0;
                    margin-top: 8px;
                  ">
                    ${suggestionsHtml}
                  </ul>
                `;

                // Show suggestions in notification
                showNotification({
                  status: 200,
                  message: notificationContent,
                });
              } else {
                // Show error if no suggestions
                showNotification({
                  status: 400,
                  message:
                    "<strong>No suggestions available at this time</strong>",
                });
              }
            })
            .catch((error) => {
              console.error("Error fetching suggestions:", error);
              showNotification({
                status: 400,
                message: "<strong>Failed to load suggestions</strong>",
              });
            });
        }
      });

      try {
        //*********** MEETING START ROUTINES **********//
        // Pick up meeting name after a delay, since Google meet updates meeting name after a delay
        setTimeout(() => updateMeetingTitle(), 5000);

        // **** TRANSCRIPT ROUTINES **** //
        const captionsButton = contains(
          captionsIconData.selector,
          captionsIconData.text
          // CRITICAL DOM DEPENDENCY
        )[0];

        // Click captions icon for non manual operation modes. Async operation.
        chrome.storage.sync.get(["operationMode"], function (result) {
          if (result.operationMode == "manual")
            console.log("Manual mode selected, leaving transcript off");
          else captionsButton.click();
        });

        // CRITICAL DOM DEPENDENCY. Grab the transcript element. This element is present, irrespective of captions ON/OFF, so this executes independent of operation mode.
        const transcriptTargetNode = document.querySelector(".a4cQT");
        // attempt one to dim down the transcript
        if (transcriptTargetNode) {
          transcriptTargetNode.style.position = "absolute";
        }

        // Attempt to dim down the transcript
        try {
          // console.log("This is the transcriptTargetNode", transcriptTargetNode);
          transcriptTargetNode.firstChild.style.opacity = 0.2;
        } catch (error) {
          console.error(error);
        }

        // transcriptTargetNode.style.position = "absolute";
        // console.log(transcriptTargetNode);

        // Create transcript observer instance linked to the callback function. Registered irrespective of operation mode, so that any visible transcript can be picked up during the meeting, independent of the operation mode.
        const transcriptObserver = new MutationObserver(transcriber);

        // Start observing the transcript element and chat messages element for configured mutations
        transcriptObserver.observe(transcriptTargetNode, mutationConfig);

        // **** CHAT MESSAGES ROUTINES **** //
        const chatMessagesButton = contains(".google-symbols", "chat")[0];
        // Force open chat messages to make the required DOM to appear. Otherwise, the required chatMessages DOM element is not available.
        chatMessagesButton.click();
        let chatMessagesObserver;
        // Allow DOM to be updated and then register chatMessage mutation observer
        setTimeout(() => {
          chatMessagesButton.click();
          // CRITICAL DOM DEPENDENCY. Grab the chat messages element. This element is present, irrespective of chat ON/OFF, once it appears for this first time.
          try {
            const chatMessagesTargetNode = document.querySelectorAll(
              'div[aria-live="polite"]'
            )[0];

            // Create chat messages observer instance linked to the callback function. Registered irrespective of operation mode.
            chatMessagesObserver = new MutationObserver(chatMessagesRecorder);

            chatMessagesObserver.observe(
              chatMessagesTargetNode,
              mutationConfig
            );
          } catch (error) {
            console.error(error);
            showNotification(extensionStatusJSON_bug);
          }
        }, 1000);

        // Check authentication and show appropriate notification
        chrome.storage.sync.get(["operationMode"], async function (result) {
          const is_authenticated = await isAuthenticated();
          if (!is_authenticated) {
            showNotification({
              status: 401,
              message:
                "<strong>Please sign in to Amurex</strong> <br /> Click on the extension icon to sign in.",
            });
          } else {
            // User is authenticated, check operation mode
            if (result.operationMode == "manual") {
              showNotification({
                status: 400,
                message:
                  "<strong>Amurex is not running</strong> <br /> Turn on captions using the CC icon, if needed",
              });
            } else {
              // we will need to upload the context to the server here
              showNotificationContextual(extensionStatusJSON);
              // showNotification(extensionStatusJSON);
            }
          }
        });

        //*********** MEETING END ROUTINES **********//
        // CRITICAL DOM DEPENDENCY. Event listener to capture meeting end button click by user
        contains(
          meetingEndIconData.selector,
          meetingEndIconData.text
        )[0].parentElement.parentElement.addEventListener("click", () => {
          // To suppress further errors
          hasMeetingEnded = true;

          // Stop the transcript processing interval
          if (transcriptProcessingInterval) {
            clearInterval(transcriptProcessingInterval);
            transcriptProcessingInterval = null;
          }

          // Clear meetingQA from storage
          console.log("Setting hasMeetingEnded to true");
          chrome.storage.local.set(
            { meetingQA: [], hasMeetingEnded: true },
            function () {
              console.log("Meeting QA cleared due to meeting end");
            }
          );

          transcriptObserver.disconnect();
          chatMessagesObserver.disconnect();
          checkStoredTranscripts();

          // Push any data in the buffer variables to the transcript array, but avoid pushing blank ones. Needed to handle one or more speaking when meeting ends.
          if (personNameBuffer != "" && transcriptTextBuffer != "")
            pushBufferToTranscript();
          // Save to chrome storage and send message to download transcript from background script
          console.log(
            "Saving to chrome storage and sending message to download transcript from background script"
          );

          chrome.runtime.sendMessage({ type: "meeting_ended" });
          chrome.runtime.sendMessage({ type: "open_side_panel" });

          // can you send a notification to user saying that we are processing the transcript?
          overWriteChromeStorage(["transcript", "chatMessages"], true);
          chrome.storage.local.set({userName: ""});

          // we will need to make an API call here to save the transcript to the cloud
        });
      } catch (error) {
        console.error(error);
        showNotification(extensionStatusJSON_bug);
      }
    }
  );
}

// Returns all elements of the specified selector type and specified textContent. Return array contains the actual element as well as all the upper parents.
function contains(selector, text) {
  const elements = document.querySelectorAll(selector);
  return Array.prototype.filter.call(elements, element => {
    return RegExp(text).test(element.textContent);
  });
}

// Efficiently waits until the element of the specified selector and textContent appears in the DOM. Polls only on animation frame change
const checkElement = async (selector, text) => {
  if (text) {
    // loops for every animation frame change, until the required element is found
    while (
      !Array.from(document.querySelectorAll(selector)).find(
        (element) => element.textContent === text
      )
    ) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  } else {
    // loops for every animation frame change, until the required element is found
    while (!document.querySelector(selector)) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }
  return document.querySelector(selector);
};

// Shows a responsive notification of specified type and message
function showNotification(extensionStatusJSON) {
  // Banner CSS
  let html = document.querySelector("html");
  let obj = document.createElement("div");
  let logo = document.createElement("img");
  let text = document.createElement("p");

  // Style the container
  obj.style.cssText = `
      position: fixed;
      top: 20px;
      right: 50%;
      transform: translateX(50%);
      background: black;
      padding: 20px;
      border-radius: 8px;
      z-index: 10000;
      width: 400px;
      font-family: "Host Grotesk", sans-serif;
    `;

  // Style logo
  logo.setAttribute(
    "src",
    "https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
  );
  logo.setAttribute("height", "32px");
  logo.setAttribute("width", "32px");
  logo.style.cssText = "border-radius: 4px";

  // Style text
  text.style.cssText = `
      color: ${extensionStatusJSON.status === 200 ? "#fff" : "#c76dcc"};
      margin: 10px 0;
    `;
  text.innerHTML = extensionStatusJSON.message;

  // Watch for the end button
  const checkEndButton = setInterval(() => {
    const endButtonExists = contains(
      meetingEndIconData.selector,
      meetingEndIconData.text
    ).length > 0;

    if (endButtonExists) {
      obj.style.display = "none";
      clearInterval(checkEndButton);
    }
  }, 1000);

  obj.appendChild(logo);
  obj.appendChild(text);
  if (html) html.append(obj);
}

// Shows a notification that does not disappear
function showNotificationLive() {
  let html = document.querySelector("html");
  let obj = document.createElement("div");
  obj.id = "live-notification";
  let logo = document.createElement("img");
  let text = document.createElement("p");
  let buttonContainer = document.createElement("div");

  // Style the container
  obj.style.cssText = `
    position: fixed;
    top: 20px;
    right: 50%;
    transform: translateX(50%);
    background: black;
    padding: 20px;
    border-radius: 8px;
    z-index: 10000;
    width: 400px;
    font-family: "Host Grotesk", sans-serif;
  `;

  // Style logo
  logo.setAttribute(
    "src",
    "https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
  );
  logo.setAttribute("height", "32px");
  logo.setAttribute("width", "32px");
  logo.style.cssText = "border-radius: 4px";

  // Style text
  text.style.cssText = `
    color: #fff;
    margin: 10px 0;
  `;
  text.innerHTML = "Meeting ended. Would you like to see the summary and action items?";

  // Style button container
  buttonContainer.style.cssText = "display: flex; gap: 10px; margin-top: 10px;";

  // Create Yes button
  let yesButton = document.createElement("button");
  yesButton.textContent = "Yes";
  yesButton.style.cssText = `
    background: #c76dcc;
    color: white;
    border: none;
    padding: 5px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-family: "Host Grotesk", sans-serif;
    font-weight: 500;
  `;

  // Create No button
  let noButton = document.createElement("button");
  noButton.textContent = "No";
  noButton.style.cssText = `
    background: transparent;
    color: #c76dcc;
    border: 1px solid #c76dcc;
    padding: 5px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-family: "Host Grotesk", sans-serif;
    font-weight: 500;
  `;

  // Add click handlers
  yesButton.addEventListener("click", () => {
    const meetingId = document.location.pathname.split("/")[1].split("?")[0];
    createAnimatedPanel(meetingId);
    obj.remove();
  });

  noButton.addEventListener("click", () => {
    obj.remove();
  });

  // Watch for the end button
  const checkEndButton = setInterval(() => {
    const endButtonExists = contains(
      meetingEndIconData.selector,
      meetingEndIconData.text
    ).length > 0;

    if (endButtonExists) {
      obj.style.display = "none";
      clearInterval(checkEndButton);
    }
  }, 1000);

  // Assemble the components
  obj.appendChild(logo);
  obj.appendChild(text);
  obj.appendChild(buttonContainer);
  buttonContainer.appendChild(yesButton);
  buttonContainer.appendChild(noButton);

  if (html) html.append(obj);
}

// Shows a notification that does not disappear
function showNotificationContextual(extensionStatusJSON) {
  // Banner CSS
  let html = document.querySelector("html");
  let obj = document.createElement("div");
  let logo = document.createElement("img");
  let text = document.createElement("p");
  let buttonContainer = document.createElement("div");
  obj.style.backgroundColor = "black";

  logo.setAttribute(
    "src",
    "https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75"
  );
  logo.setAttribute("height", "32px");
  logo.setAttribute("width", "32px");
  logo.style.cssText = "border-radius: 4px";

  // Style the button container
  buttonContainer.style.cssText =
    "display: flex; justify-content: center; margin-top: 10px;";

  // Create Open Panel button
  let openPanelButton = document.createElement("button");
  openPanelButton.textContent = "Upload Meeting Files";
  openPanelButton.style.cssText = `
    background: #c76dcc;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-family: "Host Grotesk", sans-serif;
    font-weight: 500;
    transition: background 0.2s;
  `;

  openPanelButton.addEventListener("mouseover", () => {
    openPanelButton.style.background = "#c76dcc";
  });

  openPanelButton.addEventListener("mouseout", () => {
    openPanelButton.style.background = "#c76dcc";
  });

  // Add click handler
  openPanelButton.addEventListener("click", () => {
    const meetingId = window.location.pathname.split("/")[1].split("?")[0];
    chrome.runtime.sendMessage({
      type: "open_file_upload_panel",
      meetingId: meetingId,
    });
    obj.remove(); // Remove notification after clicking
  });

  // Remove banner after 5s
  setTimeout(() => {
    obj.style.display = "none";
  }, 5000);

  if (extensionStatusJSON.status == 200) {
    obj.style.cssText = `color: #2A9ACA; ${commonCSS}`;
    text.innerHTML = extensionStatusJSON.message;
  } else {
    obj.style.cssText = `color: orange; ${commonCSS}`;
    text.innerHTML = extensionStatusJSON.message;
  }

  buttonContainer.appendChild(openPanelButton);
  obj.prepend(buttonContainer);
  obj.prepend(text);
  obj.prepend(logo);
  if (html) html.append(obj);
}

// CSS for notification
const commonCSS = `background: rgb(255 255 255 / 10%); 
    backdrop-filter: blur(16px); 
    position: fixed;
    top: 5%; 
    left: 0; 
    right: 0; 
    margin-left: auto; 
    margin-right: auto;
    max-width: 780px;  
    z-index: 1000; 
    padding: 0rem 1rem;
    border-radius: 8px; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    gap: 16px;  
    font-size: 1rem; 
    line-height: 1.5; 
    font-family: 'Google Sans',Roboto,Arial,sans-serif; 
    box-shadow: rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;`;

// Callback function to execute when transcription mutations are observed.
function transcriber(mutationsList, observer) {
  // Delay for 1000ms to allow for text corrections by Meet.
  mutationsList.forEach((mutation) => {
    try {
      // CRITICAL DOM DEPENDENCY. Get all people in the transcript
      const people =
        document.querySelector(".a4cQT")?.childNodes[1]?.firstChild
          ?.childNodes ||
        document.querySelector(".a4cQT")?.firstChild?.firstChild?.childNodes;
      // Begin parsing transcript
      if (people.length > 0) {
        // Get the last person
        const person = people[people.length - 1];
        // CRITICAL DOM DEPENDENCY
        const currentPersonName = person.childNodes[0].textContent;
        // CRITICAL DOM DEPENDENCY
        const currentTranscriptText =
          person.childNodes[1].lastChild.textContent;

        // Starting fresh in a meeting or resume from no active transcript
        if (beforeTranscriptText == "") {
          personNameBuffer = currentPersonName;
          timeStampBuffer = new Date()
            .toLocaleString("default", timeFormat)
            .toUpperCase();
          beforeTranscriptText = currentTranscriptText;
          transcriptTextBuffer = currentTranscriptText;
        }
        // Some prior transcript buffer exists
        else {
          // New person started speaking
          if (personNameBuffer != currentPersonName) {
            // Push previous person's transcript as a block
            pushBufferToTranscript();
            overWriteChromeStorage(["transcript"], false);

            // Send WebSocket message
            if (ws && ws.readyState === WebSocket.OPEN) {
              const formattedPayload = `${personNameBuffer} (${timeStampBuffer})\n${transcriptTextBuffer}\n`;
              ws.send(
                JSON.stringify({
                  type: "transcript_update",
                  data: formattedPayload,
                })
              );
            }

            // Update buffers for next mutation and store transcript block timeStamp
            beforeTranscriptText = currentTranscriptText;
            personNameBuffer = currentPersonName;
            timeStampBuffer = new Date()
              .toLocaleString("default", timeFormat)
              .toUpperCase();
            transcriptTextBuffer = currentTranscriptText;
          }
          // Same person speaking more
          else {
            transcriptTextBuffer = currentTranscriptText;
            // Update buffers for next mutation
            beforeTranscriptText = currentTranscriptText;
            // If a person is speaking for a long time, Google Meet does not keep the entire text in the spans. Starting parts are automatically removed in an unpredictable way as the length increases and Amurex will miss them. So we force remove a lengthy transcript node in a controlled way. Google Meet will add a fresh person node when we remove it and continue transcription. Amurex picks it up as a new person and nothing is missed.
            if (currentTranscriptText.length > 250) person.remove();
          }
        }
      }
      // No people found in transcript DOM
      else {
        // No transcript yet or the last person stopped speaking(and no one has started speaking next)
        console.log("No active transcript");
        // Push data in the buffer variables to the transcript array, but avoid pushing blank ones.
        if (personNameBuffer != "" && transcriptTextBuffer != "") {
          pushBufferToTranscript();
          overWriteChromeStorage(["transcript"], false);

          // Send WebSocket message
          if (ws && ws.readyState === WebSocket.OPEN) {
            const formattedPayload = `${personNameBuffer} (${timeStampBuffer})\n${transcriptTextBuffer}\n`;
            ws.send(
              JSON.stringify({
                type: "transcript_update",
                data: formattedPayload,
              })
            );
          }
        }
        // Update buffers for the next person in the next mutation
        beforePersonName = "";
        beforeTranscriptText = "";
        personNameBuffer = "";
        transcriptTextBuffer = "";
      }
    } catch (error) {
      if (isTranscriptDomErrorCaptured == false && hasMeetingEnded == false) {
        chrome.storage.local.set({ meetingQA: [] }, function () {
          console.log("Meeting QA cleared due to error");
        });
        console.log(reportErrorMessage);
        showNotification(extensionStatusJSON_bug);
      }
      isTranscriptDomErrorCaptured = true;
    }
  });
}

// Callback function to execute when chat messages mutations are observed.
function chatMessagesRecorder(mutationsList, observer) {
  mutationsList.forEach((mutation) => {
    try {
      // CRITICAL DOM DEPENDENCY. Get all people in the transcript
      const chatMessagesElement = document.querySelectorAll(
        'div[aria-live="polite"]'
      )[0];
      // Attempt to parse messages only if at least one message exists
      if (chatMessagesElement.children.length > 0) {
        // CRITICAL DOM DEPENDENCY. Get the last message that was sent/received.
        const chatMessageElement = chatMessagesElement.lastChild;
        // CRITICAL DOM DEPENDENCY.
        const personName = chatMessageElement.firstChild.firstChild.textContent;
        const timeStamp = new Date()
          .toLocaleString("default", timeFormat)
          .toUpperCase();
        // CRITICAL DOM DEPENDENCY. Some mutations will have some noisy text at the end, which is handled in pushUniqueChatBlock function.
        const chatMessageText =
          chatMessageElement.lastChild.lastChild.textContent;

        const chatMessageBlock = {
          personName: personName,
          timeStamp: timeStamp,
          chatMessageText: chatMessageText,
        };

        // Lot of mutations fire for each message, pick them only once
        pushUniqueChatBlock(chatMessageBlock);
        overWriteChromeStorage(["chatMessages", false]);
      }
    } catch (error) {
      console.error(error);
      if (isChatMessagesDomErrorCaptured == false && hasMeetingEnded == false) {
        console.log(reportErrorMessage);
        showNotification(extensionStatusJSON_bug);
      }
      isChatMessagesDomErrorCaptured = true;
    }
  });
}

// Pushes data in the buffer to transcript array as a transcript block
function pushBufferToTranscript() {
  transcript.push({
    personName: personNameBuffer,
    timeStamp: timeStampBuffer,
    personTranscript: transcriptTextBuffer,
  });
}

// Pushes object to array only if it doesn't already exist. chatMessage is checked for substring since some trailing text(keep Pin message) is present from a button that allows to pin the message.
function pushUniqueChatBlock(chatBlock) {
  const isExisting = chatMessages.some(
    (item) =>
      item.personName == chatBlock.personName &&
      item.timeStamp == chatBlock.timeStamp &&
      chatBlock.chatMessageText.includes(item.chatMessageText)
  );
  if (!isExisting) chatMessages.push(chatBlock);
}

// Saves specified variables to chrome storage. Optionally, can send message to background script to download, post saving.
function overWriteChromeStorage(keys, sendDownloadMessage) {
  const objectToSave = {};
  // Hard coded list of keys that are accepted
  if (keys.includes("userName")) objectToSave.userName = userName;
  if (keys.includes("transcript")) objectToSave.transcript = transcript;
  if (keys.includes("meetingTitle")) objectToSave.meetingTitle = meetingTitle;
  if (keys.includes("meetingStartTimeStamp"))
    objectToSave.meetingStartTimeStamp = meetingStartTimeStamp;
  if (keys.includes("chatMessages")) objectToSave.chatMessages = chatMessages;

  chrome.storage.local.set(objectToSave, function () {
    console.log("Saved to chrome storage", keys);
  });
}
// Grabs updated meeting title, if available. Replaces special characters with underscore to avoid invalid file names.
function updateMeetingTitle() {
  try {
    // NON CRITICAL DOM DEPENDENCY
    const title = document.querySelector(".u6vdEc").textContent;
    const invalidFilenameRegex = /[^\w\-_.() ]/g;
    meetingTitle = title.replace(invalidFilenameRegex, "_");
    overWriteChromeStorage(["meetingTitle"], false);
  } catch (error) {
    console.error(error);
  }
}

// Add this function at the top level of your content.js
function createAnimatedPanel(meetingId) {
  const existingNotification = document.getElementById('live-notification');
  
  if (existingNotification) {
    // Update the content with a more spacious layout
    existingNotification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 20px; width: 100%;">

        <div class="expanded-content" style="flex-grow: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="https://www.amurex.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FAmurexLogo.56901b87.png&w=64&q=75" 
                height="32px" 
                width="32px" 
                style="border-radius: 4px;"
              />
              <p style="color: #fff; margin: 0; font-size: 16px; font-weight: 500;">Meeting Summary</p>
            </div>
            <span style="color: rgba(255,255,255,0.6); font-size: 14px;">ID: ${meetingId}</span>
          </div>
          <div class="summary-preview" style="
            background: rgba(255, 255, 255, 0.1);
            padding: 16px;
            border-radius: 8px;
            margin: 10px 0;
            max-height: 400px;
            overflow-y: auto;
          ">
            <p style="color: #fff; margin: 0;">Loading summary...</p>
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <button class="close-btn" style="
              background: transparent;
              color: #c76dcc;
              border: 1px solid #c76dcc;
              padding: 8px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-family: 'Host Grotesk', sans-serif;
              font-weight: 500;
              font-size: 14px;
            ">Close</button>
          </div>
        </div>
      </div>
    `;

    // Update the notification styles
    existingNotification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 50%;
      transform: translateX(50%);
      background: black;
      padding: 24px;
      border-radius: 12px;
      z-index: 10000;
      width: 60vw;
      max-width: 1000px;
      min-width: 600px;
      font-family: "Host Grotesk", sans-serif;
      transition: all 0.3s ease-in-out;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    `;

    // Add click handler for close button
    existingNotification.querySelector('.close-btn').addEventListener('click', () => {
      existingNotification.remove();
    });

    // Watch for the end button
    const checkEndButton = setInterval(() => {
      const endButtonExists = contains(
        meetingEndIconData.selector,
        meetingEndIconData.text
      ).length > 0;

      if (endButtonExists) {
        existingNotification.remove();
        clearInterval(checkEndButton);
      }
    }, 1000);

    // Get summary preview element and fetch data
    const summaryPreview = existingNotification.querySelector('.summary-preview');
    
    // Fetch summary through background script
    chrome.runtime.sendMessage(
      { type: "fetch_late_summary", meetingId },
      function(response) {
        if (response.success && response.data) {
          const data = response.data;
          summaryPreview.innerHTML = `
            <div class="notes-content" style="color: #fff;">${
              data.late_summary
                ? data.late_summary
                    .trim()
                    .split("\n")
                    .filter((line) => line.trim() !== "")
                    .map((line) => {
                      // Handle headings first
                      if (line.startsWith('### ')) {
                        return `<h3 style="color: #fff; font-size: 16px; margin: 16px 0 8px 0;">${line.substring(4)}</h3>`;
                      } else if (line.startsWith('## ')) {
                        return `<h2 style="color: #fff; font-size: 18px; margin: 20px 0 10px 0;">${line.substring(3)}</h2>`;
                      } else if (line.startsWith('# ')) {
                        return `<h1 style="color: #fff; font-size: 20px; margin: 24px 0 12px 0;">${line.substring(2)}</h1>`;
                      } else if (line.startsWith('- ')) {
                        return `<li style="margin-bottom: 8px;">${line.substring(2)}</li>`;
                      } else {
                        return line
                          .replace(/\*\*(.*?)\*\*/g, "<strong style='color: #c76dcc'>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #c76dcc; text-decoration: none;">$1</a>');
                      }
                    })
                    .join("\n")
                    .replace(
                      /(<li>.*?<\/li>)\n?(<li>.*?<\/li>)+/g,
                      (list) => `<ul style="list-style-type: none; padding-left: 0;">${list}</ul>`
                    )
                    .replace(/\n/g, "<br>")
                : "No meeting notes available yet."
            }</div>
          `;
        } else {
          summaryPreview.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <p style="color: #fff; margin: 0; font-size: 14px;">Failed to load meeting summary. Please try again later.</p>
            </div>
          `;
        }
      }
    );
  }
}