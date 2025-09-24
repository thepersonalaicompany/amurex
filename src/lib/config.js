// amurex extension config

export const AMUREX_CONFIG = {
  BASE_URL_BACKEND: 'https://api.amurex.ai',
  PLATFORM: 'gmeet',
};

// selectors with fallbacks
export const SELECTOR_CONFIG = {
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
export const END_BUTTON_SELECTORS = [
  { selector: '.google-material-icons', text: 'call_end' },
  { selector: '.google-symbols', text: 'call_end' },
];

// captions icon selectors
export const CAPTIONS_ICON_SELECTORS = [
  { selector: '.material-icons-extended', text: 'closed_caption_off' },
  { selector: '.google-symbols', text: 'closed_caption_off' },
];

// time format
export const TIME_FORMAT = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
};

// constants
export const CONSTANTS = {
  SPEAKER_TIMEOUT: 5000,
  MAX_RETRIES: 10,
  RETRY_DELAY: 1000,
  USERNAME_CHECK_INTERVAL: 100,
};
