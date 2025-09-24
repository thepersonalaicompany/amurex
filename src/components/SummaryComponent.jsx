import {
  EmailModal,
  LoadingState,
  MeetingOngoingComponent,
  SummaryContent,
} from '@/components';
import { useSummaryStore } from '@/store';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

/**
 * SummaryComponent - Main component for summary functionality
 * Integrates all summary-related components and manages state
 */

export const SummaryComponent = () => {
  const {
    // State
    isLoading,
    summary,
    actionItems,
    error,
    isEditing,
    meetingStatus,

    // Actions
    initializeSummary,
    setError,
    clearError,
    setEditMode,
    updateSummary,
    updateActionItems,
    loadMeetingStatus,
  } = useSummaryStore();

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  // Initialize summary when component mounts
  useEffect(() => {
    const loadSummary = async () => {
      try {
        // Load meeting status first
        await loadMeetingStatus();

        // Initialize summary based on meeting status
        await initializeSummary();
      } catch (error) {
        console.error('Failed to initialize summary:', error);
      }
    };

    loadSummary();

    // Set up storage listener for meeting status changes
    const handleStorageChange = (changes) => {
      if (changes.meetingStatus) {
        const newStatus = changes.meetingStatus.newValue;
        if (newStatus === 'ended') {
          // Auto-refresh when meeting ends
          initializeSummary();
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [initializeSummary, loadMeetingStatus]);

  // Handle copy action
  const handleCopy = (data) => {
    console.log('Copy action:', data);
    // Analytics tracking could be added here
  };

  // Handle download action
  const handleDownload = (data) => {
    console.log('Download action:', data);
    // Analytics tracking could be added here
  };

  // Handle email action
  const handleEmail = (data) => {
    setEmailModalOpen(true);
    console.log('Email action:', data);
  };

  // Handle share action
  const handleShare = (data) => {
    console.log('Share action:', data);
    // Analytics tracking could be added here
  };

  // Handle email send
  const handleSendEmail = async (emailData) => {
    try {
      // This would integrate with the email service
      console.log('Sending email:', emailData);
      // For now, just simulate success
      return Promise.resolve();
    } catch (error) {
      throw new Error('Failed to send email');
    }
  };

  // Handle edit mode
  const handleEdit = (section, isEditing) => {
    setEditingSection(isEditing ? section : null);
    setEditMode(isEditing);
  };

  // Handle content update
  const handleUpdateSummary = (newContent) => {
    updateSummary(newContent);
  };

  const handleUpdateActionItems = (newContent) => {
    updateActionItems(newContent);
  };

  // Handle retry
  const handleRetry = async () => {
    clearError();
    try {
      await initializeSummary();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  // Show meeting ongoing state
  if (meetingStatus === 'ongoing') {
    return <MeetingOngoingComponent />;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-3'>
        <LoadingState type='summary' />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-3 p-6'>
        <div className='flex flex-col items-center space-y-4 text-center'>
          <IconAlertCircle size={48} className='text-[var(--color-red-500)]' />
          <div>
            <h3 className='mb-2 text-lg font-semibold text-white'>
              Error Loading Summary
            </h3>
            <p className='mb-4 text-[var(--color-neutral-400)]'>{error}</p>
            <div className='flex w-full items-center justify-center'>
              <button
                onClick={handleRetry}
                className='flex items-center space-x-2 rounded-md bg-[var(--color-purple-600)] px-4 py-2 text-white transition-colors hover:bg-[var(--color-purple-700)]'
              >
                <IconRefresh size={16} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!summary && !actionItems) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-3 p-6'>
        <div className='flex flex-col items-center space-y-4 text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neutral-800)]'>
            <span className='text-2xl'>📝</span>
          </div>
          <div>
            <h3 className='mb-2 text-lg font-semibold text-white'>
              No Summary Available
            </h3>
            <p className='mb-4 text-[var(--color-neutral-400)]'>
              No transcript data found to generate a summary.
            </p>
            <button
              onClick={handleRetry}
              className='flex items-center space-x-2 rounded-md bg-[var(--color-purple-600)] px-4 py-2 text-white transition-colors hover:bg-[var(--color-purple-700)]'
            >
              <IconRefresh size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full flex-col gap-3 overflow-hidden'>
      {/* Fixed Height Content Area - Both sections with equal heights */}
      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
        {/* Action Items Section - Equal height */}
        <div className='min-h-0 w-full flex-1 rounded-md border border-[var(--color-neutral-600)] bg-[var(--color-card-dark)]'>
          <SummaryContent
            content={actionItems}
            isEditing={editingSection === 'actionItems'}
            onEdit={(isEditing) => handleEdit('actionItems', isEditing)}
            onUpdate={handleUpdateActionItems}
            onCopy={handleCopy}
            title='Action Items'
          />
        </div>

        {/* Summary Section - Equal height */}
        <div className='min-h-0 w-full flex-1 rounded-md border border-[var(--color-neutral-600)] bg-[var(--color-card-dark)]'>
          <SummaryContent
            content={summary}
            isEditing={editingSection === 'summary'}
            onEdit={(isEditing) => handleEdit('summary', isEditing)}
            onUpdate={handleUpdateSummary}
            onCopy={handleCopy}
            title='Meeting Summary'
          />
        </div>
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        summary={summary}
        actionItems={actionItems}
        onSend={handleSendEmail}
      />
    </div>
  );
};
