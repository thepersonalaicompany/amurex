import { cn } from '@/lib/utils';
import { useUIStore } from '@/store';
import {
  IconAlignBoxLeftMiddle,
  IconAlignBoxLeftMiddleFilled,
} from '@tabler/icons-react';
import { MessageSquare } from 'lucide-react';

export const Footer = (className = '') => {
  return (
    <footer
      className={cn(
        'bg-footer fixed inset-x-0 bottom-0 z-50 flex h-[70px] min-w-full items-center justify-center border-t border-neutral-600 text-[var(--color-neutral-400)]',
        className
      )}
    >
      <div className='mx-2 flex items-center justify-between gap-4 overflow-hidden py-1.5'>
        <FooterButtons />
      </div>
    </footer>
  );
};

const FooterButtons = () => {
  const { currentTab, setCurrentTab } = useUIStore();
  const footerButtons = [
    {
      title: 'Summary',
      tabId: 'Summary',
      svg: SummaryIcon,
    },
    // {
    //   title: 'Suggestions',
    //   tabId: 'Suggestions',
    //   svg: SuggestionsIcon,
    // },
    {
      title: 'Transcript',
      tabId: 'Transcript',
      svg: TranscriptsIcon,
    },
  ];

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
  };

  return (
    <>
      {footerButtons.map((btn, idx) => (
        <button
          key={idx}
          onClick={() => handleTabChange(btn.tabId)}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-3 py-2 transition-colors hover:cursor-pointer',
            currentTab === btn.tabId
              ? 'bg-[var(--color-brand-primary-10)] text-[var(--color-brand-primary)]'
              : 'hover:bg-[var(--color-brand-primary-10)] hover:text-[var(--color-brand-primary)]'
          )}
        >
          <div className='flex items-center justify-center'>{btn.svg()}</div>
          <span className='text-xs'>{btn.title}</span>
        </button>
      ))}
    </>
  );
};

const SummaryIcon = () => {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M4 6h16M4 12h16M4 18h7' strokeWidth='2' strokeLinecap='round' />
    </svg>
  );
};

const SuggestionsIcon = () => {
  const { currentTab } = useUIStore();

  // Use filled icon when suggestions section is open, outline when closed
  return currentTab === 'Suggestions' ? (
    <MessageSquare className='fill-current' />
  ) : (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-message-square-icon lucide-message-square'
    >
      <path d='M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z' />
    </svg>
  );
};

const TranscriptsIcon = () => {
  const { currentTab } = useUIStore();

  // Use filled icon when transcript section is open, outline when closed
  return currentTab === 'Transcript' ? (
    <IconAlignBoxLeftMiddleFilled stroke={1} />
  ) : (
    <IconAlignBoxLeftMiddle stroke={1} />
  );
};
