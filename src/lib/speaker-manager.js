// speaker management

import { CONSTANTS, TIME_FORMAT } from './config.js';

export class SpeakerManager {
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
      console.log('No new content to save for speaker:', buffer.name);
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
