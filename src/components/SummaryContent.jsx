import { parseMarkdownToHTML } from '@/lib/summary-utils';
import { IconCheck, IconCopy, IconEdit } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

/**
 * SummaryContent Component - Displays and allows editing of summary content
 * Supports inline editing, copy functionality, and markdown rendering
 */

export const SummaryContent = ({
  content = '',
  isEditing = false,
  onEdit = () => {},
  onUpdate = () => {},
  onCopy = () => {},
  className = '',
  title = 'Summary',
}) => {
  const [localContent, setLocalContent] = useState(content);
  const [isLocalEditing, setIsLocalEditing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const contentRef = useRef(null);
  const editButtonRef = useRef(null);

  // Update local content when prop changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Handle focus when entering edit mode from external state
  useEffect(() => {
    if (isEditing && contentRef.current) {
      setTimeout(() => {
        contentRef.current.focus();
        // Position cursor at the end of the content
        const length = contentRef.current.value.length;
        contentRef.current.setSelectionRange(length, length);
      }, 0);
    }
  }, [isEditing]);

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isLocalEditing) {
      // Save changes
      onUpdate(localContent);
      setIsLocalEditing(false);
      onEdit(false); // Notify parent that editing has stopped
    } else {
      // Enter edit mode
      setIsLocalEditing(true);
      onEdit(true);
      // Focus the textarea after state update
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.focus();
          // Position cursor at the end of the content
          const length = contentRef.current.value.length;
          contentRef.current.setSelectionRange(length, length);
        }
      }, 0);
    }
  };

  // Handle content change
  const handleContentChange = (e) => {
    setLocalContent(e.target.value);
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent);
      setCopySuccess(true);
      onCopy(localContent);

      // Reset success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Handle key events
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      // Cancel editing
      setLocalContent(content);
      setIsLocalEditing(false);
      onEdit(false);
    } else if (e.key === 'Enter' && e.ctrlKey) {
      // Save with Ctrl+Enter
      handleEditToggle();
    }
  };

  // Handle blur (save when clicking outside)
  const handleBlur = (e) => {
    if (isLocalEditing) {
      // Use setTimeout to check if the edit button was clicked after blur
      setTimeout(() => {
        // If the edit button is focused, don't save (user clicked the button)
        if (document.activeElement === editButtonRef.current) {
          return;
        }
        handleEditToggle();
      }, 0);
    }
  };

  const isCurrentlyEditing = isLocalEditing || isEditing;
  const displayContent = localContent || 'No summary available.';

  return (
    <div className={`flex h-full flex-col rounded-md bg-black`}>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-[var(--color-neutral-600)] p-3'>
        <h3 className='text-lg font-semibold text-neutral-300'>{title}</h3>
        <div className='flex items-center space-x-2'>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className='rounded-md p-2 text-neutral-300 transition-colors hover:cursor-pointer hover:bg-[#c76dcc]/10 hover:text-[#c76dcc]'
            title='Copy to clipboard'
          >
            {copySuccess ? (
              <IconCheck size={20} className='text-[var(--color-green-500)]' />
            ) : (
              <IconCopy size={20} />
            )}
          </button>

          {/* Edit button */}
          <button
            ref={editButtonRef}
            onClick={handleEditToggle}
            className={`rounded-md p-2 transition-colors hover:cursor-pointer ${
              isCurrentlyEditing
                ? 'bg-[var(--color-purple-500)]/10 text-purple-500'
                : 'text-neutral-300 hover:bg-[#c76dcc]/10 hover:text-[#c76dcc]'
            }`}
            title={isCurrentlyEditing ? 'Save changes' : 'Edit content'}
          >
            <IconEdit size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-1'>
        {isCurrentlyEditing ? (
          // Edit mode - Use textarea
          <textarea
            ref={contentRef}
            value={localContent}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className='h-full w-full resize-none rounded-md bg-black p-4 text-neutral-300 outline-2 outline-purple-500'
            style={{
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
            }}
            placeholder='Enter your content here...'
            autoFocus
          />
        ) : (
          // Display mode - Use HTML rendering
          <div
            className='prose prose-invert prose-sm max-w-none p-4 text-neutral-300'
            style={{
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
            dangerouslySetInnerHTML={{
              __html: parseMarkdownToHTML(displayContent),
            }}
          />
        )}
      </div>
    </div>
  );
};

/**
 * SummaryContent for meeting summary
 */
export const MeetingSummaryContent = ({
  content,
  isEditing,
  onEdit,
  onUpdate,
  onCopy,
  className = '',
}) => (
  <SummaryContent
    content={content}
    isEditing={isEditing}
    onEdit={onEdit}
    onUpdate={onUpdate}
    onCopy={onCopy}
    title='Meeting Summary'
    className={className}
  />
);

/**
 * SummaryContent for action items
 */
export const ActionItemsContent = ({
  content,
  isEditing,
  onEdit,
  onUpdate,
  onCopy,
  className = '',
}) => (
  <SummaryContent
    content={content}
    isEditing={isEditing}
    onEdit={onEdit}
    onUpdate={onUpdate}
    onCopy={onCopy}
    title='Action Items'
    className={className}
  />
);

export default SummaryContent;
