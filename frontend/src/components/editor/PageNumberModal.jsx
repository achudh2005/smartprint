import { useState } from 'react';
import { X, Check, Hash } from 'lucide-react';
import { Button, MacTrafficLights } from '../ui';

export default function PageNumberModal({ isOpen, onClose, pageNumbering, onSavePageNumbering }) {
  if (!isOpen) return null;

  const [enabled, setEnabled] = useState(pageNumbering?.enabled ?? true);
  const [position, setPosition] = useState(pageNumbering?.position || 'BOTTOM_CENTER');
  const [format, setFormat] = useState(pageNumbering?.format || 'X_OF_Y');
  const [startNumber, setStartNumber] = useState(pageNumbering?.startNumber || 1);

  const handleApply = () => {
    onSavePageNumbering({
      enabled,
      position,
      format,
      startNumber: parseInt(startNumber, 10) || 1,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="mac-sheet rounded-2xl w-full max-w-sm overflow-hidden flex flex-col animate-scaleIn select-none">
        {/* macOS Sheet Titlebar with Traffic Lights */}
        <div className="px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MacTrafficLights size="sm" onClose={onClose} />
            <div className="h-3 w-px bg-black/[0.1] dark:bg-white/[0.1] mx-0.5" />
            <div className="flex items-center gap-1.5">
              <Hash size={14} strokeWidth={2} className="text-[#0E7490]" />
              <h3 className="font-semibold text-xs text-[var(--text)]">Page Numbering</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text)]">Enable Page Numbers</label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="toggle"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
            >
              <option value="X_OF_Y">Page 1 of 5</option>
              <option value="NUMBER_ONLY">1, 2, 3...</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Position</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
            >
              <option value="BOTTOM_CENTER">Bottom Center</option>
              <option value="BOTTOM_RIGHT">Bottom Right</option>
              <option value="BOTTOM_LEFT">Bottom Left</option>
              <option value="TOP_CENTER">Top Center</option>
              <option value="TOP_RIGHT">Top Right</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Start at Page Number</label>
            <input
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
              className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-black/[0.08] dark:border-white/[0.08] flex justify-end gap-2 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="mac-button-secondary px-3.5 py-1.5 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="mac-button-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
          >
            <Check size={13} strokeWidth={2} /> Apply Numbers
          </button>
        </div>
      </div>
    </div>
  );
}
