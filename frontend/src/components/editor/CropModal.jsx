import { useState } from 'react';
import { X, Crop, Check } from 'lucide-react';
import { Button, MacTrafficLights } from '../ui';

export default function CropModal({ isOpen, onClose, currentPage, onApplyCrop }) {
  if (!isOpen) return null;

  const [top, setTop] = useState(20);
  const [bottom, setBottom] = useState(20);
  const [left, setLeft] = useState(20);
  const [right, setRight] = useState(20);
  const [applyAll, setApplyAll] = useState(false);

  const handleApply = () => {
    onApplyCrop({
      top: parseInt(top, 10) || 0,
      bottom: parseInt(bottom, 10) || 0,
      left: parseInt(left, 10) || 0,
      right: parseInt(right, 10) || 0,
      applyAll,
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
              <Crop size={14} strokeWidth={2} className="text-[#0E7490]" />
              <h3 className="font-semibold text-xs text-[var(--text)]">Crop Margins</h3>
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
          <p className="text-[11px] text-[var(--text-muted)]">
            Trim margins from page borders (in points/pixels):
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Top Margin</label>
              <input
                type="number"
                min="0"
                value={top}
                onChange={(e) => setTop(e.target.value)}
                className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Bottom Margin</label>
              <input
                type="number"
                min="0"
                value={bottom}
                onChange={(e) => setBottom(e.target.value)}
                className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Left Margin</label>
              <input
                type="number"
                min="0"
                value={left}
                onChange={(e) => setLeft(e.target.value)}
                className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Right Margin</label>
              <input
                type="number"
                min="0"
                value={right}
                onChange={(e) => setRight(e.target.value)}
                className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-black/[0.08] dark:border-white/[0.08]">
            <label className="text-xs font-medium text-[var(--text)]">Apply to all pages</label>
            <input
              type="checkbox"
              checked={applyAll}
              onChange={(e) => setApplyAll(e.target.checked)}
              className="toggle"
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
            <Check size={13} strokeWidth={2} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
