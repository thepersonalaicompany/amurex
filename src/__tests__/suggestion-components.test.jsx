// Suggestion components tests for Amurex Extension
// Tests SuggestionCard, SuggestionHistory, and SuggestionActions components

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SuggestionActions } from '../components/suggestions/SuggestionActions.jsx';
import { SuggestionCard } from '../components/suggestions/SuggestionCard.jsx';
import { SuggestionHistory } from '../components/suggestions/SuggestionHistory.jsx';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(),
  },
});

// Window mock is handled in test setup

describe('Suggestion Components', () => {
  const mockSuggestion = {
    id: '1',
    content: 'This is a test suggestion for the meeting.',
    type: 'suggestion_response',
    timestamp: '2024-01-15T10:30:00Z',
    filesFound: true,
    lastQuestion: 'What should we discuss next?',
  };

  const mockSuggestions = [
    mockSuggestion,
    {
      id: '2',
      content: 'Another suggestion for the team.',
      type: 'suggestion_response',
      timestamp: '2024-01-15T11:00:00Z',
      filesFound: false,
      lastQuestion: null,
    },
    {
      id: '3',
      content: 'Rate limit exceeded message.',
      type: 'exceeded_response',
      timestamp: '2024-01-15T11:30:00Z',
      filesFound: false,
      lastQuestion: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SuggestionCard', () => {
    it('should render suggestion content correctly', () => {
      render(<SuggestionCard suggestion={mockSuggestion} />);

      expect(
        screen.getByText('This is a test suggestion for the meeting.')
      ).toBeInTheDocument();
      expect(screen.getByText('Suggestion')).toBeInTheDocument();
      expect(
        screen.getByText('What should we discuss next?')
      ).toBeInTheDocument();
    });

    it('should display correct type and timestamp', () => {
      render(<SuggestionCard suggestion={mockSuggestion} />);

      expect(screen.getByText('Suggestion')).toBeInTheDocument();
      expect(screen.getByText(/10:30:00/)).toBeInTheDocument();
    });

    it('should show file status when files are found', () => {
      render(<SuggestionCard suggestion={mockSuggestion} />);

      expect(screen.getByText('✓ Context files available')).toBeInTheDocument();
    });

    it('should handle copy action', async () => {
      const onCopy = vi.fn();
      render(<SuggestionCard suggestion={mockSuggestion} onCopy={onCopy} />);

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          mockSuggestion.content
        );
        expect(onCopy).toHaveBeenCalledWith(mockSuggestion.content);
      });
    });

    it('should handle share action', () => {
      const onShare = vi.fn();
      render(<SuggestionCard suggestion={mockSuggestion} onShare={onShare} />);

      const shareButton = screen.getByTitle('Share suggestion');
      fireEvent.click(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockSuggestion);
    });

    it('should handle delete action', () => {
      const onDelete = vi.fn();
      render(
        <SuggestionCard suggestion={mockSuggestion} onDelete={onDelete} />
      );

      const deleteButton = screen.getByTitle('Delete suggestion');
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith(mockSuggestion.id);
    });

    it('should handle rating actions', () => {
      const onRate = vi.fn();
      render(<SuggestionCard suggestion={mockSuggestion} onRate={onRate} />);

      const helpfulButton = screen.getByTitle('Rate as helpful');
      fireEvent.click(helpfulButton);

      expect(onRate).toHaveBeenCalledWith(mockSuggestion.id, 'positive');
    });

    it('should show different type colors', () => {
      const exceededSuggestion = {
        ...mockSuggestion,
        type: 'exceeded_response',
      };

      render(<SuggestionCard suggestion={exceededSuggestion} />);

      expect(screen.getByText('Rate Limited')).toBeInTheDocument();
    });
  });

  describe('SuggestionHistory', () => {
    it('should render suggestions list', () => {
      render(<SuggestionHistory suggestions={mockSuggestions} />);

      expect(screen.getByText('Suggestion History')).toBeInTheDocument();
      expect(
        screen.getByText('This is a test suggestion for the meeting.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Another suggestion for the team.')
      ).toBeInTheDocument();
    });

    it('should show empty state when no suggestions', () => {
      render(<SuggestionHistory suggestions={[]} />);

      expect(screen.getByText('No suggestion history yet')).toBeInTheDocument();
      expect(
        screen.getByText('Suggestions will appear here after you receive them')
      ).toBeInTheDocument();
    });

    it('should display type statistics', () => {
      render(<SuggestionHistory suggestions={mockSuggestions} />);

      expect(screen.getByText('suggestion_response: 2')).toBeInTheDocument();
      expect(screen.getByText('exceeded_response: 1')).toBeInTheDocument();
    });

    it('should handle search functionality', () => {
      render(<SuggestionHistory suggestions={mockSuggestions} />);

      const searchInput = screen.getByPlaceholderText('Search suggestions...');
      fireEvent.change(searchInput, { target: { value: 'test suggestion' } });

      expect(
        screen.getByText('This is a test suggestion for the meeting.')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Another suggestion for the team.')
      ).not.toBeInTheDocument();
    });

    it('should handle filter functionality', () => {
      render(<SuggestionHistory suggestions={mockSuggestions} />);

      const filterSelect = screen.getByDisplayValue('All Types');
      fireEvent.change(filterSelect, {
        target: { value: 'exceeded_response' },
      });

      expect(
        screen.getByText('Rate limit exceeded message.')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('This is a test suggestion for the meeting.')
      ).not.toBeInTheDocument();
    });

    it('should handle clear history', () => {
      const onClearHistory = vi.fn();
      global.window.confirm.mockReturnValue(true);

      render(
        <SuggestionHistory
          suggestions={mockSuggestions}
          onClearHistory={onClearHistory}
        />
      );

      const clearButton = screen.getByText('Clear History');
      fireEvent.click(clearButton);

      expect(global.window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to clear all suggestion history?'
      );
      expect(onClearHistory).toHaveBeenCalled();
    });

    it('should handle pagination', () => {
      const manySuggestions = Array.from({ length: 25 }, (_, i) => ({
        ...mockSuggestion,
        id: i.toString(),
        content: `Suggestion ${i}`,
      }));

      render(<SuggestionHistory suggestions={manySuggestions} />);

      expect(
        screen.getByText('Showing 1-10 of 25 suggestions')
      ).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Should show page 3 button
    });

    it('should show no results message when search returns empty', () => {
      render(<SuggestionHistory suggestions={mockSuggestions} />);

      const searchInput = screen.getByPlaceholderText('Search suggestions...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No suggestions found')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search or filter criteria')
      ).toBeInTheDocument();
    });
  });

  describe('SuggestionActions', () => {
    it('should render default variant with all actions', () => {
      render(<SuggestionActions suggestion={mockSuggestion} />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
      expect(screen.getByText('Helpful')).toBeInTheDocument();
      expect(screen.getByText('Not Helpful')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should render compact variant', () => {
      render(
        <SuggestionActions suggestion={mockSuggestion} variant='compact' />
      );

      expect(screen.queryByText('Copy')).not.toBeInTheDocument();
      expect(screen.queryByText('Share')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();

      // Should have icon buttons
      expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
      expect(screen.getByTitle('Share suggestion')).toBeInTheDocument();
      expect(screen.getByTitle('Delete suggestion')).toBeInTheDocument();
    });

    it('should render minimal variant', () => {
      render(
        <SuggestionActions suggestion={mockSuggestion} variant='minimal' />
      );

      expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
      expect(screen.queryByTitle('Share suggestion')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete suggestion')).not.toBeInTheDocument();
    });

    it('should handle copy action', async () => {
      const onCopy = vi.fn();
      render(<SuggestionActions suggestion={mockSuggestion} onCopy={onCopy} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          mockSuggestion.content
        );
        expect(onCopy).toHaveBeenCalledWith(mockSuggestion.content);
      });
    });

    it('should handle share action', () => {
      const onShare = vi.fn();
      render(
        <SuggestionActions suggestion={mockSuggestion} onShare={onShare} />
      );

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockSuggestion);
    });

    it('should handle rating actions', () => {
      const onRate = vi.fn();
      render(<SuggestionActions suggestion={mockSuggestion} onRate={onRate} />);

      const helpfulButton = screen.getByText('Helpful');
      fireEvent.click(helpfulButton);

      expect(onRate).toHaveBeenCalledWith(mockSuggestion.id, 'positive');
    });

    it('should handle delete action with confirmation', () => {
      const onDelete = vi.fn();
      global.window.confirm.mockReturnValue(true);

      render(
        <SuggestionActions suggestion={mockSuggestion} onDelete={onDelete} />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(global.window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this suggestion?'
      );
      expect(onDelete).toHaveBeenCalledWith(mockSuggestion.id);
    });

    it('should not delete when confirmation is cancelled', () => {
      const onDelete = vi.fn();
      global.window.confirm.mockReturnValue(false);

      render(
        <SuggestionActions suggestion={mockSuggestion} onDelete={onDelete} />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(onDelete).not.toHaveBeenCalled();
    });

    it('should show feedback after rating', () => {
      render(<SuggestionActions suggestion={mockSuggestion} />);

      const helpfulButton = screen.getByText('Helpful');
      fireEvent.click(helpfulButton);

      expect(screen.getByText('✓ Marked as helpful')).toBeInTheDocument();
      expect(screen.queryByText('Helpful')).not.toBeInTheDocument();
      expect(screen.queryByText('Not Helpful')).not.toBeInTheDocument();
    });
  });
});
