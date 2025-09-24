import { LoadingState } from '@/components/LoadingState';
import { SuggestionCard } from '@/components/suggestions';
import { analyticsService } from '@/lib/analytics';
import { errorHandler } from '@/lib/error-handler';
import { uploadFile } from '@/lib/file-upload';
import { validateFile } from '@/lib/file-validation';
import { cn } from '@/lib/utils';
import { WebSocketConnection } from '@/lib/websocket-connection';
import { useAuthStore } from '@/store/authStore';
import { useSuggestionStore } from '@/store/suggestionStore';
import { useUploadStore } from '@/store/uploadStore';
import {
  IconAlertCircle,
  IconPlus,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export const LiveSuggestionsComponent = () => {
  const [currentView, setCurrentView] = useState('upload'); // 'upload' or 'suggestions'
  const [wsConnection, setWsConnection] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    suggestions,
    isConnected,
    connectionStatus,
    addSuggestion,
    setConnectionStatus,
  } = useSuggestionStore();
  const {
    files,
    isUploading,
    addFile,
    removeFile,
    setUploading,
    setError: setUploadError,
    clearError,
  } = useUploadStore();
  const { getUserId } = useAuthStore();

  // Initialize WebSocket connection
  useEffect(() => {
    // Track component mount
    analyticsService.trackOpenSidepanel();

    const initializeConnection = async () => {
      const userId = getUserId();
      if (!userId) return;

      setIsConnecting(true);
      try {
        const connection = new WebSocketConnection();

        connection.on('message', (message) => {
          if (
            message.type === 'suggestion_response' &&
            message.generated_suggestion
          ) {
            addSuggestion(message);
            analyticsService.trackSuggestionInteraction('received', message.id);
          }
        });

        connection.on('connect', () => {
          setConnectionStatus('connected');
          setIsConnecting(false);
          console.log('WebSocket connected');
          analyticsService.trackWebSocketEvent('connect', 'connected');
        });

        connection.on('disconnect', () => {
          setConnectionStatus('disconnected');
          setIsConnecting(false);
          console.log('WebSocket disconnected');
          analyticsService.trackWebSocketEvent('disconnect', 'disconnected');
        });

        connection.on('error', (error) => {
          setConnectionStatus('error');
          setIsConnecting(false);
          errorHandler.handleWebSocketError(error, connection);
        });

        // Get meeting ID from storage
        const result = await chrome.storage.local.get(['mId']);
        const meetingId = result.mId;

        if (!meetingId) {
          throw new Error('No meeting ID found');
        }

        await connection.connect(meetingId, userId);
        setWsConnection(connection);
      } catch (error) {
        setConnectionStatus('error');
        setIsConnecting(false);
        errorHandler.handleError(error, 'websocket_initialization');
      }
    };

    initializeConnection();

    return () => {
      if (wsConnection) {
        wsConnection.disconnect();
      }
      // Track component unmount
      analyticsService.trackCloseSidebar();
    };
  }, [getUserId, addSuggestion, setConnectionStatus]);

  const handleFileUpload = async (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    const file = acceptedFiles[0];

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      setUploadError(validation.getFirstError());
      return;
    }

    setUploading(true);
    clearError();

    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get meeting ID from storage
      const result = await chrome.storage.local.get(['mId']);
      const meetingId = result.mId;

      if (!meetingId) {
        throw new Error('No meeting ID found');
      }

      const uploadResult = await uploadFile(
        file,
        meetingId,
        userId,
        (progress) => {
          // Progress callback
          console.log(`Upload progress: ${progress.percentage}%`);
        },
        (progress, data) => {
          // Complete callback
          console.log('Upload completed:', data);
        },
        (progress) => {
          // Error callback
          console.error('Upload error:', progress.error);
          setUploadError(progress.error);
        }
      );

      if (uploadResult.success) {
        addFile({
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          url: uploadResult.fileUrl,
        });

        // Track successful upload
        console.log(`File "${file.name}" uploaded successfully`);
        analyticsService.trackFileUpload(file.name, file.size, true);

        // Switch to suggestions view after successful upload
        setTimeout(() => {
          setCurrentView('suggestions');
        }, 1000);
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      setUploadError(error.message);
      errorHandler.handleFileUploadError(error, file);
    } finally {
      setUploading(false);
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <IconWifi className='h-4 w-4 text-green-400' />;
      case 'connecting':
      case 'reconnecting':
        return <IconWifi className='h-4 w-4 animate-pulse text-yellow-400' />;
      case 'error':
        return <IconWifiOff className='h-4 w-4 text-red-400' />;
      default:
        return <IconWifiOff className='h-4 w-4 text-gray-400' />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  if (currentView === 'upload') {
    return (
      <div className='flex h-full w-full flex-col items-center rounded-md border border-[var(--color-neutral-600)] p-4'>
        <h3 className='w-full text-lg font-semibold text-[var(--color-neutral-300)]'>
          Upload Meeting Context Files
        </h3>
        <p className='m-4 text-center text-sm text-[var(--color-neutral-300)]'>
          Want to get the best out of <br /> Amurex's real-time suggestions?{' '}
          <br /> Just upload a file
          <br />
          related to your meeting.
        </p>
        <h4 className='mx-4 w-full text-base font-semibold text-[var(--color-neutral-400)]'>
          Some Ideas
        </h4>
        <ul className='mt-4 w-full px-4 text-[var(--color-neutral-400)]'>
          <li>- Pitch or Sales Deck</li>
          <li>- Interview Questions</li>
          <li>- Cheat Sheet</li>
        </ul>
        <UploadComponent
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
        />

        {/* Connection Status */}
        <div className='mt-4 flex items-center gap-2 text-sm text-[var(--color-neutral-400)]'>
          {getConnectionStatusIcon()}
          <span>{getConnectionStatusText()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full flex-col rounded-md border border-[var(--color-neutral-600)] p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-[var(--color-neutral-300)]'>
          Live Suggestions
        </h3>
        <div className='flex items-center gap-2 text-sm text-[var(--color-neutral-400)]'>
          {getConnectionStatusIcon()}
          <span>{getConnectionStatusText()}</span>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className='flex-1 overflow-y-auto'>
          <div className='space-y-3'>
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onCopy={(content) => {
                  navigator.clipboard.writeText(content);
                  console.log('Copied to clipboard');
                  analyticsService.trackCopyToClipboard('suggestion');
                }}
                onShare={(suggestion) => {
                  // Share functionality
                  console.log('Share suggestion:', suggestion);
                  analyticsService.trackShareToApps('suggestion');
                }}
                onRate={(id, rating) => {
                  // Rate suggestion
                  console.log('Rate suggestion:', id, rating);
                  analyticsService.trackSuggestionInteraction('rate', id);
                }}
                onDelete={(id) => {
                  // Delete suggestion
                  console.log('Delete suggestion:', id);
                  analyticsService.trackSuggestionInteraction('delete', id);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className='flex flex-1 items-center justify-center'>
          <div className='text-center text-[var(--color-neutral-400)]'>
            <IconAlertCircle className='mx-auto mb-2 h-12 w-12 opacity-50' />
            <p>No suggestions yet</p>
            <p className='mt-1 text-sm'>
              Suggestions will appear here during your meeting
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const UploadComponent = ({ onFileUpload, isUploading }) => {
  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (acceptedFiles?.length) {
        onFileUpload(acceptedFiles);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': [],
    },
    disabled: isUploading,
    multiple: false,
  });

  return (
    <div
      {...getRootProps({
        className: cn(
          'm-8 flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-neutral-500)] hover:cursor-pointer',
          isDragActive
            ? 'bg-[var(--color-neutral-700)]'
            : 'hover:bg-[var(--color-neutral-700)]',
          isUploading && 'opacity-50 cursor-not-allowed'
        ),
      })}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <LoadingState message='Uploading file...' />
      ) : (
        <>
          <IconPlus
            className='h-56 w-56 text-[var(--color-neutral-500)]'
            stroke={1.5}
          />
          <p className='m-4 flex items-center justify-center text-center text-sm text-[var(--color-neutral-500)]'>
            {isDragActive ? 'Drop files here' : 'Supported formats: PDF'}
          </p>
        </>
      )}
    </div>
  );
};
