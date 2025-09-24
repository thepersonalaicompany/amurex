// transcript management

import { SELECTOR_CONFIG } from './config.js';
import { DOMUtils } from './dom-utils.js';
import { SpeakerManager } from './speaker-manager.js';

export class TranscriptManager {
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

    console.log('Transcript monitoring started');
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
    console.log('New speaker container detected');

    const { speakerName, captionsDiv } = this.extractSpeakerData(node);

    if (!speakerName || !captionsDiv) {
      console.warn('Missing speaker name or captions div');
      return;
    }

    const captionsText = captionsDiv.textContent.trim();
    console.log(`Speaker: ${speakerName}, Text: ${captionsText}`);

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
    console.log('New transcript entry:', entry);
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
