// Ensure these variables are defined globally
let captionsActivated = false;
let observerInitialized = false;
<<<<<<< HEAD
let transcriptMessages = [];
=======
>>>>>>> fca549e (Add MS Teams support)

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
            }
        }, 1000);
    } else if (!meetingStartIndicator) {
        console.log("No meeting detected.");
<<<<<<< HEAD
        // Save the transcript to local storage when the meeting ends
        if (transcriptMessages.length > 0) {
            localStorage.setItem('transcript', JSON.stringify(transcriptMessages));
            console.log("Transcript saved to local storage.");
            transcriptMessages = []; // Clear the messages after saving
        }
=======
>>>>>>> fca549e (Add MS Teams support)
    }
}

// Function to activate captions in Teams
function activateCaptionsInTeams() {
    return new Promise((resolve) => {
        const showMoreButton = document.getElementById("callingButtons-showMoreBtn");

        if (showMoreButton) {
            console.log("found the button");
            showMoreButton.click();

            const waitForElement = setInterval(() => {
                const languageSpeechMenuControl = document.getElementById("LanguageSpeechMenuControl-id");

                if (languageSpeechMenuControl) {
                    clearInterval(waitForElement);
                    languageSpeechMenuControl.click();

                    const waitForCaptionsButton = setInterval(() => {
                        const captionsButton = document.getElementById("closed-captions-button");

                        if (captionsButton) {
                            clearInterval(waitForCaptionsButton);
                            captionsButton.click();

                            console.log("Captions activated in Microsoft Teams.");
                            resolve(); // Resolve the promise when captions are activated
                        }
<<<<<<< HEAD
                    }, 1000); // Check every 500 milliseconds
                }
            }, 1000); // Check every 500 milliseconds
=======
                    }, 500); // Check every 500 milliseconds
                }
            }, 500); // Check every 500 milliseconds
>>>>>>> fca549e (Add MS Teams support)
        } else {
            console.log("Unable to find the necessary elements to activate captions.");
            resolve(); // Resolve the promise if elements are not found
        }
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
<<<<<<< HEAD
        }, 1000); // Check every 500 milliseconds
    });
}

// function setupObserver() {
//     const transcriptWrapper = document.querySelector('[data-tid="closed-caption-v2-window-wrapper"]');
    
//     if (transcriptWrapper) {
//         console.log("Found the transcript wrapper");

//         const virtualListContent = transcriptWrapper.querySelector('[data-tid="closed-caption-v2-virtual-list-content"]');

//         if (virtualListContent) {
//             console.log("Found the virtual list content");

//             const config = { childList: true, subtree: true };

//             const callback = (mutationsList, observer) => {
//                 mutationsList.forEach(mutation => {
//                     if (mutation.type === 'childList') {
//                         mutation.addedNodes.forEach(node => {
//                             if (node.nodeType === 1 && node.matches('div')) {
//                                 const messageDivs = node.querySelectorAll('.ui-chat__item__message');
//                                 messageDivs.forEach(messageDiv => {
//                                     const nameElement = messageDiv.querySelector('.ui-chat__message__author');
//                                     const messageElement = messageDiv.querySelector('[data-tid="closed-caption-text"]');
                                    
//                                     const speakerName = nameElement ? nameElement.textContent.trim() : "Unknown";
//                                     const messageText = messageElement ? messageElement.textContent.trim() : "";

//                                     console.log(`Speaker: ${speakerName}, Message: ${messageText}`);

//                                     // Add the message to the transcript array
//                                     transcriptMessages.push({ speaker: speakerName, message: messageText });
//                                 });
//                             } else {
//                                 console.log("Node does not match expected chat message structure.");
//                             }
//                         });
//                     }
//                 });
//             };

//             const observer = new MutationObserver(callback);
//             observer.observe(virtualListContent, config);

//             console.log("MutationObserver initialized for Microsoft Teams transcript.");
//         } else {
//             console.log("No virtual list content found. Retrying in 500ms...");
//             setTimeout(setupObserver, 1000); // Retry after 500 milliseconds
//         }
//     } else {
//         console.log("Transcript wrapper not found. Waiting for content...");
//         // Optionally, you can set a timeout or retry mechanism here
//     }
// }


=======
        }, 500); // Check every 500 milliseconds
    });
}

>>>>>>> fca549e (Add MS Teams support)
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
<<<<<<< HEAD
                            if (node.nodeType === 1 && node.matches('div')) {
                                const messageDivs = node.querySelectorAll('.ui-chat__item__message');
                                messageDivs.forEach(messageDiv => {
                                    const nameElement = messageDiv.querySelector('.ui-chat__message__author');
                                    const messageElement = messageDiv.querySelector('[data-tid="closed-caption-text"]');
                                    
                                    const speakerName = nameElement ? nameElement.textContent.trim() : "Unknown";
                                    let lastRecordedMessage = ""; // Temporary variable to store the last message

                                    // Set up an observer for the message text element
                                    const messageObserver = new MutationObserver(() => {
                                        const updatedMessageText = messageElement.textContent.trim();
                                        console.log(`updatedMessageText: ${updatedMessageText}`);
                                        console.log(`lastRecordedMessage: ${lastRecordedMessage}`);
                                        if (updatedMessageText !== lastRecordedMessage) {
                                            console.log(`Updated Message: ${updatedMessageText}`);
                                            // Append each change to the transcript array
                                            transcriptMessages.push({ speaker: speakerName, message: updatedMessageText });
                                            lastRecordedMessage = updatedMessageText; // Update the temporary variable
                                        }
                                    });

                                    messageObserver.observe(messageElement, { childList: true, characterData: true, subtree: true });
                                });
=======
                            console.log("This is the node:", node);

                            if (node.nodeType === 1 && node.matches('div')) {
                                const ulElement = node.querySelector('ul[data-tid="closed-caption-chat-message"]');
                                if (ulElement) {
                                    const liElement = ulElement.querySelector('li.ui-chat__item');
                                    if (liElement) {
                                        const messageDiv = liElement.querySelector('.ui-chat__item__message');
                                        if (messageDiv) {
                                            // Wait for 0.5 seconds before processing the messageDiv
                                            setTimeout(() => {
                                                const nameElement = messageDiv.querySelector('.ui-chat__message__author');
                                                const messageElement = messageDiv.querySelector('[data-tid="closed-caption-text"]');
                                                
                                                const speakerName = nameElement ? nameElement.textContent.trim() : "Unknown";
                                                const messageText = messageElement ? messageElement.textContent.trim() : "";

                                                console.log(`Speaker: ${speakerName}, Message: ${messageText}`);
                                            }, 500);
                                        }
                                    }
                                }
>>>>>>> fca549e (Add MS Teams support)
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
<<<<<<< HEAD
            setTimeout(setupObserver, 1000); // Retry after 500 milliseconds
=======
            setTimeout(setupObserver, 500); // Retry after 500 milliseconds
>>>>>>> fca549e (Add MS Teams support)
        }
    } else {
        console.log("Transcript wrapper not found. Waiting for content...");
        // Optionally, you can set a timeout or retry mechanism here
    }
}


// Set an interval to check for meeting start every second
setInterval(checkTeamsMeetingStart, 1000);