import { useState } from 'react';
import { X, Crop, Check } from 'lucide-react';
import { Button } from '../ui';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crop size={16} strokeWidth={2} className="text-[#0E7490]" />
            <h3 className="font-display font-bold text-sm text-[var(--text)]">Crop Margins</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-[var(--text-muted)]">
            Trim margins from page borders (in points/pixels):
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Top Margin</label>
              <input
                type="number"
                min="0"
                value={top}
                onChange={(e) => setTop(e.target.value)}
                className="input text-xs bg-[var(--surface)] text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Bottom Margin</label>
              <input
                type="number"
                min="0"
                value={bottom}
                onChange={(e) => setBottom(e.target.value)}
                className="input text-xs bg-[var(--surface)] text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Left Margin</label>
              <input
                type="number"
                min="0"
                value={left}
                onChange={(e) => setLeft(e.target.value)}
                className="input text-xs bg-[var(--surface)] text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Right Margin</label>
              <input
                type="number"
                min="0"
                value={right}
                onChange={(e) => setRight(e.target.value)}
                className="input text-xs bg-[var(--surface)] text-[var(--text)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <label className="text-xs font-medium text-[var(--text)]">Apply to all pages</label>
            <input
              type="checkbox"
              checked={applyAll}
              onChange={(e) => setApplyAll(e.target.checked)}
              className="toggle"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--surface-hover)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            <Check size={13} strokeWidth={2} /> Apply Crop
          </Button>
        </div>
      </div>
    </div>
  );
}
