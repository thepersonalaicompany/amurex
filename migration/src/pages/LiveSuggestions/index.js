import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import FileUpload from '../../components/FileUpload';
import { trackEvent, checkFileUploadStatus } from '../../utils/api';

const LiveSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [platformSupported, setPlatformSupported] = useState(true);

  useEffect(() => {
    // Check if platform is supported (MS Teams is not supported)
    const platform = window.AMUREX_CONFIG?.platform || 'unknown';
    setPlatformSupported(platform !== 'ms-teams');

    // Check if a file has been uploaded
    const hasUploadedFile = checkFileUploadStatus();
    setFileUploaded(hasUploadedFile);

    // Set up listener for file upload status changes
    window.addEventListener('fileUploadStatusChanged', (event) => {
      setFileUploaded(event.detail.uploaded);
    });

    if (hasUploadedFile) {
      fetchSuggestions();
    }

    return () => {
      window.removeEventListener('fileUploadStatusChanged', () => {});
    };
  }, []);

  const fetchSuggestions = () => {
    setIsLoading(true);
    // In a real implementation, we would fetch suggestions from an API
    // For now, we'll simulate a loading delay and use mock data
    setTimeout(() => {
      const mockSuggestions = [
        {
          id: 1,
          text: "Let's schedule a follow-up meeting next week to discuss the implementation details.",
          category: 'meeting',
          timestamp: '00:05:23'
        },
        {
          id: 2,
          text: "I'll create a document summarizing our discussion points and share it with everyone by EOD.",
          category: 'action',
          timestamp: '00:08:45'
        },
        {
          id: 3,
          text: "The deadline for the project is March 15th. Please make sure all deliverables are submitted by then.",
          category: 'deadline',
          timestamp: '00:12:30'
        },
        {
          id: 4,
          text: "We need to allocate additional resources to the marketing team for the upcoming campaign.",
          category: 'resource',
          timestamp: '00:15:10'
        },
        {
          id: 5,
          text: "Let's create a shared document where we can all contribute our ideas for the new feature.",
          category: 'action',
          timestamp: '00:18:22'
        }
      ];
      
      setSuggestions(mockSuggestions);
      setIsLoading(false);
    }, 1500);
  };

  const handleCopySuggestion = (suggestion) => {
    navigator.clipboard.writeText(suggestion.text);
    trackEvent('copy_suggestion', { category: suggestion.category });
  };

  const handleSendToChat = (suggestion) => {
    // In a real implementation, this would send the suggestion to the meeting chat
    console.log('Sending to chat:', suggestion.text);
    trackEvent('send_suggestion_to_chat', { category: suggestion.category });
  };

  const handleUploadSuccess = () => {
    setFileUploaded(true);
    fetchSuggestions();
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesCategory = selectedCategory === 'all' || suggestion.category === selectedCategory;
    const matchesSearch = suggestion.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatTimestamp = (timestamp) => {
    return timestamp; // Already in the right format for this example
  };

  const getCategoryColor = (category) => {
    const colors = {
      meeting: '#8B5CF6', // Purple
      action: '#10B981', // Green
      deadline: '#EF4444', // Red
      resource: '#F59E0B' // Amber
    };
    return colors[category] || '#8B5CF6';
  };

  return (
    <div className="pb-16">
      <Header title="Amurex" />
      
      <div className="p-4">
        {!platformSupported ? (
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 text-center">
            <svg 
              className="w-16 h-16 mx-auto mb-4 text-[rgba(255,255,255,0.6)]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
            >
              <path 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">Platform Not Supported</h2>
            <p className="text-[rgba(255,255,255,0.7)]">
              Live suggestions are not available on Microsoft Teams at this time.
              Please use Google Meet or Zoom for this feature.
            </p>
          </div>
        ) : !fileUploaded ? (
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Upload Context File</h2>
            <p className="text-[rgba(255,255,255,0.7)] mb-6">
              Upload a PDF document to get AI-powered suggestions during your meeting.
              The document will be used to provide context-aware suggestions.
            </p>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search suggestions..."
                  className="w-full bg-[#18181B] text-white px-4 py-3 pl-10 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#8B5CF6]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <svg 
                  className="absolute left-3 top-3.5 w-4 h-4 text-[rgba(255,255,255,0.5)]" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                >
                  <path 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button 
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                  selectedCategory === 'all' 
                    ? 'bg-[#8B5CF6] text-white' 
                    : 'bg-[#18181B] text-[rgba(255,255,255,0.7)] hover:bg-[#27272A]'
                }`}
                onClick={() => setSelectedCategory('all')}
              >
                All Suggestions
              </button>
              <button 
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                  selectedCategory === 'meeting' 
                    ? 'bg-[#8B5CF6] text-white' 
                    : 'bg-[#18181B] text-[rgba(255,255,255,0.7)] hover:bg-[#27272A]'
                }`}
                onClick={() => setSelectedCategory('meeting')}
              >
                Meeting
              </button>
              <button 
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                  selectedCategory === 'action' 
                    ? 'bg-[#10B981] text-white' 
                    : 'bg-[#18181B] text-[rgba(255,255,255,0.7)] hover:bg-[#27272A]'
                }`}
                onClick={() => setSelectedCategory('action')}
              >
                Action Items
              </button>
              <button 
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                  selectedCategory === 'deadline' 
                    ? 'bg-[#EF4444] text-white' 
                    : 'bg-[#18181B] text-[rgba(255,255,255,0.7)] hover:bg-[#27272A]'
                }`}
                onClick={() => setSelectedCategory('deadline')}
              >
                Deadlines
              </button>
              <button 
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                  selectedCategory === 'resource' 
                    ? 'bg-[#F59E0B] text-white' 
                    : 'bg-[#18181B] text-[rgba(255,255,255,0.7)] hover:bg-[#27272A]'
                }`}
                onClick={() => setSelectedCategory('resource')}
              >
                Resources
              </button>
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-[#18181B] animate-pulse rounded-lg p-4 h-24"></div>
                ))}
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 text-center">
                <svg 
                  className="w-12 h-12 mx-auto mb-4 text-[rgba(255,255,255,0.6)]" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                >
                  <path 
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <h3 className="text-lg font-medium text-white">No suggestions found</h3>
                <p className="text-[rgba(255,255,255,0.7)] mt-2">
                  Try changing your search or category filter
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSuggestions.map((suggestion) => (
                  <div 
                    key={suggestion.id} 
                    className="bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div 
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${getCategoryColor(suggestion.category)}20`,
                          color: getCategoryColor(suggestion.category)
                        }}
                      >
                        {suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1)}
                      </div>
                      <div className="text-[rgba(255,255,255,0.5)] text-sm">
                        {formatTimestamp(suggestion.timestamp)}
                      </div>
                    </div>
                    <p className="text-white mb-3">{suggestion.text}</p>
                    <div className="flex gap-2">
                      <button 
                        className="flex items-center gap-1 text-[rgba(255,255,255,0.6)] hover:text-white text-sm"
                        onClick={() => handleCopySuggestion(suggestion)}
                      >
                        <svg 
                          className="w-4 h-4" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor"
                        >
                          <path 
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                        Copy
                      </button>
                      <button 
                        className="flex items-center gap-1 text-[rgba(255,255,255,0.6)] hover:text-white text-sm"
                        onClick={() => handleSendToChat(suggestion)}
                      >
                        <svg 
                          className="w-4 h-4" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor"
                        >
                          <path 
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                        Send to chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LiveSuggestions; 