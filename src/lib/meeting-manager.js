// meeting management

import { CONSTANTS, END_BUTTON_SELECTORS, TIME_FORMAT } from './config.js';
import { DOMUtils } from './dom-utils.js';
import { TranscriptManager } from './transcript-manager.js';

export class MeetingManager {
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

  // check if meeting end button is present
  isMeetingEndButtonPresent() {
    try {
      return END_BUTTON_SELECTORS.some(
        ({ selector, text }) =>
          DOMUtils.findElementsByText(selector, text).length > 0
      );
    } catch (e) {
      return false;
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
  },

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
  },

  // clear previous meeting data (including transcript for new meetings)
  async clearPreviousMeetingData() {
    try {
      chrome.storage.local.remove([
        'transcript',
        'summary',
        'mId',
        'meetingTitle',
        'meetingStartTimeStamp',
        'meetingStatus',
      ], () => {
        console.log('Previous meeting data cleared (including transcript)');
      });
    } catch (error) {
      console.error('Failed to clear previous meeting data:', error);
    }
  },

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
