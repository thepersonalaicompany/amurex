import {
  formatEmailContent,
  formatMarkdownForClipboard,
} from '@/lib/summary-utils';
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconMail,
  IconShare,
} from '@tabler/icons-react';
import { useState } from 'react';

/**
 * SummaryActions Component - Provides action buttons for summary operations
 * Includes copy, download, email, and share functionality
 */

export const SummaryActions = ({
  summary = '',
  actionItems = '',
  onCopy = () => {},
  onDownload = () => {},
  onEmail = () => {},
  onShare = () => {},
  className = '',
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      const markdownText = formatMarkdownForClipboard(summary, actionItems);
      await navigator.clipboard.writeText(markdownText);

      setCopySuccess(true);
      onCopy({ summary, actionItems, format: 'markdown' });

      // Reset success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Handle download
  const handleDownload = async () => {
    try {
      const markdownText = formatMarkdownForClipboard(summary, actionItems);
      const blob = new Blob([markdownText], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      onDownload({ summary, actionItems, format: 'markdown' });

      // Reset success state after 2 seconds
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  // Handle email
  const handleEmail = () => {
    const emailContent = formatEmailContent(summary, actionItems);
    onEmail({ summary, actionItems, content: emailContent });
  };

  // Handle share
  const handleShare = async () => {
    try {
      const markdownText = formatMarkdownForClipboard(summary, actionItems);

      if (navigator.share) {
        await navigator.share({
          title: 'Meeting Notes',
          text: markdownText,
        });
        onShare({ summary, actionItems, format: 'markdown' });
      } else {
        // Fallback to copy
        await handleCopy();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to share:', error);
      }
    }
  };

  const actionButtons = [
    {
      id: 'copy',
      label: 'Copy',
      icon: copySuccess ? IconCheck : IconCopy,
      onClick: handleCopy,
      success: copySuccess,
      className:
        'text-white hover:text-white hover:bg-[var(--color-neutral-800)]',
    },
    {
      id: 'download',
      label: 'Download',
      icon: downloadSuccess ? IconCheck : IconDownload,
      onClick: handleDownload,
      success: downloadSuccess,
      className:
        'text-white hover:text-white hover:bg-[var(--color-neutral-800)]',
    },
    {
      id: 'email',
      label: 'Email',
      icon: IconMail,
      onClick: handleEmail,
      success: false,
      className:
        'text-white hover:text-white hover:bg-[var(--color-neutral-800)]',
    },
    {
      id: 'share',
      label: 'Share',
      icon: IconShare,
      onClick: handleShare,
      success: false,
      className:
        'text-white hover:text-white hover:bg-[var(--color-neutral-800)]',
    },
  ];

  return (
    <div className={`grid w-full grid-cols-2 gap-3 ${className}`}>
      {actionButtons.map((button) => {
        const IconComponent = button.icon;
        return (
          <button
            key={button.id}
            onClick={button.onClick}
            className={`flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-neutral-600)] bg-inherit px-4 py-3 transition-colors hover:cursor-pointer ${
              button.success
                ? 'border-[var(--color-green-500)]/50 bg-[var(--color-green-500)]/10 text-[var(--color-green-500)]'
                : button.className
            } hover:bg-[var(--color-neutral-800)]`}
            title={button.label}
          >
            <IconComponent
              size={18}
              stroke={1}
              className={button.success ? 'text-[var(--color-green-500)]' : ''}
            />
            <span className='text-sm text-neutral-300'>
              {button.success ? 'Done!' : button.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Compact version for smaller spaces
 */
export const SummaryActionsCompact = ({
  summary = '',
  actionItems = '',
  onCopy = () => {},
  onDownload = () => {},
  onEmail = () => {},
  onShare = () => {},
  className = '',
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      const markdownText = formatMarkdownForClipboard(summary, actionItems);
      await navigator.clipboard.writeText(markdownText);

      setCopySuccess(true);
      onCopy({ summary, actionItems, format: 'markdown' });

      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleCopy}
        className={`rounded-md p-2 transition-colors ${
          copySuccess
            ? 'bg-[var(--color-green-500)]/10 text-[var(--color-green-500)]'
            : 'text-white hover:bg-[var(--color-neutral-700)] hover:text-white'
        }`}
        title='Copy to clipboard'
      >
        {copySuccess ? (
          <IconCheck size={16} className='text-[var(--color-green-500)]' />
        ) : (
          <IconCopy size={16} />
        )}
      </button>

      <button
        onClick={() => onDownload({ summary, actionItems })}
        className='rounded-md p-2 text-white transition-colors hover:bg-[var(--color-neutral-700)] hover:text-white'
        title='Download'
      >
        <IconDownload size={16} />
      </button>

      <button
        onClick={() => onEmail({ summary, actionItems })}
        className='rounded-md p-2 text-white transition-colors hover:bg-[var(--color-neutral-700)] hover:text-white'
        title='Email'
      >
        <IconMail size={16} />
      </button>
    </div>
  );
};

export default SummaryActions;
