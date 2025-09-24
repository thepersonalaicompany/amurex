// amurex extension - google meet transcript extractor

console.log('Amurex Extension: Content script loaded');

// config
const AMUREX_CONFIG = {
  BASE_URL_BACKEND: 'https://api.amurex.ai',
  PLATFORM: 'gmeet',
};

// selectors with fallbacks
const SELECTOR_CONFIG = {
  transcriptContainer: [
    '[aria-label="Captions"]', // primary
    '[data-captions-container]', // fallback 1
    '.captions-container', // fallback 2
    '[role="log"]', // fallback 3
  ],
  speakerContainer: [
    '.nMcdL', // current
    '[data-speaker-container]', // fallback 1
    '.speaker-container', // fallback 2
    '[role="listitem"]', // fallback 3
  ],
  speakerName: [
    '.KcIKyf', // current
    '[data-speaker-name]', // fallback 1
    '.speaker-name', // fallback 2
    '[aria-label*="speaker"]', // fallback 3
  ],
  captions: [
    '.bh44bd', // current
    '[data-captions-text]', // fallback 1
    '.captions-text', // fallback 2
    '[aria-live="polite"]', // fallback 3
  ],
  meetingTitle: [
    '.u6vdEc', // current
    '[data-meeting-title]', // fallback 1
    '.meeting-title', // fallback 2
  ],
  videoPreview: [
    '.ZUpb4c', // current
    '[data-video-preview]', // fallback 1
    '.video-preview', // fallback 2
  ],
  username: [
    '[style="text-overflow: ellipsis; overflow: hidden;"]', // current
    '[data-username]', // fallback 1
    '.username', // fallback 2
  ],
};

// end button selectors
const END_BUTTON_SELECTORS = [
  { selector: '.google-material-icons', text: 'call_end' },
  { selector: '.google-symbols', text: 'call_end' },
];

// captions icon selectors
const CAPTIONS_ICON_SELECTORS = [
  { selector: '.material-icons-extended', text: 'closed_caption_off' },
  { selector: '.google-symbols', text: 'closed_caption_off' },
];

// time format
const TIME_FORMAT = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
};

// constants
const CONSTANTS = {
  SPEAKER_TIMEOUT: 5000,
  MAX_RETRIES: 10,
  RETRY_DELAY: 1000,
  USERNAME_CHECK_INTERVAL: 100,
};

// dom utilities
class DOMUtils {
  // find element with fallbacks
  static findElementWithFallbacks(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    console.warn(
      `No element found with any of the selectors: ${selectors.join(', ')}`
    );
    return null;
  }

  // find elements by selector and text
  static findElementsByText(selector, text) {
    const elements = document.querySelectorAll(selector);
    return Array.prototype.filter.call(elements, (element) => {
      return RegExp(text).test(element.textContent);
    });
  }

  // wait for element to appear
  static async waitForElement(selector, text = null) {
    if (text) {
      while (
        !Array.from(document.querySelectorAll(selector)).find(
          (element) => element.textContent === text
        )
      ) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    } else {
      while (!document.querySelector(selector)) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
    return document.querySelector(selector);
  }

  // extract speaker name from header div
  static extractSpeakerName(headerDiv) {
    if (!headerDiv) return '';

    const descendants = headerDiv.querySelectorAll('*');
    for (const el of descendants) {
      const text = (el.textContent || '').trim();
      if (text && text.toLowerCase() !== 'flex') {
        return text;
      }
    }
    return '';
  }

  // get transcript element
  static getTranscriptElement() {
    return this.findElementWithFallbacks(SELECTOR_CONFIG.transcriptContainer);
  }

  // get video preview element
  static getVideoPreviewElement() {
    return this.findElementWithFallbacks(SELECTOR_CONFIG.videoPreview);
  }

  // get username element
  static getUsernameElement() {
    return this.findElementWithFallbacks(SELECTOR_CONFIG.username);
  }

  // dim transcript element
  static dimTranscriptElement(element) {
    if (element) {
      element.style.position = 'absolute';
      if (element.firstChild) {
        element.firstChild.style.opacity = 0.2;
      }
    }
  }

  // style transcript element with small font and gray color
  static styleTranscriptElement(element) {
    if (element) {
      // Style main container
      element.style.position = 'absolute';
      element.style.fontSize = '10px';
      element.style.color = '#666';
      element.style.opacity = '0.6';

      // Style all text elements in the container
      this.styleAllTextElements(element);

      console.log('Transcript element styled with small font and gray color');
    }
  }

  // style all text elements in the transcript container
  static styleAllTextElements(container) {
    try {
      // Style all text nodes and elements recursively
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        null,
        false
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          // Style parent element of text nodes
          if (node.parentElement) {
            node.parentElement.style.fontSize = '10px';
            node.parentElement.style.color = '#666';
            node.parentElement.style.opacity = '0.6';
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Style element nodes
          node.style.fontSize = '10px';
          node.style.color = '#666';
          node.style.opacity = '0.6';
        }
      }
    } catch (error) {
      console.error('Error styling transcript text elements:', error);
    }
  }
}

// speaker management
class SpeakerManager {
  constructor(transcriptManager = null) {
    this.transcriptManager = transcriptManager; // Inject dependency
    this.speakerObservers = new Map();
    this.activeSpeakerBuffers = new Map();
    this.lastSavedContent = new Map(); // Track last saved content per speaker
  }

  // create speaker buffer
  createSpeakerBuffer(speakerName, captionsText) {
    const speakerId = Date.now();
    const buffer = {
      name: speakerName,
      startTime: new Date()
        .toLocaleString('default', TIME_FORMAT)
        .toUpperCase(),
      text: captionsText,
      lastSeenText: captionsText, // Track what we last saw from DOM
      timeoutId: null,
    };

    this.activeSpeakerBuffers.set(speakerId, buffer);
    return speakerId;
  }

  // update speaker buffer text
  updateSpeakerBuffer(speakerId, newText) {
    const buffer = this.activeSpeakerBuffers.get(speakerId);
    if (buffer && newText !== buffer.lastSeenText) {
      // Replace buffer text with the new cumulative text from Google Meet
      // The buffer will contain the full cumulative text until timeout
      buffer.text = newText;
      buffer.lastSeenText = newText;
      this.resetTimeout(speakerId);
    }
  }

  // extract only new content from cumulative text
  extractNewContent(currentText, newText) {
    if (!currentText) return newText;

    // Simple word-based diffing
    const currentWords = currentText.trim().split(/\s+/);
    const newWords = newText.trim().split(/\s+/);

    // Find where the new content starts by comparing word by word
    let newStartIndex = 0;
    for (let i = 0; i < Math.min(currentWords.length, newWords.length); i++) {
      if (currentWords[i] === newWords[i]) {
        newStartIndex = i + 1;
      } else {
        break;
      }
    }

    // Return only the new words
    return newWords.slice(newStartIndex).join(' ');
  }

  // reset timeout for speaker
  resetTimeout(speakerId) {
    const buffer = this.activeSpeakerBuffers.get(speakerId);
    if (buffer) {
      if (buffer.timeoutId) {
        clearTimeout(buffer.timeoutId);
      }
      buffer.timeoutId = setTimeout(() => {
        this.processSpeakerTranscript(speakerId);
      }, CONSTANTS.SPEAKER_TIMEOUT);
    }
  }

  // process speaker transcript
  processSpeakerTranscript(speakerId, isFinal = false) {
    const buffer = this.activeSpeakerBuffers.get(speakerId);
    if (!buffer || !buffer.text.trim()) return null;

    // Extract only new content since last save
    const lastSaved = this.lastSavedContent.get(speakerId) || '';
    const newContent = this.extractNewContent(lastSaved, buffer.text);

    if (!newContent) {
      return null; // No new content to save
    }

    const transcriptEntry = {
      personName: buffer.name,
      timeStamp: buffer.startTime,
      personTranscript: newContent, // Save only the new content
    };

    // Save the entry through transcript manager (FIX: This was missing!)
    if (this.transcriptManager) {
      this.transcriptManager.addTranscriptEntry(transcriptEntry);
    } else {
      console.warn(
        'TranscriptManager not available, entry not saved:',
        transcriptEntry
      );
    }

    // Mark current full text as saved to prevent duplicates
    this.lastSavedContent.set(speakerId, buffer.text);

    // reset buffer for next segment
    buffer.text = '';
    buffer.lastSeenText = '';
    buffer.startTime = new Date()
      .toLocaleString('default', TIME_FORMAT)
      .toUpperCase();

    // clear timeout
    if (buffer.timeoutId) {
      clearTimeout(buffer.timeoutId);
      buffer.timeoutId = null;
    }

    // cleanup if final
    if (isFinal) {
      this.cleanupSpeaker(speakerId);
    }

    return transcriptEntry;
  }

  // cleanup speaker
  cleanupSpeaker(speakerId) {
    const observer = this.speakerObservers.get(speakerId);
    if (observer) {
      observer.disconnect();
      this.speakerObservers.delete(speakerId);
    }
    this.activeSpeakerBuffers.delete(speakerId);
  }

  // cleanup all speakers
  cleanupAllSpeakers() {
    this.speakerObservers.forEach((observer, speakerId) => {
      this.processSpeakerTranscript(speakerId, true);
    });
  }

  // get speaker buffer
  getSpeakerBuffer(speakerId) {
    return this.activeSpeakerBuffers.get(speakerId);
  }

  // add speaker observer
  addSpeakerObserver(speakerId, observer) {
    this.speakerObservers.set(speakerId, observer);
  }
}

// transcript management
class TranscriptManager {
  constructor() {
    this.speakerManager = new SpeakerManager(this); // Pass self as dependency
    this.transcript = [];
    this.transcriptObserver = null;
    this.isErrorCaptured = false;
  }

  // setup transcript monitoring
  setupTranscriptMonitoring() {
    const transcriptElement = DOMUtils.getTranscriptElement();
    if (transcriptElement) {
      this.startTranscriptObserver(transcriptElement);
      return true;
    }
    return false;
  }

  // start transcript observer
  startTranscriptObserver(transcriptElement) {
    console.log('Transcript container found, setting up monitoring');

    // style transcript with small font and gray color
    DOMUtils.styleTranscriptElement(transcriptElement);

    // create observer
    this.transcriptObserver = new MutationObserver((mutationsList) => {
      this.handleTranscriptMutations(mutationsList);
    });

    // start observing
    this.transcriptObserver.observe(transcriptElement, {
      childList: true,
      subtree: true,
    });
  }

  // handle transcript mutations
  handleTranscriptMutations(mutationsList) {
    mutationsList.forEach((mutation) => {
      try {
        this.processAddedNodes(mutation.addedNodes);
        this.processRemovedNodes(mutation.removedNodes);
      } catch (error) {
        if (!this.isErrorCaptured) {
          console.error('Transcript observer error:', error);
          this.isErrorCaptured = true;
        }
      }
    });
  }

  // process added nodes
  processAddedNodes(addedNodes) {
    addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Style new elements as they're added
        DOMUtils.styleAllTextElements(node);

        const speakerContainer = this.findSpeakerContainer(node);
        if (speakerContainer) {
          this.handleNewSpeaker(node);
        }
      }
    });
  }

  // process removed nodes
  processRemovedNodes(removedNodes) {
    removedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.isSpeakerContainer(node)) {
          this.speakerManager.cleanupAllSpeakers();
        }
      }
    });
  }

  // find speaker container
  findSpeakerContainer(node) {
    for (const selector of SELECTOR_CONFIG.speakerContainer) {
      if (node.classList.contains(selector.slice(1))) {
        return node;
      }
    }
    return null;
  }

  // check if node is speaker container
  isSpeakerContainer(node) {
    return SELECTOR_CONFIG.speakerContainer.some((selector) =>
      node.classList.contains(selector.slice(1))
    );
  }

  // handle new speaker
  handleNewSpeaker(node) {
    const { speakerName, captionsDiv } = this.extractSpeakerData(node);

    if (!speakerName || !captionsDiv) {
      console.warn('Missing speaker name or captions div');
      return;
    }

    const captionsText = captionsDiv.textContent.trim();

    // create speaker buffer
    const speakerId = this.speakerManager.createSpeakerBuffer(
      speakerName,
      captionsText
    );

    // setup captions observer
    this.setupCaptionsObserver(speakerId, captionsDiv);

    // set initial timeout
    this.speakerManager.resetTimeout(speakerId);
  }

  // extract speaker data
  extractSpeakerData(node) {
    const headerDiv = node?.children?.[0] || null;
    let captionsDiv = node?.children?.[1] || null;

    // fallback to selectors
    if (!captionsDiv) {
      captionsDiv = DOMUtils.findElementWithFallbacks(SELECTOR_CONFIG.captions);
    }

    // extract speaker name
    let speakerName = DOMUtils.extractSpeakerName(headerDiv);

    // fallback to selector
    if (!speakerName) {
      const speakerNameElement = DOMUtils.findElementWithFallbacks(
        SELECTOR_CONFIG.speakerName
      );
      if (speakerNameElement) {
        speakerName = speakerNameElement.textContent.trim();
      }
    }

    return { speakerName, captionsDiv };
  }

  // setup captions observer
  setupCaptionsObserver(speakerId, captionsDiv) {
    const captionsObserver = new MutationObserver(() => {
      const buffer = this.speakerManager.getSpeakerBuffer(speakerId);
      if (buffer && captionsDiv) {
        const newText = captionsDiv.textContent.trim();
        this.speakerManager.updateSpeakerBuffer(speakerId, newText);
      }
    });

    captionsObserver.observe(captionsDiv, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    this.speakerManager.addSpeakerObserver(speakerId, captionsObserver);
  }

  // add transcript entry
  addTranscriptEntry(entry) {
    this.transcript.push(entry);
    this.saveTranscript();
  }

  // save transcript to storage
  saveTranscript() {
    chrome.storage.local.set({ transcript: this.transcript }, () => {
      console.log('Transcript saved to Chrome storage');
    });
  }

  // get transcript
  getTranscript() {
    return this.transcript;
  }

  // cleanup
  cleanup() {
    if (this.transcriptObserver) {
      this.transcriptObserver.disconnect();
    }
    this.speakerManager.cleanupAllSpeakers();
  }
}

// meeting management
class MeetingManager {
  constructor() {
    this.hasMeetingStarted = false;
    this.hasMeetingEnded = false;
    this.userName = 'You';
    this.meetingTitle = document.title;
    this.meetingStartTimeStamp = this.getFormattedTimestamp();
    this.transcriptManager = new TranscriptManager();
  }

  // get formatted timestamp
  getFormattedTimestamp() {
    return new Date()
      .toLocaleString('default', TIME_FORMAT)
      .replace(/[/:]/g, '-')
      .toUpperCase();
  }

  // setup meeting for ui type
  async setupMeeting(uiType) {
    console.log(`Setting up meeting routines for UI type: ${uiType}`);

    const { meetingEndIconData, captionsIconData } =
      this.getUISelectors(uiType);

    // wait for video preview
    const videoPreview = DOMUtils.getVideoPreviewElement();
    if (videoPreview) {
      console.log('Video preview found, meeting starting');
    }

    // wait for meeting end button
    try {
      await DOMUtils.waitForElement(
        meetingEndIconData.selector,
        meetingEndIconData.text
      );
      await this.handleMeetingStart(meetingEndIconData, captionsIconData);
    } catch (error) {
      console.error('Error setting up meeting:', error);
    }
  }

  // get ui selectors
  getUISelectors(uiType) {
    const meetingEndIconData = { selector: '', text: '' };
    const captionsIconData = { selector: '', text: '' };

    switch (uiType) {
      case 1:
        meetingEndIconData.selector = '.google-material-icons';
        meetingEndIconData.text = 'call_end';
        captionsIconData.selector = '.material-icons-extended';
        captionsIconData.text = 'closed_caption_off';
        break;
      case 2:
        meetingEndIconData.selector = '.google-symbols';
        meetingEndIconData.text = 'call_end';
        captionsIconData.selector = '.google-symbols';
        captionsIconData.text = 'closed_caption_off';
        break;
    }

    return { meetingEndIconData, captionsIconData };
  }

  // handle meeting start
  async handleMeetingStart(meetingEndIconData, captionsIconData) {
    console.log('Meeting end button found - meeting has started');
    this.hasMeetingStarted = true;

    // Generate new meeting ID and check if it's a new meeting
    const newMeetingId = this.generateMeetingId();
    const isNewMeeting = await this.isNewMeeting(newMeetingId);

    // Clear previous meeting data only if it's a new meeting
    try {
      if (isNewMeeting) {
        await this.clearPreviousMeetingData();
        console.log('New meeting detected, cleared previous data');
      }
      await this.saveMeetingStatus('ongoing');
    } catch (error) {
      console.error('Failed to clear previous meeting data:', error);
    }

    // save meeting metadata
    this.saveMeetingMetadata();

    // get username
    this.captureUsername();

    // enable captions
    this.enableCaptions(captionsIconData);

    // setup transcript monitoring
    await this.setupTranscriptMonitoring();

    // setup meeting end detection
    this.setupMeetingEndDetection(meetingEndIconData);
  }

  // generate unique meeting ID
  generateMeetingId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `meet_${timestamp}_${random}`;
  }

  // save meeting metadata
  saveMeetingMetadata() {
    const meetingId = this.generateMeetingId();
    chrome.storage.local.set({
      mId: meetingId,
      userName: this.userName,
      meetingStartTimeStamp: this.meetingStartTimeStamp,
      meetingTitle: this.meetingTitle,
      platform: 'gmeet',
    });
    console.log('Meeting metadata saved with ID:', meetingId);
  }

  // capture username
  captureUsername() {
    const usernameElement = DOMUtils.getUsernameElement();
    if (usernameElement) {
      const captureInterval = setInterval(() => {
        const name = usernameElement.textContent;
        if (name && name !== this.userName) {
          this.userName = name;
          chrome.storage.local.set({ userName: this.userName });
          clearInterval(captureInterval);
        }
      }, CONSTANTS.USERNAME_CHECK_INTERVAL);
    }
  }

  // enable captions
  enableCaptions(captionsIconData) {
    const captionsButton = DOMUtils.findElementsByText(
      captionsIconData.selector,
      captionsIconData.text
    )[0];

    if (captionsButton) {
      console.log('Enabling captions automatically');
      captionsButton.click();
    }
  }

  // setup transcript monitoring
  async setupTranscriptMonitoring() {
    let retryCount = 0;

    const waitForTranscript = () => {
      if (this.transcriptManager.setupTranscriptMonitoring()) {
        return;
      }

      if (retryCount < CONSTANTS.MAX_RETRIES) {
        retryCount++;
        console.log(
          `Transcript element not found, retrying... (${retryCount}/${CONSTANTS.MAX_RETRIES})`
        );
        setTimeout(waitForTranscript, CONSTANTS.RETRY_DELAY);
      } else {
        console.warn('Transcript element not found after maximum retries');
      }
    };

    waitForTranscript();
  }

  // setup meeting end detection
  setupMeetingEndDetection(meetingEndIconData) {
    const endButton = DOMUtils.findElementsByText(
      meetingEndIconData.selector,
      meetingEndIconData.text
    )[0];

    if (endButton) {
      endButton.parentElement.parentElement.addEventListener('click', () => {
        this.handleMeetingEnd();
      });
    }
  }

  // handle meeting end
  async handleMeetingEnd() {
    console.log('Meeting end button clicked');
    this.hasMeetingEnded = true;

    try {
      // process remaining transcripts
      this.transcriptManager.cleanup();

      // save final transcript
      const finalTranscript = this.transcriptManager.getTranscript();
      chrome.storage.local.set({ transcript: finalTranscript }, () => {
        console.log('Final transcript saved');
      });

      // Set meeting status to ended
      await this.saveMeetingStatus('ended');

      // log final transcript
      console.log('Final transcript:', finalTranscript);
    } catch (error) {
      console.error('Failed to handle meeting end:', error);
    }
  }

  // save meeting status to storage
  async saveMeetingStatus(status) {
    try {
      chrome.storage.local.set({ meetingStatus: status }, () => {
        console.log('Meeting status saved:', status);
      });
    } catch (error) {
      console.error('Failed to save meeting status:', error);
    }
  }

  // check if this is a new meeting
  async isNewMeeting(newMeetingId) {
    try {
      const result = await chrome.storage.local.get(['mId']);
      const currentMeetingId = result.mId;
      return !currentMeetingId || currentMeetingId !== newMeetingId;
    } catch (error) {
      console.error('Failed to check if new meeting:', error);
      return true; // Assume new meeting if check fails
    }
  }

  // clear previous meeting data (including transcript for new meetings)
  async clearPreviousMeetingData() {
    try {
      chrome.storage.local.remove(
        [
          'transcript',
          'summary',
          'mId',
          'meetingTitle',
          'meetingStartTimeStamp',
          'meetingStatus',
        ],
        () => {
          console.log('Previous meeting data cleared (including transcript)');
        }
      );
    } catch (error) {
      console.error('Failed to clear previous meeting data:', error);
    }
  }

  // get meeting state
  getMeetingState() {
    return {
      hasMeetingStarted: this.hasMeetingStarted,
      hasMeetingEnded: this.hasMeetingEnded,
      userName: this.userName,
      meetingTitle: this.meetingTitle,
      meetingStartTimeStamp: this.meetingStartTimeStamp,
    };
  }
}

// main amurex extension class
class AmurexExtension {
  constructor() {
    this.meetingManager = new MeetingManager();
    this.isInitialized = false;
  }

  // initialize extension
  async initialize() {
    if (this.isInitialized) return;

    // set platform
    chrome.storage.local.set({ platform: AMUREX_CONFIG.PLATFORM });

    // setup for both ui versions
    await Promise.all([
      this.meetingManager.setupMeeting(1), // pre-july 2024 ui
      this.meetingManager.setupMeeting(2), // post-july 2024 ui
    ]);

    this.isInitialized = true;
    console.log('Amurex Extension: Content script initialization complete');
  }

  // get extension state
  getState() {
    return {
      isInitialized: this.isInitialized,
      meetingState: this.meetingManager.getMeetingState(),
    };
  }

  // cleanup extension
  cleanup() {
    this.meetingManager.transcriptManager.cleanup();
  }
}

// initialize extension
const extension = new AmurexExtension();
extension.initialize().catch(console.error);

// cleanup on page unload
window.addEventListener('beforeunload', () => {
  extension.cleanup();
});
