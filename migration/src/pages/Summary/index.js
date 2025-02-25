import React, { useState, useEffect } from 'react';
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
    trackEvent('open_export_dropdown');
  };

  return (
    <div className="pb-16">
      <Header title="Amurex" />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button 
              className="flex items-center gap-2 bg-[#18181B] hover:bg-[#27272A] text-white px-4 py-2 rounded-lg text-sm"
              onClick={handleExportToApps}
            >
              <svg 
                className="w-5 h-5" 
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
              <span>Export Notes</span>
            </button>
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
                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" 
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