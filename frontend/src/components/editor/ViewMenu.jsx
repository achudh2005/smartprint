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
    <div className="flex items-center gap-2 flex-wrap py-0.5 select-none text-xs">
      {/* Zoom controls (macOS Segmented Capsule) */}
      <div className="mac-segmented-track p-0.5">
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.15))}
          className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={13} strokeWidth={2} />
        </button>
        <span className="text-xs font-semibold text-[var(--text)] px-2 tabular-nums select-none min-w-[46px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(3.0, zoom + 0.15))}
          className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Fit buttons */}
      <div className="flex items-center gap-1 border-r border-black/[0.08] dark:border-white/[0.08] pr-2">
        <button
          type="button"
          onClick={() => onZoomChange(1.0)}
          className="mac-button-secondary px-2.5 py-1 text-xs flex items-center gap-1"
        >
          <Maximize2 size={11} strokeWidth={2} /> 100%
        </button>
        <button
          type="button"
          onClick={() => onZoomChange(1.25)}
          className="mac-button-secondary px-2.5 py-1 text-xs flex items-center gap-1"
        >
          <Minimize2 size={11} strokeWidth={2} /> Fit Width
        </button>
      </div>

      {/* Thumbnails Sidebar toggle */}
      <button
        type="button"
        onClick={onToggleThumbnails}
        className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
          showThumbnails
            ? 'mac-button-primary'
            : 'mac-button-secondary'
        }`}
      >
        <LayoutGrid size={12} strokeWidth={2} />
        <span>Thumbnails</span>
      </button>

      {/* Search in Document */}
      <button
        type="button"
        onClick={onToggleSearch}
        className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
          showSearch
            ? 'mac-button-primary'
            : 'mac-button-secondary'
        }`}
      >
        <Search size={12} strokeWidth={2} />
        <span>Find Text</span>
      </button>

      {/* Canvas Theme Toggle */}
      <button
        type="button"
        onClick={onCanvasThemeToggle}
        className="mac-button-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 ml-auto"
        title="Toggle canvas background theme"
      >
        {canvasTheme === 'dark' ? <Sun size={12} strokeWidth={2} /> : <Moon size={12} strokeWidth={2} />}
        <span>{canvasTheme === 'dark' ? 'Light Canvas' : 'Dark Canvas'}</span>
      </button>
    </div>
  );
}
