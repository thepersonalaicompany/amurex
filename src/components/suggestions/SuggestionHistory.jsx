// Suggestion history component for displaying historical suggestions
// Features: historical suggestions list, search and filter, pagination, clear history

import { cn } from '@/lib/utils';
import {
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { SuggestionCard } from './SuggestionCard.jsx';

export const SuggestionHistory = ({
  suggestions = [],
  onClearHistory,
  onDeleteSuggestion,
  onCopySuggestion,
  onShareSuggestion,
  onRateSuggestion,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter and search suggestions
  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (suggestion) =>
          suggestion.content
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          suggestion.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(
        (suggestion) => suggestion.type === filterType
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return filtered;
  }, [suggestions, searchQuery, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredSuggestions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuggestions = filteredSuggestions.slice(startIndex, endIndex);

  // Get unique types for filter
  const availableTypes = useMemo(() => {
    const types = [...new Set(suggestions.map((s) => s.type))];
    return types;
  }, [suggestions]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleClearHistory = () => {
    if (
      window.confirm('Are you sure you want to clear all suggestion history?')
    ) {
      onClearHistory?.();
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getTypeStats = () => {
    const stats = suggestions.reduce((acc, suggestion) => {
      acc[suggestion.type] = (acc[suggestion.type] || 0) + 1;
      return acc;
    }, {});

    return stats;
  };

  const typeStats = getTypeStats();

  if (suggestions.length === 0) {
    return (
      <div
        className={cn(
          'flex h-64 items-center justify-center rounded-lg border border-[var(--color-neutral-600)] bg-[var(--color-neutral-800)]',
          className
        )}
      >
        <div className='text-center'>
          <p className='mb-2 text-[var(--color-neutral-400)]'>
            No suggestion history yet
          </p>
          <p className='text-sm text-[var(--color-neutral-500)]'>
            Suggestions will appear here after you receive them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-[var(--color-neutral-300)]'>
          Suggestion History
        </h3>
        <button
          onClick={handleClearHistory}
          className='flex items-center gap-1 rounded px-3 py-1.5 text-sm text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-red-600 hover:text-white'
        >
          <IconTrash size={16} />
          Clear History
        </button>
      </div>

      {/* Stats */}
      <div className='flex flex-wrap gap-2'>
        {Object.entries(typeStats).map(([type, count]) => (
          <span
            key={type}
            className='rounded-full bg-[var(--color-neutral-700)] px-3 py-1 text-xs text-[var(--color-neutral-300)]'
          >
            {type}: {count}
          </span>
        ))}
      </div>

      {/* Search and Filter */}
      <div className='flex gap-3'>
        <div className='relative flex-1'>
          <IconSearch className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]' />
          <input
            type='text'
            placeholder='Search suggestions...'
            value={searchQuery}
            onChange={handleSearchChange}
            className='w-full rounded-lg border border-[var(--color-neutral-600)] bg-[var(--color-neutral-800)] py-2 pr-4 pl-10 text-[var(--color-neutral-200)] placeholder-[var(--color-neutral-500)] focus:border-[var(--color-neutral-500)] focus:outline-none'
          />
        </div>

        <div className='relative'>
          <IconFilter className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]' />
          <select
            value={filterType}
            onChange={handleFilterChange}
            className='rounded-lg border border-[var(--color-neutral-600)] bg-[var(--color-neutral-800)] py-2 pr-8 pl-10 text-[var(--color-neutral-200)] focus:border-[var(--color-neutral-500)] focus:outline-none'
          >
            <option value='all'>All Types</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type
                  .replace('_', ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className='text-sm text-[var(--color-neutral-400)]'>
        Showing {startIndex + 1}-
        {Math.min(endIndex, filteredSuggestions.length)} of{' '}
        {filteredSuggestions.length} suggestions
      </div>

      {/* Suggestions List */}
      <div className='space-y-3'>
        {paginatedSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onCopy={onCopySuggestion}
            onShare={onShareSuggestion}
            onRate={onRateSuggestion}
            onDelete={onDeleteSuggestion}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2'>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className='rounded p-2 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)] disabled:cursor-not-allowed disabled:opacity-50'
          >
            <IconChevronLeft size={20} />
          </button>

          <div className='flex gap-1'>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={cn(
                  'rounded px-3 py-1 text-sm transition-colors duration-200',
                  page === currentPage
                    ? 'bg-[var(--color-neutral-600)] text-[var(--color-neutral-200)]'
                    : 'text-[var(--color-neutral-400)] hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)]'
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className='rounded p-2 text-[var(--color-neutral-400)] transition-colors duration-200 hover:bg-[var(--color-neutral-700)] hover:text-[var(--color-neutral-300)] disabled:cursor-not-allowed disabled:opacity-50'
          >
            <IconChevronRight size={20} />
          </button>
        </div>
      )}

      {/* No Results */}
      {filteredSuggestions.length === 0 && (
        <div className='flex h-32 items-center justify-center rounded-lg border border-[var(--color-neutral-600)] bg-[var(--color-neutral-800)]'>
          <div className='text-center'>
            <p className='mb-1 text-[var(--color-neutral-400)]'>
              No suggestions found
            </p>
            <p className='text-sm text-[var(--color-neutral-500)]'>
              Try adjusting your search or filter criteria
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionHistory;
