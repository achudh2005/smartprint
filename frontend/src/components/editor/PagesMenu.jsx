import {
  FilePlus, Layers, Copy, Trash2, RotateCw, RotateCcw,
  Crop, Scissors, RefreshCw
} from 'lucide-react';

export default function PagesMenu({
  currentPage,
  totalPages,
  onInsertBlankPage,
  onOpenMergeModal,
  onDuplicatePage,
  onDeleteCurrentPage,
  onRotatePage,
  onRotateAllPages,
  onOpenCropModal,
  onOpenSplitModal,
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap py-1 text-xs">
      {/* Insert & Merge */}
      <div className="flex items-center gap-1 border-r border-[var(--border)] pr-2">
        <button
          type="button"
          onClick={onInsertBlankPage}
          className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-colors"
          title="Insert a blank page after the current page"
        >
          <FilePlus size={13} strokeWidth={1.75} className="text-[#0E7490]" />
          <span>Insert Blank</span>
        </button>

        <button
          type="button"
          onClick={onOpenMergeModal}
          className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-colors"
          title="Merge and append pages from another PDF"
        >
          <Layers size={13} strokeWidth={1.75} className="text-[#0E7490]" />
          <span>Merge PDF</span>
        </button>
      </div>

      {/* Duplicate & Delete */}
      <div className="flex items-center gap-1 border-r border-[var(--border)] pr-2">
        <button
          type="button"
          onClick={onDuplicatePage}
          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
          title="Duplicate current page"
        >
          <Copy size={13} strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={onDeleteCurrentPage}
          disabled={totalPages <= 1}
          className="p-1.5 rounded-lg border border-[var(--border)] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Delete current page"
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>

      {/* Rotation */}
      <div className="flex items-center gap-1 border-r border-[var(--border)] pr-2">
        <button
          type="button"
          onClick={() => onRotatePage(90)}
          className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)] flex items-center gap-1"
          title="Rotate current page 90° clockwise"
        >
          <RotateCw size={13} strokeWidth={1.75} />
          <span>Rotate 90°</span>
        </button>

        <button
          type="button"
          onClick={() => onRotatePage(-90)}
          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
          title="Rotate current page 90° counter-clockwise"
        >
          <RotateCcw size={13} strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={() => onRotateAllPages(90)}
          className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
          title="Rotate all pages 90° clockwise"
        >
          <span>All 90°</span>
        </button>
      </div>

      {/* Crop Margins */}
      <button
        type="button"
        onClick={onOpenCropModal}
        className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-colors"
        title="Crop page margins"
      >
        <Crop size={13} strokeWidth={1.75} />
        <span>Crop</span>
      </button>

      {/* Extract / Split */}
      <button
        type="button"
        onClick={onOpenSplitModal}
        className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-colors"
        title="Extract chosen page range into a new order document"
      >
        <Scissors size={13} strokeWidth={1.75} className="text-[#0E7490]" />
        <span>Extract Range</span>
      </button>

      <span className="text-[11px] text-[var(--text-muted)] ml-auto tabular-nums">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}
