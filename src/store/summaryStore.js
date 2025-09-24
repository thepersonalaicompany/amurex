import { summaryService } from '@/lib/summary-service';
import storageService from '@/services/storage-service';
import { create } from 'zustand';

/**
 * Summary Store - Manages summary generation and state
 * Uses Zustand for state management with Chrome storage persistence
 */

export const useSummaryStore = create((set, get) => ({
  // State
  isLoading: false,
  summary: '',
  actionItems: '',
  error: null,
  lastGenerated: null,
  isEditing: false,
  transcript: null,
  meetingId: null,
  userId: null,
  meetingStatus: 'unknown', // 'ongoing', 'ended', 'unknown'

  // Actions
  /**
   * Set loading state
   */
  setLoading: (loading) => set({ isLoading: loading }),

  /**
   * Set error state
   */
  setError: (error) => set({ error }),

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Set summary content
   */
  setSummary: (summary) => set({ summary }),

  /**
   * Set action items
   */
  setActionItems: (actionItems) => set({ actionItems }),

  /**
   * Toggle edit mode
   */
  toggleEdit: () => set((state) => ({ isEditing: !state.isEditing })),

  /**
   * Set edit mode
   */
  setEditMode: (isEditing) => set({ isEditing }),

  /**
   * Set meeting status
   */
  setMeetingStatus: (status) => set({ meetingStatus: status }),

  /**
   * Load transcript data from storage
   */
  loadTranscript: async () => {
    try {
      const transcriptData = await storageService.getTranscript();
      if (transcriptData) {
        // Handle both old and new transcript formats
        const transcript = transcriptData.data || transcriptData;
        set({ transcript });
        return transcript;
      }
      return null;
    } catch (error) {
      console.error('Failed to load transcript:', error);
      set({ error: 'Failed to load transcript data' });
      return null;
    }
  },

  /**
   * Load meeting ID from storage
   */
  loadMeetingId: async () => {
    try {
      const meetingId = await storageService.getMeetingId();
      // console.log('Loaded meeting ID from storage:', meetingId);
      if (meetingId) {
        set({ meetingId });
        return meetingId;
      }
      console.warn('No meeting ID found in storage');
      return null;
    } catch (error) {
      console.error('Failed to load meeting ID:', error);
      set({ error: 'Failed to load meeting ID' });
      return null;
    }
  },

  /**
   * Load user ID from background script
   */
  loadUserId: async () => {
    try {
      const userId = await summaryService.getUserId();
      if (userId) {
        set({ userId });
        return userId;
      }
      return null;
    } catch (error) {
      console.error('Failed to load user ID:', error);
      set({ error: 'Failed to load user ID' });
      return null;
    }
  },

  /**
   * Load existing summary from storage
   */
  loadExistingSummary: async () => {
    try {
      const summaryData = await storageService.getSummary();
      if (summaryData) {
        set({
          summary: summaryData.summary || '',
          actionItems: summaryData.actionItems || '',
          lastGenerated: summaryData.timestamp,
        });
        return summaryData;
      }
      return null;
    } catch (error) {
      console.error('Failed to load existing summary:', error);
      set({ error: 'Failed to load existing summary' });
      return null;
    }
  },

  /**
   * Save summary to storage
   */
  saveSummary: async (summaryData) => {
    try {
      await storageService.setSummary(summaryData);
      set({ lastGenerated: Date.now() });
    } catch (error) {
      console.error('Failed to save summary:', error);
      set({ error: 'Failed to save summary' });
    }
  },

  /**
   * Generate summary from transcript
   */
  generateSummary: async () => {
    const state = get();

    // Check if we already have a summary
    if (state.summary && state.actionItems && state.lastGenerated) {
      const timeSinceGenerated = Date.now() - state.lastGenerated;
      const oneHour = 60 * 60 * 1000;

      // If summary is less than 1 hour old, don't regenerate
      if (timeSinceGenerated < oneHour) {
        return { summary: state.summary, actionItems: state.actionItems };
      }
    }

    set({ isLoading: true, error: null });

    try {
      // load required data
      const transcript = state.transcript || (await get().loadTranscript());
      const meetingId = state.meetingId || (await get().loadMeetingId());
      const userId = state.userId || (await get().loadUserId());

      // console.log('Summary generation data:', {
      //   hasTranscript: !!transcript,
      //   transcriptLength: transcript ? transcript.length : 0,
      //   meetingId,
      //   userId,
      // });

      if (!transcript) {
        throw new Error('No transcript available to generate summary');
      }

      if (!meetingId) {
        throw new Error('No meeting ID available');
      }

      if (!userId) {
        throw new Error('No user ID available');
      }

      // Format transcript for API
      const formattedTranscript =
        summaryService.formatTranscriptForAPI(transcript);

      // Generate summary via API
      const result = await summaryService.generateSummary(
        formattedTranscript,
        meetingId,
        userId
      );

      // Update state
      set({
        summary: result.notes_content || '',
        actionItems: result.action_items || '',
        lastGenerated: Date.now(),
        isLoading: false,
        error: null,
      });

      // Save to storage - ensure summary is saved when API returns data
      try {
        await get().saveSummary({
          summary: result.notes_content || '',
          actionItems: result.action_items || '',
        });
        console.log('Summary saved to storage successfully');
      } catch (error) {
        console.error('Failed to save summary to storage:', error);
      }

      return result;
    } catch (error) {
      console.error('Summary generation failed:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to generate summary',
      });
      throw error;
    }
  },

  /**
   * Load meeting status from storage
   */
  loadMeetingStatus: async () => {
    try {
      const result = await storageService.getMeetingStatus();
      if (result) {
        set({ meetingStatus: result });
        return result;
      }
      return 'unknown';
    } catch (error) {
      console.error('Failed to load meeting status:', error);
      set({ meetingStatus: 'unknown' });
      return 'unknown';
    }
  },

  /**
   * Save meeting status to storage
   */
  saveMeetingStatus: async (status) => {
    try {
      await storageService.setMeetingStatus(status);
      set({ meetingStatus: status });
    } catch (error) {
      console.error('Failed to save meeting status:', error);
    }
  },

  /**
   * Initialize summary data (load existing or generate new)
   */
  initializeSummary: async () => {
    try {
      // Load meeting status first
      const meetingStatus = await get().loadMeetingStatus();

      // If meeting is ongoing, don't generate summary
      if (meetingStatus === 'ongoing') {
        console.log('Meeting is ongoing, skipping summary generation');
        return null;
      }

      // Try to load existing summary first
      const existingSummary = await get().loadExistingSummary();

      if (existingSummary) {
        // Check if summary is recent (less than 1 hour old)
        const timeSinceGenerated = Date.now() - existingSummary.timestamp;
        const oneHour = 60 * 60 * 1000;

        if (timeSinceGenerated < oneHour) {
          return existingSummary;
        }
      }

      // If no recent summary and meeting has ended, generate new one
      if (meetingStatus === 'ended') {
        return await get().generateSummary();
      }

      return null;
    } catch (error) {
      console.error('Failed to initialize summary:', error);
      set({ error: error.message || 'Failed to initialize summary' });
      return null;
    }
  },

  /**
   * Update summary content (for editing)
   */
  updateSummary: async (newSummary) => {
    try {
      set({ summary: newSummary });
      await get().saveSummary({
        summary: newSummary,
        actionItems: get().actionItems,
      });
    } catch (error) {
      console.error('Failed to update summary:', error);
      set({ error: 'Failed to update summary' });
    }
  },

  /**
   * Update action items (for editing)
   */
  updateActionItems: async (newActionItems) => {
    try {
      set({ actionItems: newActionItems });
      await get().saveSummary({
        summary: get().summary,
        actionItems: newActionItems,
      });
    } catch (error) {
      console.error('Failed to update action items:', error);
      set({ error: 'Failed to update action items' });
    }
  },

  /**
   * Clear summary data
   */
  clearSummary: async () => {
    try {
      await storageService.clearSummary();
      set({
        summary: '',
        actionItems: '',
        lastGenerated: null,
        error: null,
      });
    } catch (error) {
      console.error('Failed to clear summary:', error);
      set({ error: 'Failed to clear summary' });
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () =>
    set({
      isLoading: false,
      summary: '',
      actionItems: '',
      error: null,
      lastGenerated: null,
      isEditing: false,
      transcript: null,
      meetingId: null,
      userId: null,
      meetingStatus: 'unknown',
    }),
}));
