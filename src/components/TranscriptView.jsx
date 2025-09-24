import { IconCopy, IconDownload, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Tooltip } from './Tooltip';

export const TranscriptView = () => {
  const [transcript, setTranscript] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // load transcript from storage
  useEffect(() => {
    const loadTranscript = () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['transcript'], (result) => {
          if (result.transcript) {
            setTranscript(result.transcript);
            setLastUpdated(new Date());
            console.log('Transcript loaded:', result.transcript);
          }
          setIsLoading(false);
        });
      } else {
        // fallback for dev
        console.log('Chrome storage not available, using mock data');
        setTranscript([
          {
            personName: 'John Doe',
            timeStamp: '2024-01-15 14:30:25',
            personTranscript:
              'This is a sample transcript entry for testing purposes.',
          },
        ]);
        setIsLoading(false);
      }
    };

    loadTranscript();

    // setup listener for updates
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const handleStorageChange = (changes) => {
        if (changes.transcript) {
          setTranscript(changes.transcript.newValue || []);
          setLastUpdated(new Date());
          console.log('Transcript updated:', changes.transcript.newValue);
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);

      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['transcript'], (result) => {
        if (result.transcript) {
          setTranscript(result.transcript);
          setLastUpdated(new Date());
          console.log('Transcript refreshed:', result.transcript);
        } else {
          console.log('No transcript data found in storage');
          setTranscript([]);
        }
        setIsLoading(false);
      });
    } else {
      // fallback for dev environment
      console.log('Chrome storage not available, refreshing mock data');
      setTranscript([
        {
          personName: 'John Doe',
          timeStamp: '2024-01-15 14:30:25',
          personTranscript:
            'This is a sample transcript entry for testing purposes.',
        },
      ]);
      setLastUpdated(new Date());
      setIsLoading(false);
    }
  };

  const handleCopyTranscript = () => {
    if (transcript.length === 0) {
      console.log('No transcript to copy');
      return;
    }

    const transcriptText = transcript
      .map(
        (entry) =>
          `${entry.personName} (${entry.timeStamp})\n${entry.personTranscript}\n`
      )
      .join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(transcriptText)
        .then(() => {
          console.log('Transcript copied to clipboard');
        })
        .catch((error) => {
          console.error('Failed to copy transcript:', error);
          // Fallback for older browsers
          fallbackCopyToClipboard(transcriptText);
        });
    } else {
      // Fallback for browsers that don't support clipboard API
      fallbackCopyToClipboard(transcriptText);
    }
  };

  // Fallback copy function for older browsers
  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      console.log('Transcript copied to clipboard (fallback method)');
    } catch (error) {
      console.error('Failed to copy transcript (fallback method):', error);
    }

    document.body.removeChild(textArea);
  };

  const handleDownloadTranscript = () => {
    if (transcript.length === 0) {
      console.log('No transcript to download');
      return;
    }

    const transcriptText = transcript
      .map(
        (entry) =>
          `${entry.personName} (${entry.timeStamp})\n${entry.personTranscript}\n`
      )
      .join('\n');

    // Create a more detailed filename with timestamp
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `amurex-transcript-${dateStr}-${timeStr}.txt`;

    try {
      const blob = new Blob([transcriptText], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Transcript downloaded as: ${filename}`);
    } catch (error) {
      console.error('Failed to download transcript:', error);
    }
  };

  if (isLoading) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center'>
        <div className='text-[var(--color-neutral-400)]'>
          Loading transcript...
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full flex-col'>
      {/* header */}
      <div className='flex flex-shrink-0 items-center justify-between border-b border-[var(--color-neutral-600)] p-4'>
        <div>
          <h3 className='text-lg font-semibold text-[var(--color-neutral-300)]'>
            Live Transcript
          </h3>
          {lastUpdated && (
            <p className='text-xs text-[var(--color-neutral-500)]'>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className='flex gap-2'>
          <Tooltip content='refresh' position='top' trigger='hover'>
            <Tooltip
              content='Transcripts refreshed!'
              position='bottom'
              trigger='click'
            >
              <button
                onClick={handleRefresh}
                className='rounded-md border border-[var(--color-neutral-600)] bg-inherit p-2 text-[var(--color-neutral-400)] hover:cursor-pointer hover:bg-[var(--color-neutral-800)]'
              >
                <IconRefresh size={16} />
              </button>
            </Tooltip>
          </Tooltip>
          <Tooltip content='copy' position='top' trigger='hover'>
            <Tooltip
              content='Copied to clipboard!'
              position='bottom'
              trigger='click'
            >
              <button
                onClick={handleCopyTranscript}
                className='rounded-md border border-[var(--color-neutral-600)] bg-inherit p-2 text-[var(--color-neutral-400)] hover:cursor-pointer hover:bg-[var(--color-neutral-800)]'
              >
                <IconCopy size={16} />
              </button>
            </Tooltip>
          </Tooltip>
          <Tooltip content='download' position='top' trigger='hover'>
            <Tooltip
              content='Starting download!'
              position='bottom'
              trigger='click'
            >
              <button
                onClick={handleDownloadTranscript}
                className='rounded-md border border-[var(--color-neutral-600)] bg-inherit p-2 text-[var(--color-neutral-400)] hover:cursor-pointer hover:bg-[var(--color-neutral-800)]'
              >
                <IconDownload size={16} />
              </button>
            </Tooltip>
          </Tooltip>
        </div>
      </div>

      {/* transcript content */}
      <div className='min-h-0 flex-1 overflow-y-auto p-4'>
        {transcript.length === 0 ? (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center text-[var(--color-neutral-400)]'>
              <p>No transcript available yet.</p>
              <p className='mt-2 text-sm'>
                Join a Google Meet to start capturing transcripts.
              </p>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            {transcript.map((entry, index) => (
              <div
                key={index}
                className='rounded-md border border-[var(--color-neutral-600)] p-3'
              >
                <div className='mb-2 flex items-center justify-between'>
                  <span className='font-medium text-[var(--color-neutral-300)]'>
                    {entry.personName}
                  </span>
                  <span className='text-xs text-[var(--color-neutral-500)]'>
                    {entry.timeStamp}
                  </span>
                </div>
                <p className='text-sm leading-relaxed text-[var(--color-neutral-400)]'>
                  {entry.personTranscript}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer */}
      <div className='flex-shrink-0 p-4'>
        <div className='text-center text-xs text-[var(--color-neutral-500)]'>
          {transcript.length} transcript entries captured
        </div>
      </div>
    </div>
  );
};
