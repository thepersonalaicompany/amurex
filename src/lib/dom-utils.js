// dom utilities

import { SELECTOR_CONFIG } from './config.js';

export class DOMUtils {
  // find element with fallbacks
  static findElementWithFallbacks(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`Found element with selector: ${selector}`);
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
