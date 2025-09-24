// Suggestion card component for displaying individual suggestions
// Features: suggestion content display, copy to clipboard, timestamp, action buttons

import { cn } from '@/lib/utils';
import {
  IconCopy,
  IconShare,
  IconThumbDown,
  IconThumbUp,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';

export const SuggestionCard = ({
  suggestion,
  onCopy,
  onShare,
  onRate,
  onDelete,
  className,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isRated, setIsRated] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestion.content);
      setIsCopied(true);
      onCopy?.(suggestion.content);

      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleRate = (rating) => {
    setIsRated(true);
    onRate?.(suggestion.id, rating);
  };

  const handleShare = () => {
    onShare?.(suggestion);
  };

  const handleDelete = () => {
    onDelete?.(suggestion.id);
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return 'Unknown time';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'suggestion_response':
        return 'text-green-400';
      case 'exceeded_response':
        return 'text-yellow-400';
      case 'no_file_uploaded':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'suggestion_response':
        return 'Suggestion';
      case 'exceeded_response':
        return 'Rate Limited';
      case 'no_file_uploaded':
        return 'No Files';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--color-neutral-600)] bg-[var(--color-neutral-800)] p-4 transition-all duration-200 hover:border-[var(--color-neutral-500)]',
        className
      )}
    >
      {/* Header */}
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span
            className={cn(
              'rounded-full px-2 py-1 text-xs font-medium',
              getTypeColor(suggestion.type)
            )}
          >
            {getTypeLabel(suggestion.type)}
          </span>
          <span className='text-xs text-[var(--color-neutral-400)]'>
            {formatTimestamp(suggestion.timestamp)}
          </span>
        </div>

        <div className='flex items-center gap-1'>
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={cn(
              'rounded p-1.5 transition-colors duration-200',
              isCopied
                ? 'bg-green-600 text-white'
                : 'text-[var(--color-neutral-400)] hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)]'
            )}
            title={isCopied ? 'Copied!' : 'Copy to clipboard'}
          >
            <IconCopy size={16} />
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className='rounded p-1.5 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)]'
            title='Share suggestion'
          >
            <IconShare size={16} />
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className='rounded p-1.5 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-red-600 hover:text-white'
            title='Delete suggestion'
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className='mb-3'>
        <p className='leading-relaxed text-[var(--color-neutral-200)]'>
          {suggestion.content}
        </p>
      </div>

      {/* Footer */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {/* Rating Buttons */}
          {!isRated && (
            <>
              <button
                onClick={() => handleRate('positive')}
                className='rounded p-1 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-green-600 hover:text-white'
                title='Rate as helpful'
              >
                <IconThumbUp size={14} />
              </button>
              <button
                onClick={() => handleRate('negative')}
                className='rounded p-1 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-red-600 hover:text-white'
                title='Rate as not helpful'
              >
                <IconThumbDown size={14} />
              </button>
            </>
          )}

          {isRated && (
            <span className='text-xs text-green-400'>
              Thanks for your feedback!
            </span>
          )}
        </div>

        {/* File Status */}
        {suggestion.filesFound && (
          <span className='text-xs text-green-400'>
            ✓ Context files available
          </span>
        )}
      </div>

      {/* Last Question (if available) */}
      {suggestion.lastQuestion && (
        <div className='mt-3 rounded bg-[var(--color-neutral-700)] p-2'>
          <p className='text-xs text-[var(--color-neutral-400)]'>
            <strong>Last question:</strong> {suggestion.lastQuestion}
          </p>
        </div>
      )}
    </div>
  );
};

export default SuggestionCard;
