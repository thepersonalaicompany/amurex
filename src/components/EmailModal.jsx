import { extractParticipants, isValidEmail } from '@/lib/summary-utils';
import {
  IconCheck,
  IconMail,
  IconPlus,
  IconSend,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

/**
 * EmailModal Component - Handles email functionality for summary sharing
 * Extracts participants and allows email management
 */

export const EmailModal = ({
  isOpen = false,
  onClose = () => {},
  summary = '',
  actionItems = '',
  onSend = () => {},
  className = '',
}) => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [error, setError] = useState('');

  // Extract participants when modal opens
  useEffect(() => {
    if (isOpen && summary) {
      const participants = extractParticipants(summary);
      const participantEmails = participants
        .filter((participant) => isValidEmail(participant))
        .map((email) => ({ email, checked: false }));

      setEmails(participantEmails);
    }
  }, [isOpen, summary]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmails([]);
      setNewEmail('');
      setIsLoading(false);
      setSendSuccess(false);
      setError('');
    }
  }, [isOpen]);

  // Add new email
  const handleAddEmail = () => {
    const email = newEmail.trim();

    if (!email) {
      setError('Please enter an email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (emails.some((e) => e.email === email)) {
      setError('Email already exists');
      return;
    }

    setEmails([...emails, { email, checked: true }]);
    setNewEmail('');
    setError('');
  };

  // Remove email
  const handleRemoveEmail = (emailToRemove) => {
    setEmails(emails.filter((e) => e.email !== emailToRemove));
  };

  // Toggle email selection
  const handleToggleEmail = (emailToToggle) => {
    setEmails(
      emails.map((e) =>
        e.email === emailToToggle ? { ...e, checked: !e.checked } : e
      )
    );
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddEmail();
    }
  };

  // Send emails
  const handleSendEmails = async () => {
    const selectedEmails = emails.filter((e) => e.checked).map((e) => e.email);

    if (selectedEmails.length === 0) {
      setError('Please select at least one email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSend({
        emails: selectedEmails,
        summary,
        actionItems,
      });

      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      setError(error.message || 'Failed to send emails');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = emails.filter((e) => e.checked).length;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div
        className={`mx-4 w-full max-w-md rounded-lg border border-[var(--color-neutral-600)] bg-[var(--color-neutral-900)] p-6 ${className}`}
      >
        {/* Header */}
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <IconMail size={20} className='text-[var(--color-neutral-400)]' />
            <h3 className='text-lg font-semibold text-white'>Email Summary</h3>
          </div>
          <button
            onClick={onClose}
            className='rounded-md p-1 text-[var(--color-neutral-400)] transition-colors hover:bg-[var(--color-neutral-700)] hover:text-white'
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Email Input */}
        <div className='mb-4'>
          <div className='flex space-x-2'>
            <input
              type='email'
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='colleague@company.com'
              className='flex-1 rounded-md border border-[var(--color-neutral-600)] bg-[var(--color-neutral-800)] px-3 py-2 text-white placeholder-[var(--color-neutral-400)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-purple-500)] focus:outline-none'
            />
            <button
              onClick={handleAddEmail}
              className='rounded-md bg-[var(--color-purple-600)] px-3 py-2 text-white transition-colors hover:bg-[var(--color-purple-700)]'
            >
              <IconPlus size={16} />
            </button>
          </div>
          {error && (
            <p className='mt-1 text-sm text-[var(--color-red-400)]'>{error}</p>
          )}
        </div>

        {/* Email List */}
        <div className='mb-4 max-h-48 overflow-y-auto'>
          {emails.length === 0 ? (
            <p className='py-4 text-center text-sm text-[var(--color-neutral-400)]'>
              No participants found. Add email addresses above.
            </p>
          ) : (
            <div className='space-y-2'>
              {emails.map((emailData) => (
                <div
                  key={emailData.email}
                  className='flex items-center justify-between rounded-md bg-[var(--color-neutral-800)] p-2'
                >
                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={emailData.checked}
                      onChange={() => handleToggleEmail(emailData.email)}
                      className='h-4 w-4 rounded border-[var(--color-neutral-600)] bg-[var(--color-neutral-700)] text-[var(--color-purple-600)] focus:ring-[var(--color-purple-500)]'
                    />
                    <IconUser
                      size={16}
                      className='text-[var(--color-neutral-400)]'
                    />
                    <span className='text-sm text-white'>
                      {emailData.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveEmail(emailData.email)}
                    className='rounded p-1 text-[var(--color-neutral-400)] transition-colors hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-red-400)]'
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Button */}
        <div className='flex items-center justify-between'>
          <span className='text-sm text-[var(--color-neutral-400)]'>
            {selectedCount} email{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleSendEmails}
            disabled={isLoading || selectedCount === 0}
            className={`flex items-center space-x-2 rounded-md px-4 py-2 transition-colors ${
              sendSuccess
                ? 'bg-[var(--color-green-600)] text-white'
                : isLoading
                  ? 'cursor-not-allowed bg-[var(--color-neutral-600)] text-[var(--color-neutral-400)]'
                  : selectedCount === 0
                    ? 'cursor-not-allowed bg-[var(--color-neutral-600)] text-[var(--color-neutral-400)]'
                    : 'bg-[var(--color-purple-600)] text-white hover:bg-[var(--color-purple-700)]'
            }`}
          >
            {sendSuccess ? (
              <>
                <IconCheck size={16} />
                <span>Sent!</span>
              </>
            ) : isLoading ? (
              <>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-neutral-400)] border-t-transparent' />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <IconSend size={16} />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
