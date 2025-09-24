import { IconClock, IconMicrophone } from '@tabler/icons-react';

/**
 * MeetingOngoingComponent - Shows when meeting is in progress
 * Similar design to AuthComponent but with black background
 */
export const MeetingOngoingComponent = () => {
  return (
    <div className='flex min-h-screen items-center justify-center bg-black p-4'>
      <div className='w-full max-w-lg'>
        {/* Logo and Branding */}
        <div className='mb-8 flex items-center justify-center'>
          <img
            src='/icon.png'
            alt='Amurex logo'
            className='h-10 w-10 rounded-full border-2 border-white'
          />
          <p className='pl-3 text-xl font-semibold text-white'>Amurex</p>
        </div>

        {/* Meeting Ongoing Card */}
        <div className='w-full rounded-xl border border-[var(--color-gray-800)] bg-[var(--color-card-dark)] p-10 shadow-2xl'>
          <div className='mb-8 text-center'>
            {/* Icon */}
            <div className='mb-4 flex justify-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-blue-500)]/20'>
                <IconMicrophone className='h-8 w-8 text-[var(--color-blue-400)]' />
              </div>
            </div>

            <h1
              className='mb-3 font-serif text-3xl text-white'
              style={{ fontFamily: 'var(--font-noto-serif)' }}
            >
              Meeting is Ongoing
            </h1>
            <p className='text-sm text-[var(--color-gray-400)]'>
              Transcript will be generated at the end of meeting
            </p>
          </div>

          <hr className='mb-8 border-[var(--color-gray-800)]' />

          {/* Status Information */}
          <div className='space-y-4'>
            <div className='flex items-center space-x-3 rounded-lg bg-[var(--color-gray-800)]/30 p-4'>
              <IconClock className='h-5 w-5 text-[var(--color-blue-400)]' />
              <div>
                <p className='text-sm font-medium text-white'>Live Recording</p>
                <p className='text-xs text-[var(--color-gray-400)]'>
                  Capturing transcript in real-time
                </p>
              </div>
            </div>

            <div className='flex items-center space-x-3 rounded-lg bg-[var(--color-gray-800)]/30 p-4'>
              <div className='h-2 w-2 animate-pulse rounded-full bg-[var(--color-green-500)]'></div>
              <div>
                <p className='text-sm font-medium text-white'>
                  Active Monitoring
                </p>
                <p className='text-xs text-[var(--color-gray-400)]'>
                  Extension is monitoring the meeting
                </p>
              </div>
            </div>
          </div>

          {/* Features Preview */}
          <div className='mt-8 space-y-3'>
            <div className='flex items-center space-x-3 text-sm text-[var(--color-gray-300)]'>
              <div className='h-2 w-2 rounded-full bg-[var(--color-green-500)]'></div>
              <span>Automatic transcript capture</span>
            </div>
            <div className='flex items-center space-x-3 text-sm text-[var(--color-gray-300)]'>
              <div className='h-2 w-2 rounded-full bg-[var(--color-blue-500)]'></div>
              <span>AI-powered meeting summaries</span>
            </div>
            <div className='flex items-center space-x-3 text-sm text-[var(--color-gray-300)]'>
              <div className='h-2 w-2 rounded-full bg-[var(--color-purple-500)]'></div>
              <span>Action items extraction</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='mt-6 text-center'>
          <p className='text-xs text-[var(--color-gray-500)]'>
            Your meeting summary will appear here once the meeting ends
          </p>
        </div>
      </div>
    </div>
  );
};

export default MeetingOngoingComponent;
