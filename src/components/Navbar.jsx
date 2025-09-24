import { cn } from '@/lib/utils';
import { IconClock, IconSettings } from '@tabler/icons-react';

export const Navbar = ({ className = '' }) => {
  const handleSettingsClick = () => {
    window.open('https://app.amurex.ai/settings', '_blank');
  };

  const handleCloseClick = () => {
    window.close();
  };

  const handleLogoClick = () => {
    window.open('https://app.amurex.ai/', '_blank');
  };

  const handleTranscriptHistoryClick = () => {
    window.open('https://app.amurex.ai/meetings', '_blank');
  };

  return (
    <nav
      className={cn(
        'bg-nav fixed inset-x-0 top-0 z-50 flex min-w-full flex-col border-b border-neutral-600 py-2',
        className
      )}
    >
      {/* logo */}
      <div className='flex items-center justify-between px-4'>
        <div
          className='flex items-center justify-between gap-2 hover:cursor-pointer'
          onClick={handleLogoClick}
        >
          <img
            src='https://www.amurex.ai/_next/static/media/AmurexLogo.56901b87.png'
            alt='Amurex'
            className='h-10 w-10'
          />
          <h2 className='text-lg font-semibold text-[var(--color-neutral-300)]'>
            Amurex
          </h2>
        </div>
        <div className='flex items-center gap-3'>
          <button
            className='h-6 w-6 rounded-full p-0 text-neutral-300 hover:cursor-pointer hover:text-[#c76dcc]'
            onClick={handleTranscriptHistoryClick}
          >
            <IconClock size={20} />
          </button>
          <button
            className='h-6 w-6 rounded-full p-0 hover:cursor-pointer'
            onClick={handleSettingsClick}
          >
            <IconSettings
              stroke={2}
              className='h-6 w-6 text-neutral-300 hover:text-[#c76dcc]'
            />
          </button>
          <button
            className='h-6 w-6 rounded-full p-0 hover:cursor-pointer'
            onClick={handleCloseClick}
          >
            <svg
              width='24'
              height='24'
              viewBox='0 0 12 10'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              className='h-6 w-6 text-neutral-300 hover:text-[#c76dcc]'
            >
              <path
                d='M10 -0.00112915C11.0544 -0.00112915 11.9182 0.814748 11.9945 1.84961L12 1.99887V8.0013C12 9.0556 11.1842 9.91946 10.1493 9.99582L10 10.0013H2C0.945638 10.0013 0.0818349 9.18536 0.00548577 8.15055L0 8.0013V1.99887C0 0.944509 0.815877 0.0807057 1.85074 0.00435662L2 -0.00112915H10ZM10 0.998871H7.99847V9.0013H10C10.5128 9.0013 10.9355 8.61519 10.9933 8.11791L11 8.0013V1.99887C11 1.48603 10.614 1.06336 10.1166 1.0056L10 0.998871ZM6.99848 0.998871H2C1.48717 0.998871 1.06449 1.38491 1.00673 1.88225L1 1.99887V8.0013C1 8.51406 1.38604 8.9368 1.88338 8.99457L2 9.0013H6.99848V0.998871ZM4.2843 3.08859L4.35355 3.14645L5.85355 4.64645C6.02712 4.82002 6.04641 5.08944 5.91141 5.2843L5.85355 5.35355L4.35355 6.85355C4.15829 7.0488 3.84171 7.0488 3.64645 6.85355C3.47288 6.67999 3.45359 6.41056 3.58859 6.2157L3.64645 6.14645L4.29289 5.5H2.50185C2.2257 5.5 2.00185 5.27614 2.00185 5C2.00185 4.75454 2.17872 4.55039 2.41197 4.50805L2.50185 4.5H4.29289L3.64645 3.85355C3.45118 3.65829 3.45118 3.34171 3.64645 3.14645C3.82001 2.97288 4.08944 2.95359 4.2843 3.08859Z'
                fill='currentColor'
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};
