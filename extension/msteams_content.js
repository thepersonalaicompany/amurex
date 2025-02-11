const plt = {platform: "msteams"};
chrome.storage.local.set(plt);
console.log("MS teams platform local variable has been set");

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

const timeFormat = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
};

let meetingStartTimeStamp = new Date()
    .toLocaleString("default", timeFormat)
    .replace(/[/:]/g, "-")
    .toUpperCase();
overWriteChromeStorage(["meetingStartTimeStamp"], false);

// Ensure these variables are defined globally
let captionsActivated = false;
let observerInitialized = false;
let transcriptMessages = [];
let transcript = [];

// Function to check if a Teams meeting has started
function checkTeamsMeetingStart() {
    const meetingStartIndicator = document.querySelector("#hangup-button");

    if (meetingStartIndicator && !captionsActivated) {
        console.log("Microsoft Teams meeting has started.");

        // Add a 1-second delay before activating captions
        setTimeout(async () => {
            await activateCaptionsInTeams();
            captionsActivated = true; // Set the flag to true after execution

            console.log(`this is observerinitialized: ${observerInitialized}`);

            // Initialize the observer only once
            if (!observerInitialized) {
                await waitForTranscriptWrapper();
                setupObserver();
                console.log(`this is captionsactivated: ${captionsActivated}`);
                observerInitialized = true;

                // Generate a UUID for the meeting ID
                const generateMeetingId = () => {
                    return 'ms-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                };

                const meetingId = generateMeetingId();
                console.log(`Generated meeting ID: ${meetingId}`);

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
            }
        }, 1000);
    } else if (!meetingStartIndicator) {
        console.log("No meeting detected.");
        // Save the transcript to local storage when the meeting ends
        if (transcriptMessages.length > 0) {
            localStorage.setItem('transcript', JSON.stringify(transcriptMessages));
            console.log("Transcript saved as local variable.");

            // Retrieve and process the transcript
            transcript = JSON.parse(localStorage.getItem('transcript'));

            // Convert the transcript object into a formatted string
            let transcriptString = transcript.map(entry => {
                return `Time: ${entry.timestamp}\nSpeaker: ${entry.speaker}\nText: ${entry.message}\n---`;
            }).join('\n\n');

            console.log("Formatted Transcript:\n" + transcriptString);
        
            storeTranscript();
            chrome.runtime.sendMessage({ type: "meeting_ended" });
            chrome.runtime.sendMessage({ type: "open_side_panel" });
            transcriptMessages = []; // Clear the messages after saving
        }
    }
}

// Function to activate captions in Teams
function activateCaptionsInTeams() {
    return new Promise(async (resolve) => {
        try {
            // Step 1: Click show more button and wait for menu
            const showMoreButton = document.getElementById("callingButtons-showMoreBtn");
            if (!showMoreButton) {
                console.log("Show more button not found");
                return resolve();
            }
            
            console.log("Clicking show more button");
            showMoreButton.click();
            
            // Wait for language menu to appear
            const languageSpeechMenuControl = await waitForElement("LanguageSpeechMenuControl-id", 5000);
            if (!languageSpeechMenuControl) {
                console.log("Language menu did not appear");
                return resolve();
            }

            console.log("Clicking language menu");
            languageSpeechMenuControl.click();

            // Wait for captions button to appear
            const captionsButton = await waitForElement("closed-captions-button", 5000);
            if (!captionsButton) {
                console.log("Captions button did not appear");
                return resolve();
            }

            console.log("Clicking captions button");
            captionsButton.click();
            console.log("Captions activated in Microsoft Teams");
            resolve();

        } catch (error) {
            console.error("Error activating captions:", error);
            resolve();
        }
    });
}

// Helper function to wait for an element
function waitForElement(elementId, timeout) {
    return new Promise((resolve) => {
        const element = document.getElementById(elementId);
        if (element) {
            return resolve(element);
        }

        const startTime = Date.now();
        const observer = new MutationObserver(() => {
            const element = document.getElementById(elementId);
            if (element) {
                observer.disconnect();
                resolve(element);
            } else if (Date.now() - startTime >= timeout) {
                observer.disconnect();
                resolve(null);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// Function to wait for the transcript wrapper to load
function waitForTranscriptWrapper() {
    return new Promise((resolve) => {
        const checkWrapper = setInterval(() => {
            const transcriptWrapper = document.querySelector('[data-tid="closed-caption-v2-window-wrapper"]');

            if (transcriptWrapper) {
                clearInterval(checkWrapper);
                resolve(); // Resolve the promise when the wrapper is found
            }
        }, 1000); // Check every 500 milliseconds
    });
}


function storeTranscript() {
    // Prepare the object to save
    const objectToSave = {
        transcript: transcript, // Assuming 'transcript' is your transcript array
        // Add any other data you want to store
    };

    // Store the transcript in local storage
    chrome.storage.local.set(objectToSave, function () {
        console.log("Transcript saved to chrome storage");
    });
}


function setupObserver() {
    const transcriptWrapper = document.querySelector('[data-tid="closed-caption-v2-window-wrapper"]');
    
    if (transcriptWrapper) {
        console.log("Found the transcript wrapper");

        const virtualListContent = transcriptWrapper.querySelector('[data-tid="closed-caption-v2-virtual-list-content"]');

        if (virtualListContent) {
            console.log("Found the virtual list content");

            const config = { childList: true, subtree: true };

            const callback = (mutationsList, observer) => {
                mutationsList.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && node.matches('div')) {
                                const messageDivs = node.querySelectorAll('.ui-chat__item__message');
                                messageDivs.forEach(messageDiv => {
                                    const nameElement = messageDiv.querySelector('.ui-chat__message__author');
                                    const messageElement = messageDiv.querySelector('[data-tid="closed-caption-text"]');
                                    
                                    const speakerName = nameElement ? nameElement.textContent.trim() : "Unknown";
                                    const messageText = messageElement ? messageElement.textContent.trim() : "";

                                    // Push the initial message to transcriptMessages
                                    transcriptMessages.push({ 
                                        speaker: speakerName, 
                                        message: messageText,
                                        timestamp: new Date().toLocaleString() // Add local timestamp
                                    });

                                    // Set up an observer for the message text element
                                    const messageObserver = new MutationObserver(() => {
                                        const updatedMessageText = messageElement.textContent.trim();
                                        console.log(`updatedMessageText: ${updatedMessageText}`);
                                        if (updatedMessageText !== messageText) {
                                            console.log(`Updated Message: ${updatedMessageText}`);
                                            // Update the last message in the transcript array
                                            const lastMessage = transcriptMessages[transcriptMessages.length - 1];
                                            lastMessage.message = updatedMessageText;
                                            // No need to update timestamp for edits
                                        }
                                    });

                                    messageObserver.observe(messageElement, { childList: true, characterData: true, subtree: true });
                                });

                                // here
                            } else {
                                console.log("Node does not match expected chat message structure.");
                            }
                        });
                    }
                });
            };

            const observer = new MutationObserver(callback);
            observer.observe(virtualListContent, config);

            console.log("MutationObserver initialized for Microsoft Teams transcript.");
        } else {
            console.log("No virtual list content found. Retrying in 500ms...");
            setTimeout(setupObserver, 1000); // Retry after 500 milliseconds
        }
    } else {
        console.log("Transcript wrapper not found. Waiting for content...");
        // Optionally, you can set a timeout or retry mechanism here
    }
}


// Set an interval to check for meeting start every second
setInterval(checkTeamsMeetingStart, 1000);