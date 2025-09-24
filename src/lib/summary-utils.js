/**
 * Summary Utils - Utility functions for formatting and parsing
 * Handles markdown formatting, participant extraction, and content cleaning
 */

/**
 * Format markdown content for clipboard
 * Converts HTML content to clean markdown format
 * @param {string} summary - Summary content
 * @param {string} actionItems - Action items content
 * @returns {string} - Formatted markdown text
 */
export function formatMarkdownForClipboard(summary, actionItems) {
  try {
    // Clean and format action items
    const cleanActionItems = cleanActionItemsForMarkdown(actionItems);

    // Clean and format summary
    const cleanSummary = cleanSummaryForMarkdown(summary);

    // Combine into markdown format
    const markdownText = `## Action Items\n${cleanActionItems}\n\n## Meeting Summary\n${cleanSummary}`;

    return markdownText;
  } catch (error) {
    console.error('Failed to format markdown for clipboard:', error);
    return 'Error formatting content for clipboard';
  }
}

/**
 * Clean action items for markdown format
 * @param {string} actionItems - Raw action items content
 * @returns {string} - Cleaned action items
 */
function cleanActionItemsForMarkdown(actionItems) {
  if (!actionItems) return 'No action items available.';

  return actionItems
    .split('\n')
    .filter((item) => item.trim() && !item.startsWith('#'))
    .map((line) => {
      // Convert bullet points to checkbox format
      if (line.match(/^[*-]/)) {
        return line.replace(/^[*-]+\s*/, '- [ ] ').trim();
      }
      // Add checkbox format to lines without markers
      return `- [ ] ${line.trim()}`;
    })
    .join('\n');
}

/**
 * Clean summary for markdown format
 * @param {string} summary - Raw summary content
 * @returns {string} - Cleaned summary
 */
function cleanSummaryForMarkdown(summary) {
  if (!summary) return 'No meeting summary available.';

  return summary
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      // Clean up bullet points
      if (line.match(/^[*-]/)) {
        return line.replace(/^([*-]+)\s*/, '$1 ').trim();
      }
      return line.trim();
    })
    .join('\n');
}

/**
 * Extract participants from summary content
 * Looks for participant information in the summary text
 * @param {string} summaryContent - Summary content to parse
 * @returns {Array<string>} - Array of participant names/emails
 */
export function extractParticipants(summaryContent) {
  try {
    if (!summaryContent) return [];

    // Look for participants section
    const participantsMatch = summaryContent.match(
      /\*\*Participants:\*\*\n((?:- [^\n]+\n)+)/
    );

    if (participantsMatch) {
      return participantsMatch[1]
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim())
        .filter((participant) => participant.length > 0);
    }

    // Alternative patterns to look for participants
    const alternativePatterns = [
      /Attendees?:\s*([^\n]+)/gi,
      /Present:\s*([^\n]+)/gi,
      /Participants?:\s*([^\n]+)/gi,
    ];

    for (const pattern of alternativePatterns) {
      const match = summaryContent.match(pattern);
      if (match) {
        return match[1]
          .split(/[,;]/)
          .map((name) => name.trim())
          .filter((name) => name.length > 0);
      }
    }

    return [];
  } catch (error) {
    console.error('Failed to extract participants:', error);
    return [];
  }
}

/**
 * Format content for email
 * Converts content to email-friendly format
 * @param {string} summary - Summary content
 * @param {string} actionItems - Action items content
 * @returns {string} - Email-formatted content
 */
export function formatEmailContent(summary, actionItems) {
  try {
    const cleanSummary = cleanSummaryForEmail(summary);
    const cleanActionItems = cleanActionItemsForEmail(actionItems);

    return `Meeting Summary:\n\n${cleanSummary}\n\nAction Items:\n${cleanActionItems}`;
  } catch (error) {
    console.error('Failed to format email content:', error);
    return 'Error formatting content for email';
  }
}

/**
 * Clean summary for email format
 * @param {string} summary - Raw summary content
 * @returns {string} - Email-friendly summary
 */
function cleanSummaryForEmail(summary) {
  if (!summary) return 'No meeting summary available.';

  return summary
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)') // Convert links to text
    .split('\n')
    .filter((line) => line.trim())
    .join('\n');
}

/**
 * Clean action items for email format
 * @param {string} actionItems - Raw action items content
 * @returns {string} - Email-friendly action items
 */
function cleanActionItemsForEmail(actionItems) {
  if (!actionItems) return 'No action items available.';

  return actionItems
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      if (line.match(/^[*-]/)) {
        return line.replace(/^[*-]+\s*/, '• ').trim();
      }
      return `• ${line.trim()}`;
    })
    .join('\n');
}

/**
 * Parse markdown content to HTML
 * Converts markdown formatting to HTML for display
 * @param {string} content - Markdown content
 * @returns {string} - HTML content
 */
export function parseMarkdownToHTML(content) {
  try {
    if (!content) return '';

    return content
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        // Handle headers
        if (line.startsWith('### ')) {
          return `<h4>${line.substring(4)}</h4>`;
        } else if (line.startsWith('## ')) {
          return `<h3>${line.substring(3)}</h3>`;
        } else if (line.startsWith('# ')) {
          return `<h2>${line.substring(2)}</h2>`;
        }
        // Handle list items
        else if (
          line.startsWith('- ') ||
          line.startsWith('* ') ||
          line.startsWith(' -')
        ) {
          return `<li>${line.substring(2)}</li>`;
        }
        // Handle other content
        else {
          return line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
        }
      })
      .join('\n')
      .replace(
        /(<li>.*?<\/li>)\n?(<li>.*?<\/li>)+/g,
        (list) => `<ul>${list}</ul>`
      )
      .replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Failed to parse markdown to HTML:', error);
    return content;
  }
}

/**
 * Clean content for display
 * Removes unwanted formatting and cleans up content
 * @param {string} content - Raw content
 * @returns {string} - Cleaned content
 */
export function cleanContentForDisplay(content) {
  try {
    if (!content) return '';

    return content
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/\s{2,}/g, ' '); // Remove excessive spaces
  } catch (error) {
    console.error('Failed to clean content for display:', error);
    return content;
  }
}

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} - Whether email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format timestamp for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted timestamp
 */
export function formatTimestamp(timestamp) {
  try {
    if (!timestamp) return 'Unknown time';

    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Failed to format timestamp:', error);
    return 'Invalid time';
  }
}

/**
 * Get content length for analytics
 * @param {string} content - Content to measure
 * @returns {number} - Character count
 */
export function getContentLength(content) {
  try {
    return content ? content.length : 0;
  } catch (error) {
    console.error('Failed to get content length:', error);
    return 0;
  }
}

/**
 * Truncate content for display
 * @param {string} content - Content to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated content
 */
export function truncateContent(content, maxLength = 100) {
  try {
    if (!content) return '';

    if (content.length <= maxLength) return content;

    return content.substring(0, maxLength).trim() + '...';
  } catch (error) {
    console.error('Failed to truncate content:', error);
    return content;
  }
}
