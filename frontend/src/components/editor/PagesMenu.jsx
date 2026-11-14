import {
  FilePlus, Layers, Copy, Trash2, RotateCw, RotateCcw,
  Crop, Scissors
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
    <div className="flex items-center gap-1.5 flex-wrap py-0.5 text-xs select-none">
      {/* Insert & Merge */}
      <div className="flex items-center gap-1 border-r border-black/[0.08] dark:border-white/[0.08] pr-2">
        <button
          type="button"
          onClick={onInsertBlankPage}
          className="mac-button-secondary px-2.5 py-1 text-xs font-medium flex items-center gap-1.5"
          title="Insert a blank page after the current page"
        >
          <FilePlus size={12} strokeWidth={2} className="text-[#0E7490]" />
          <span>Insert Blank</span>
        </button>

        <button
          type="button"
          onClick={onOpenMergeModal}
          className="mac-button-secondary px-2.5 py-1 text-xs font-medium flex items-center gap-1.5"
          title="Merge and append pages from another PDF"
        >
          <Layers size={12} strokeWidth={2} className="text-[#0E7490]" />
          <span>Merge PDF</span>
        </button>
      </div>

      {/* Duplicate & Delete */}
      <div className="flex items-center gap-1 border-r border-black/[0.08] dark:border-white/[0.08] pr-2">
        <button
          type="button"
          onClick={onDuplicatePage}
          className="mac-button-secondary p-1 text-xs"
          title="Duplicate current page"
        >
          <Copy size={12} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onDeleteCurrentPage}
          disabled={totalPages <= 1}
          className="mac-button-secondary p-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-30"
          title="Delete current page"
        >
          <Trash2 size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Rotation */}
      <div className="flex items-center gap-1 border-r border-black/[0.08] dark:border-white/[0.08] pr-2">
        <button
          type="button"
          onClick={() => onRotatePage(90)}
          className="mac-button-secondary px-2 py-1 text-xs flex items-center gap-1"
          title="Rotate current page 90° clockwise"
        >
          <RotateCw size={12} strokeWidth={2} />
          <span>Rotate 90°</span>
        </button>

        <button
          type="button"
          onClick={() => onRotatePage(-90)}
          className="mac-button-secondary p-1 text-xs"
          title="Rotate current page 90° counter-clockwise"
        >
          <RotateCcw size={12} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => onRotateAllPages(90)}
          className="mac-button-secondary px-2 py-1 text-xs"
          title="Rotate all pages 90° clockwise"
        >
          <span>All 90°</span>
        </button>
      </div>

      {/* Crop Margins */}
      <button
        type="button"
        onClick={onOpenCropModal}
        className="mac-button-secondary px-2.5 py-1 text-xs flex items-center gap-1.5"
        title="Crop page margins"
      >
        <Crop size={12} strokeWidth={2} />
        <span>Crop</span>
      </button>

      {/* Extract / Split */}
      <button
        type="button"
        onClick={onOpenSplitModal}
        className="mac-button-secondary px-2.5 py-1 text-xs flex items-center gap-1.5"
        title="Extract chosen page range into a new order document"
      >
        <Scissors size={12} strokeWidth={2} className="text-[#0E7490]" />
        <span>Extract Range</span>
      </button>

      <span className="text-[11px] text-[var(--text-muted)] ml-auto tabular-nums font-medium">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}
