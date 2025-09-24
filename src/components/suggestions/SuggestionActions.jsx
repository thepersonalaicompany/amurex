// Suggestion actions component for handling suggestion actions
// Features: copy to clipboard, share functionality, rate suggestion, delete suggestion

import { useState } from 'react';
import { IconCopy, IconShare, IconThumbUp, IconThumbDown, IconTrash, IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const SuggestionActions = ({
  suggestion,
  onCopy,
  onShare,
  onRate,
  onDelete,
  className,
  variant = 'default' // 'default', 'compact', 'minimal'
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isRated, setIsRated] = useState(false);
  const [rating, setRating] = useState(null);

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

  const handleShare = () => {
    onShare?.(suggestion);
  };

  const handleRate = (rate) => {
    setRating(rate);
    setIsRated(true);
    onRate?.(suggestion.id, rate);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this suggestion?')) {
      onDelete?.(suggestion.id);
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <button
          onClick={handleCopy}
          className={cn(
            'rounded p-1 transition-colors duration-200',
            isCopied 
              ? 'bg-green-600 text-white' 
              : 'text-[var(--color-neutral-400)] hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)]'
          )}
          title={isCopied ? 'Copied!' : 'Copy to clipboard'}
        >
          {isCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
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
          {isCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </button>

        <button
          onClick={handleShare}
          className="rounded p-1.5 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)]"
          title="Share suggestion"
        >
          <IconShare size={16} />
        </button>

        <button
          onClick={handleDelete}
          className="rounded p-1.5 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-red-600 hover:text-white"
          title="Delete suggestion"
        >
          <IconTrash size={16} />
        </button>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
          isCopied 
            ? 'bg-green-600 text-white' 
            : 'bg-[var(--color-neutral-700)] text-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-600)]'
        )}
      >
        {isCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        {isCopied ? 'Copied!' : 'Copy'}
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-neutral-700)] px-3 py-2 text-sm font-medium text-[var(--color-neutral-300)] transition-colors duration-200 hover:bg-[var(--color-neutral-600)]"
      >
        <IconShare size={16} />
        Share
      </button>

      {/* Rating Buttons */}
      {!isRated && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleRate('positive')}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-700"
            title="Rate as helpful"
          >
            <IconThumbUp size={16} />
            Helpful
          </button>
          <button
            onClick={() => handleRate('negative')}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-700"
            title="Rate as not helpful"
          >
            <IconThumbDown size={16} />
            Not Helpful
          </button>
        </div>
      )}

      {/* Rating Feedback */}
      {isRated && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-400">
            {rating === 'positive' ? '✓ Marked as helpful' : '✓ Marked as not helpful'}
          </span>
        </div>
      )}

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-700"
      >
        <IconTrash size={16} />
        Delete
      </button>
    </div>
  );
};

// Quick action buttons for inline use
export const QuickSuggestionActions = ({ suggestion, onCopy, onShare, onDelete }) => {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onCopy?.(suggestion.content)}
        className="rounded p-1 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)]"
        title="Copy to clipboard"
      >
        <IconCopy size={14} />
      </button>
      
      <button
        onClick={() => onShare?.(suggestion)}
        className="rounded p-1 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)]"
        title="Share suggestion"
      >
        <IconShare size={14} />
      </button>
      
      <button
        onClick={() => onDelete?.(suggestion.id)}
        className="rounded p-1 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-red-600 hover:text-white"
        title="Delete suggestion"
      >
        <IconTrash size={14} />
      </button>
    </div>
  );
};

// Floating action bar for mobile
export const FloatingSuggestionActions = ({ suggestion, onCopy, onShare, onDelete, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--color-neutral-800)] border border-[var(--color-neutral-600)] p-2 shadow-lg">
      <button
        onClick={() => onCopy?.(suggestion.content)}
        className="rounded-full p-2 text-[var(--color-neutral-300)] transition-colors duration-200 hover:bg-[var(--color-neutral-700)]"
        title="Copy to clipboard"
      >
        <IconCopy size={18} />
      </button>
      
      <button
        onClick={() => onShare?.(suggestion)}
        className="rounded-full p-2 text-[var(--color-neutral-300)] transition-colors duration-200 hover:bg-[var(--color-neutral-700)]"
        title="Share suggestion"
      >
        <IconShare size={18} />
      </button>
      
      <button
        onClick={() => onDelete?.(suggestion.id)}
        className="rounded-full p-2 text-[var(--color-neutral-300)] transition-colors duration-200 hover:bg-red-600 hover:text-white"
        title="Delete suggestion"
      >
        <IconTrash size={18} />
      </button>
    </div>
  );
};

export default SuggestionActions;
