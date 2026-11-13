import { useState, useEffect, useRef } from 'react';
import { Copy, Trash2, RotateCw, GripVertical } from 'lucide-react';
import { renderPdfThumbnail } from './pdfEngine';

function PageThumbnailItem({
  pageNum,
  isActive,
  pdfBytes,
  totalPages,
  rotation = 0,
  onSelectPage,
  onDragStart,
  onDragOver,
  onDrop,
  onRotatePage,
  onDuplicatePage,
  onDeletePage,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [inView, setInView] = useState(pageNum <= 3);

  // Lazy render: Observe visibility so 50+ page PDFs don't thrash the worker all at once
  useEffect(() => {
    if (inView) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  useEffect(() => {
    let active = true;
    if (!inView || !pdfBytes || !canvasRef.current || rendered) return;

    renderPdfThumbnail(pdfBytes, pageNum, canvasRef.current)
      .then((ok) => {
        if (active && ok) setRendered(true);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [inView, pdfBytes, pageNum, rendered]);

  return (
    <div
      ref={containerRef}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onSelectPage(pageNum)}
      className={`group relative rounded-xl border-2 transition-all p-2 flex flex-col items-center cursor-pointer ${
        isActive
          ? 'border-[#0E7490] bg-[var(--surface-hover)] shadow-xs'
          : 'border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--bg)]'
      }`}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 left-2 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <GripVertical size={13} />
      </div>

      {/* Page Aspect Representation Box */}
      <div
        className="w-24 h-32 bg-white dark:bg-slate-900 border border-[var(--border)] rounded-md shadow-xs flex items-center justify-center relative overflow-hidden mb-1.5 transition-transform duration-200"
        style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
      >
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-contain ${rendered ? 'block' : 'hidden'}`}
        />
        {!rendered && (
          <span className="text-xs font-display font-bold text-[var(--text-muted)] opacity-30 select-none">
            P.{pageNum}
          </span>
        )}

        {/* Quick actions on hover */}
        <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 backdrop-blur-xs py-1 px-1.5 flex items-center justify-around opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotatePage(pageNum, 90);
            }}
            className="p-1 text-slate-300 hover:text-white"
            title="Rotate 90°"
          >
            <RotateCw size={11} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicatePage(pageNum);
            }}
            className="p-1 text-slate-300 hover:text-white"
            title="Duplicate"
          >
            <Copy size={11} />
          </button>
          {totalPages > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePage(pageNum);
              }}
              className="p-1 text-rose-400 hover:text-rose-300"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      <span
        className={`text-[11px] font-semibold tabular-nums ${
          isActive ? 'text-[#0E7490] dark:text-[#22D3EE]' : 'text-[var(--text-muted)]'
        }`}
      >
        Page {pageNum}
      </span>
    </div>
  );
}

export default function PageThumbnailsSidebar({
  totalPages,
  currentPage,
  pdfBytes,
  rotations = {},
  onSelectPage,
  onReorderPages,
  onDuplicatePage,
  onDeletePage,
  onRotatePage,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || dropIndex === draggedIndex) return;
    onReorderPages(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  return (
    <aside className="w-48 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col h-full overflow-hidden shrink-0 select-none">
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
          Pages ({totalPages})
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">Drag to reorder</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Array.from({ length: totalPages }).map((_, idx) => {
          const pageNum = idx + 1;
          return (
            <PageThumbnailItem
              key={`${pageNum}_${totalPages}`}
              pageNum={pageNum}
              isActive={currentPage === pageNum}
              pdfBytes={pdfBytes}
              totalPages={totalPages}
              rotation={rotations[pageNum] || 0}
              onSelectPage={onSelectPage}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onRotatePage={onRotatePage}
              onDuplicatePage={onDuplicatePage}
              onDeletePage={onDeletePage}
            />
          );
        })}
      </div>
    </aside>
  );
}
