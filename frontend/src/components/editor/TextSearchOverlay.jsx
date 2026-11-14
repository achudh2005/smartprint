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
    <div className="absolute top-3 right-5 z-40 mac-sheet rounded-xl shadow-xl px-3 py-1.5 flex items-center gap-2 select-none">
      <Search size={13} className="text-[var(--text-muted)] ml-0.5" strokeWidth={2} />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Find in document..."
        className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-xs py-1 px-2.5 w-44 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
        autoFocus
      />

      <span className="text-[11px] text-[var(--text-muted)] tabular-nums px-1 font-medium">
        {matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : 'No matches'}
      </span>

      <div className="flex items-center gap-0.5 border-l border-black/[0.08] dark:border-white/[0.08] pl-1.5">
        <button
          type="button"
          onClick={onPrevMatch}
          disabled={matchCount === 0}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
          title="Previous match"
        >
          <ChevronUp size={13} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onNextMatch}
          disabled={matchCount === 0}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
          title="Next match"
        >
          <ChevronDown size={13} strokeWidth={2} />
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}
