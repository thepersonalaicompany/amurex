<div align="center">
  <img src="https://github.com/user-attachments/assets/d06d31c3-ff8c-4f57-9c85-c33afc9d9ef9" alt="Amurex Logo" width="800" />

  <h2>Your AI Copilot for Work + Life</h2>

  <p>
    <a href="https://github.com/thepersonalaicompany/amurex/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License" />
    </a>
    <a href="https://chrome.google.com/webstore/detail/amurex/dckidmhhpnfhachdpobgfbjnhfnmddmc">
      <img src="https://img.shields.io/chrome-web-store/v/dckidmhhpnfhachdpobgfbjnhfnmddmc.svg" alt="Chrome Web Store" />
    </a>
    <a href="https://twitter.com/thepersonalaico">
      <img src="https://img.shields.io/twitter/follow/thepersonalaico?style=social" alt="Twitter Follow" />
    </a>
    <a href="https://discord.gg/PTUSVUJRM3">
      <img alt="Discord" src="https://img.shields.io/discord/1306591395804348476">
    </a>
  </p>
</div>

## About Amurex

This repo/chrome extension is the Meeting Copilot for Amurex—the fully open-source invisible companion for work and life. Built to seamlessly integrate with your workflow, it leverages cutting-edge AI to handle your meetings, capture important details, summarize discussions, and manage follow-up actions.

As part of the broader Amurex ecosystem, this Meeting Copilot helps you streamline your productivity by automating busywork, enabling you to focus on what truly matters.

Transparent, secure, and privacy-focused—Amurex is your trusted companion for professional productivity.

## Supported meeting platforms
- Google Meet
- MS Teams
- [ ] More coming soon!

## Features

- **Real-time Suggestions During Meetings**  
  <p>
  Get intelligent suggestions and prompts while your meeting is happening.
  </p>

  <img src="https://github.com/user-attachments/assets/7e610998-71f9-454d-bff6-e566f58e447a" alt="Real-time meeting suggestions" width="600" />
  <br></br>

- **Smart Summaries & Key Takeaways**  
  <p>
  Automatically generate comprehensive meeting summaries and action items.
  </p>

  <img src="https://github.com/user-attachments/assets/43349cc5-cb35-43c8-a6ca-3a259bd1afbc" alt="Meeting summaries and takeaways" width="600" />
  <br></br>


- **Late Join Recap**  
  <p>
  Quickly catch up on what you missed when joining late.
  </p>

  <img src="https://github.com/user-attachments/assets/3f793f6d-5e83-4667-90a5-41bb52e8008b" alt="Late join meeting recap" width="600" />

  <br></br>

- **Full Meeting Transcripts**  
  <p>
  Get accurate, real-time transcriptions of your entire meeting.
  </p>

  <img src="https://github.com/user-attachments/assets/8300dfa3-12cb-418a-9242-526b19e05134" alt="Meeting transcriptions" width="600" />

  <br></br>

- **Built in Follow up Emails**  
  <p>
  Generate and send professional follow-up emails with one click.
  </p>

  <img src="https://github.com/user-attachments/assets/72c92702-f249-4525-9d3b-dbf536935a14" alt="Follow up emails" width="600" />


## Quick Start

0. Star this repository :star:
1. Install Amurex from the [Chrome Web Store](https://chromewebstore.google.com/detail/amurex/dckidmhhpnfhachdpobgfbjnhfnmddmc)
2. Complete the 30 second onboarding process
3. Become a 10x human with your personal copilot

**Note:** Sometimes the chrome extension store might contain an older version of the extension. For the latest version, please use the self hosting option.

## Self Hosting
1. Clone the repository
2. Configure the extension:
   - Create `config.js` in the extension root:
   ```javascript
   const AMUREX_CONFIG = {
     BASE_URL_BACKEND: "http://localhost:8080",  // Your backend server URL
     BASE_URL_WEB: "http://localhost:3000",      // Your web server URL
     ANALYTICS_ENABLED: true                     // Set to false to disable tracking
   };
   window.AMUREX_CONFIG = AMUREX_CONFIG;
   ```
   - Navigate to `background.js` in the extension root. This file is used by the service worker to communicate with the backend.
   ```javascript
   const AMUREX_CONFIG = {
     BASE_URL_BACKEND: "http://localhost:8080",  // Your backend server URL
     BASE_URL_WEB: "http://localhost:3000",      // Your web server URL
     ANALYTICS_ENABLED: true                     // Set to false to disable tracking
   };
   ```
3. Navigate to the [`backend`](https://github.com/thepersonalaicompany/amurex-backend) repository
4. Follow the backend setup instructions in its `README.md`
5. Navigate to the [`web`](https://github.com/thepersonalaicompany/amurex-web) repository
6. Follow the web setup instructions in its `README.md`
7. Load the unpacked extension in Chrome

## Browser Support
- Google Chrome/Chromium
- Firefox (109.0 or later)

## Installation

### Chrome
1. Install Amurex from the [Chrome Web Store](https://chromewebstore.google.com/detail/amurex/dckidmhhpnfhachdpobgfbjnhfnmddmc)

### Firefox
1. Download the latest Firefox release from [Releases](https://github.com/thepersonalaicompany/amurex/releases)
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" and then "Load Temporary Add-on"
4. Select the `manifest.json` from the downloaded Firefox extension folder

## Using the development version

1. Download the latest zip
2. Navigate to `chrome://extensions`
3. Enable Developer Mode
4. Load the unpacked extension


## Get Involved

We welcome contributions from the community! Here's how you can help:

1. 🐛 **Report Bugs**: Open an issue if you find any bugs or unexpected behavior
2. 💡 **Suggest Features**: Have an idea? Share it in the issues section
3. 🛠️ **Submit PRs**: Want to fix a bug or add a feature? PRs are welcome
4. ⭐ **Spread the Word**: Star the repo and share it with others

Join our [discord](https://discord.gg/PTUSVUJRM3) to chat with the team and other users.

<div align="center">
  Made with ❤️ for better <del>meetings</del> life
</div>
