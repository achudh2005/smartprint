import { useState } from 'react';
import { X, Check, Hash } from 'lucide-react';
import { Button } from '../ui';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={16} strokeWidth={2} className="text-[#0E7490]" />
            <h3 className="font-display font-bold text-sm text-[var(--text)]">Page Numbering</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={16} strokeWidth={2} />
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
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="input text-xs bg-[var(--surface)] text-[var(--text)]"
            >
              <option value="X_OF_Y">Page 1 of 5</option>
              <option value="NUMBER_ONLY">1, 2, 3...</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Position</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="input text-xs bg-[var(--surface)] text-[var(--text)]"
            >
              <option value="BOTTOM_CENTER">Bottom Center</option>
              <option value="BOTTOM_RIGHT">Bottom Right</option>
              <option value="BOTTOM_LEFT">Bottom Left</option>
              <option value="TOP_CENTER">Top Center</option>
              <option value="TOP_RIGHT">Top Right</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Start at Page Number</label>
            <input
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
              className="input text-xs bg-[var(--surface)] text-[var(--text)]"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--surface-hover)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            <Check size={13} strokeWidth={2} /> Apply Numbers
          </Button>
        </div>
      </div>
    </div>
  );
}
