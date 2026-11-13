import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function TextSearchOverlay({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-3 right-5 z-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-2 flex items-center gap-2">
      <Search size={14} className="text-[var(--text-muted)] ml-1" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Find in document..."
        className="input text-xs py-1 px-2 min-h-[30px] w-48 bg-[var(--surface)] text-[var(--text)]"
        autoFocus
      />

      <span className="text-[11px] text-[var(--text-muted)] tabular-nums px-1">
        {matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : 'No matches'}
      </span>

      <div className="flex items-center gap-0.5 border-l border-[var(--border)] pl-1">
        <button
          type="button"
          onClick={onPrevMatch}
          disabled={matchCount === 0}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40"
          title="Previous match"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={onNextMatch}
          disabled={matchCount === 0}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40"
          title="Next match"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}
