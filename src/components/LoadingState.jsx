/**
 * LoadingState Component - Displays loading states during summary generation
 * Provides visual feedback for different loading phases
 */

export const LoadingState = ({
  type = 'summary',
  message = null,
  className = '',
}) => {
  const getLoadingMessage = () => {
    if (message) return message;

    switch (type) {
      case 'summary':
        return 'Generating meeting notes...';
      case 'actionItems':
        return 'Generating action items...';
      case 'transcript':
        return 'Loading transcript...';
      case 'email':
        return 'Sending emails...';
      case 'download':
        return 'Preparing download...';
      default:
        return 'Loading...';
    }
  };

  const getLoadingIcon = () => {
    return (
      <svg
        className='h-5 w-5 animate-spin text-[var(--color-neutral-400)]'
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
      >
        <circle
          className='opacity-25'
          cx='12'
          cy='12'
          r='10'
          stroke='currentColor'
          strokeWidth='4'
        />
        <path
          className='opacity-75'
          fill='currentColor'
          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        />
      </svg>
    );
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 ${className}`}
    >
      <div className='mb-4 flex items-center space-x-3'>
        {getLoadingIcon()}
        <span className='text-sm font-medium text-[var(--color-neutral-400)]'>
          {getLoadingMessage()}
        </span>
      </div>

      {/* Loading dots animation */}
      <div className='flex space-x-1'>
        <div
          className='h-2 w-2 animate-bounce rounded-full bg-[var(--color-neutral-500)]'
          style={{ animationDelay: '0ms' }}
        />
        <div
          className='h-2 w-2 animate-bounce rounded-full bg-[var(--color-neutral-500)]'
          style={{ animationDelay: '150ms' }}
        />
        <div
          className='h-2 w-2 animate-bounce rounded-full bg-[var(--color-neutral-500)]'
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
};

/**
 * LoadingState for summary generation
 */
export const SummaryLoadingState = ({ className = '' }) => (
  <LoadingState type='summary' className={className} />
);

/**
 * LoadingState for action items generation
 */
export const ActionItemsLoadingState = ({ className = '' }) => (
  <LoadingState type='actionItems' className={className} />
);

/**
 * LoadingState for transcript loading
 */
export const TranscriptLoadingState = ({ className = '' }) => (
  <LoadingState type='transcript' className={className} />
);

/**
 * LoadingState for email sending
 */
export const EmailLoadingState = ({ className = '' }) => (
  <LoadingState type='email' className={className} />
);

/**
 * LoadingState for download preparation
 */
export const DownloadLoadingState = ({ className = '' }) => (
  <LoadingState type='download' className={className} />
);

export default LoadingState;
