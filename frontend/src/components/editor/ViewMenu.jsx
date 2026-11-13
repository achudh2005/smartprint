import { ZoomIn, ZoomOut, Maximize2, Minimize2, Search, Sun, Moon, LayoutGrid } from 'lucide-react';

export default function ViewMenu({
  zoom,
  onZoomChange,
  canvasTheme,
  onCanvasThemeToggle,
  showSearch,
  onToggleSearch,
  showThumbnails,
  onToggleThumbnails,
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap py-1">
      {/* Zoom controls */}
      <div className="flex items-center bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.15))}
          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={14} strokeWidth={2} />
        </button>
        <span className="text-xs font-semibold text-[var(--text)] px-2 tabular-nums select-none min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(3.0, zoom + 0.15))}
          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Fit buttons */}
      <div className="flex items-center gap-1 border-r border-[var(--border)] pr-2">
        <button
          type="button"
          onClick={() => onZoomChange(1.0)}
          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1"
        >
          <Maximize2 size={12} strokeWidth={2} /> 100%
        </button>
        <button
          type="button"
          onClick={() => onZoomChange(1.25)}
          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1"
        >
          <Minimize2 size={12} strokeWidth={2} /> Fit Width
        </button>
      </div>

      {/* Thumbnails Sidebar toggle */}
      <button
        type="button"
        onClick={onToggleThumbnails}
        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
          showThumbnails
            ? 'bg-[var(--accent-tint)] border-[#0E7490] text-[#0E7490] dark:text-[#22D3EE]'
            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
        }`}
      >
        <LayoutGrid size={13} strokeWidth={1.75} />
        <span>Thumbnails</span>
      </button>

      {/* Search in Document */}
      <button
        type="button"
        onClick={onToggleSearch}
        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
          showSearch
            ? 'bg-[var(--accent-tint)] border-[#0E7490] text-[#0E7490] dark:text-[#22D3EE]'
            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
        }`}
      >
        <Search size={13} strokeWidth={1.75} />
        <span>Find Text</span>
      </button>

      {/* Canvas Theme Toggle */}
      <button
        type="button"
        onClick={onCanvasThemeToggle}
        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1.5 ml-auto"
        title="Toggle canvas background theme"
      >
        {canvasTheme === 'dark' ? <Sun size={13} strokeWidth={2} /> : <Moon size={13} strokeWidth={2} />}
        <span>{canvasTheme === 'dark' ? 'Light Canvas' : 'Dark Canvas'}</span>
      </button>
    </div>
  );
}
