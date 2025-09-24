// main amurex extension class

import { AMUREX_CONFIG } from './config.js';
import { MeetingManager } from './meeting-manager.js';

export class AmurexExtension {
  constructor() {
    this.meetingManager = new MeetingManager();
    this.isInitialized = false;
  }

  // initialize extension
  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing Amurex Extension for Google Meet');

    // set platform
    chrome.storage.local.set({ platform: AMUREX_CONFIG.PLATFORM });
    console.log('Google Meet platform local variable has been set');

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
