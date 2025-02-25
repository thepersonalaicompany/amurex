import React, { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { trackEvent, downloadTranscript } from '../../utils/api';

const Summary = () => {
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingActionItems, setIsEditingActionItems] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [date, setDate] = useState('');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, we would fetch data from an API
        // For now, we'll simulate a loading delay and use mock data
        setTimeout(() => {
          const currentDate = new Date();
          setDate(`${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getDate()}, ${currentDate.getFullYear()}`);
          
          setParticipants(['You', 'Sub Scriptions']);
          
          setSummary(`Discussion about a panel being opened on the side.\n\nMention of a problem with the screen real estate.`);
          
          setActionItems([
            { person: 'You', items: ['Make a freaksight', 'Send a link to join the meeting'] },
            { person: 'Sub Scriptions', items: ['No action items'] }
          ]);
          
          setIsLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary);
    trackEvent('copy_summary');
  };

  const handleCopyActionItems = () => {
    const formattedActionItems = actionItems
      .map(person => `${person.person}:\n${person.items.map(item => `- ${item}`).join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(formattedActionItems);
    trackEvent('copy_action_items');
  };

  const handleEditSummary = () => {
    setIsEditingSummary(true);
    trackEvent('edit_summary');
  };

  const handleEditActionItems = () => {
    setIsEditingActionItems(true);
    trackEvent('edit_action_items');
  };

  const handleSaveSummary = () => {
    setIsEditingSummary(false);
    trackEvent('save_summary');
  };

  const handleSaveActionItems = () => {
    setIsEditingActionItems(false);
    trackEvent('save_action_items');
  };

  const handleDownloadTranscript = () => {
    downloadTranscript();
    trackEvent('download_transcript');
  };

  const handleExportToApps = () => {
    setIsExportDropdownOpen(!isExportDropdownOpen);
    trackEvent('open_export_dropdown');
  };

  const handleCopyToClipboard = () => {
    // Combine summary and action items
    const formattedActionItems = actionItems
      .map(person => `${person.person}:\n${person.items.map(item => `- ${item}`).join('\n')}`)
      .join('\n\n');
    
    const fullText = `Summary:\n${summary}\n\nAction Items:\n${formattedActionItems}`;
    
    navigator.clipboard.writeText(fullText);
    setIsExportDropdownOpen(false);
    trackEvent('copy_all_to_clipboard');
  };

  const handleExportToExternalApps = () => {
    const meetingId = window.location.href.includes("meetingId=")
      ? window.location.href.split("meetingId=")[1].split("&")[0]
      : "unknown";

    chrome.runtime.sendMessage(
      { action: "getUserId" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error getting user id:", chrome.runtime.lastError);
          return;
        }

        const userId = response.userId;

        // Track the event if analytics is enabled
        if (window.AMUREX_CONFIG.ANALYTICS_ENABLED) {
          fetch(`${window.AMUREX_CONFIG.BASE_URL_BACKEND}/track`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              uuid: userId,
              meeting_id: meetingId,
              event_type: "share_to_apps",
            }),
          }).catch((error) => {
            console.error("Error tracking share:", error);
          });
        }

        // Format action items
        const cleanActionItems = actionItems
          .map(person => person.items
            .map(item => `- [ ] ${item.trim()}`)
            .join('\n'))
          .join('\n');

        // Format summary
        const cleanSummary = summary
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            if (line.match(/^[*-]/)) {
              return line.replace(/^([*-]+)\s*/, "$1 ").trim();
            }
            return line.trim();
          })
          .join('\n');

        const markdownText = `## Action Items\n${cleanActionItems}\n\n## Meeting Summary\n${cleanSummary}`;

        const shareOptions = {
          text: markdownText,
          title: "Meeting Notes",
        };

        if (navigator.canShare && navigator.canShare(shareOptions)) {
          navigator.share(shareOptions)
            .then(() => {
              console.log("Shared successfully");
              setIsExportDropdownOpen(false);
            })
            .catch((error) => {
              if (error.name !== "AbortError") {
                console.error("Error sharing:", error);
              }
            });
        } else {
          alert("Web Share API is not supported in your browser");
        }
      }
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setIsExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="pb-16">
      <Header title="Amurex" />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center relative" ref={exportDropdownRef}>
            <button 
              className="flex items-center gap-2 bg-[#18181B] hover:bg-[#27272A] text-white px-4 py-2 rounded-lg text-sm"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            >
              <svg 
                className="w-5 h-5" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
              >
                <path 
                  d="M12 16V8M12 8L9 11M12 8L15 11" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <span>Export Notes</span>
              <svg 
                className={`w-4 h-4 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
              >
                <path 
                  d="M19 9l-7 7-7-7" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            
            {isExportDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-lg z-10">
                <div className="py-1">
                  <button 
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-white hover:bg-[#27272A]"
                    onClick={handleCopyToClipboard}
                  >
                    <svg 
                      className="w-5 h-5" 
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
                    <span>Copy to clipboard</span>
                  </button>
                  
                  <button 
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-white hover:bg-[#27272A]"
                    onClick={handleExportToExternalApps}
                  >
                    <svg 
                      className="w-5 h-5" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor"
                    >
                      <path 
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Export to apps</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button 
            className="flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm"
            onClick={handleDownloadTranscript}
          >
            <svg 
              className="w-5 h-5" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
            >
              <path 
                d="M12 16V8M12 16L9 13M12 16L15 13" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M3 15V16C3 18.2091 4.79086 20 7 20H17C19.2091 20 21 18.2091 21 16V15" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span>Save transcript</span>
          </button>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-40 bg-[#18181B] animate-pulse rounded-lg"></div>
            <div className="h-40 bg-[#18181B] animate-pulse rounded-lg"></div>
          </div>
        ) : (
          <>
            <div className="mb-6 bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Action items</h2>
                <div className="flex gap-2">
                  <button 
                    className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white"
                    onClick={handleCopyActionItems}
                  >
                    <svg 
                      className="w-5 h-5" 
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
                  </button>
                  <button 
                    className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white"
                    onClick={handleEditActionItems}
                  >
                    <svg 
                      className="w-5 h-5" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor"
                    >
                      <path 
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              
              {isEditingActionItems ? (
                <div className="mb-2">
                  <textarea 
                    className="w-full h-40 bg-[#18181B] text-white p-3 rounded-lg border border-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[#8B5CF6]"
                    value={actionItems.map(person => `${person.person}:\n${person.items.map(item => `- ${item}`).join('\n')}`).join('\n\n')}
                    onChange={(e) => {
                      // This is a simplified implementation
                      // In a real app, you'd need to parse the text back into the actionItems structure
                    }}
                  />
                  <div className="flex justify-end mt-2">
                    <button 
                      className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm"
                      onClick={handleSaveActionItems}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {actionItems.map((person, index) => (
                    <div key={index} className="mb-4">
                      <h3 className="text-[rgba(255,255,255,0.7)] mb-2">{person.person}</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        {person.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-white">{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Summary</h2>
                <div className="flex gap-2">
                  <button 
                    className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white"
                    onClick={handleCopySummary}
                  >
                    <svg 
                      className="w-5 h-5" 
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
                  </button>
                  <button 
                    className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white"
                    onClick={handleEditSummary}
                  >
                    <svg 
                      className="w-5 h-5" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor"
                    >
                      <path 
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-[rgba(255,255,255,0.7)] mb-1">Date:</div>
                <div className="text-white mb-3">{date}</div>
                
                <div className="text-[rgba(255,255,255,0.7)] mb-1">Participants:</div>
                <ul className="list-disc pl-6 mb-4">
                  {participants.map((participant, index) => (
                    <li key={index} className="text-white">{participant}</li>
                  ))}
                </ul>
                
                <div className="text-[rgba(255,255,255,0.7)] mb-1">Summary:</div>
                {isEditingSummary ? (
                  <div className="mb-2">
                    <textarea 
                      className="w-full h-40 bg-[#18181B] text-white p-3 rounded-lg border border-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[#8B5CF6]"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <button 
                        className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm"
                        onClick={handleSaveSummary}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-white whitespace-pre-line">
                    <ul className="list-disc pl-6 space-y-2">
                      {summary.split('\n\n').map((paragraph, index) => (
                        <li key={index}>{paragraph}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Summary; 