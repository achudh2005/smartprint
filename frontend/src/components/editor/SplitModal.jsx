import { useState } from 'react';
import { X, Scissors, Check } from 'lucide-react';
import { Button } from '../ui';

export default function SplitModal({ isOpen, onClose, totalPages, onExtractPages }) {
  if (!isOpen) return null;

  const [rangeInput, setRangeInput] = useState(`1-${Math.min(totalPages, 3)}`);
  const [splitAction, setSplitAction] = useState('SAVE_AS_NEW'); // 'SAVE_AS_NEW' | 'DOWNLOAD'
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!rangeInput.trim()) return;
    setLoading(true);
    try {
      await onExtractPages(rangeInput.trim(), splitAction);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors size={16} strokeWidth={2} className="text-[#0E7490]" />
            <h3 className="font-display font-bold text-sm text-[var(--text)]">Extract & Split Pages</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text)] block mb-1">
              Select Page Range (Total Pages: {totalPages})
            </label>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g. 1-3, 5"
              className="input text-xs font-medium bg-[var(--surface)] text-[var(--text)]"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Specify comma-separated pages or ranges (e.g. 1-2, 4).
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Export Destination</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text)] cursor-pointer">
                <input
                  type="radio"
                  name="splitAction"
                  checked={splitAction === 'SAVE_AS_NEW'}
                  onChange={() => setSplitAction('SAVE_AS_NEW')}
                />
                <span>Attach to this order as a new file (inherit permissions)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text)] cursor-pointer">
                <input
                  type="radio"
                  name="splitAction"
                  checked={splitAction === 'DOWNLOAD'}
                  onChange={() => setSplitAction('DOWNLOAD')}
                />
                <span>Download extracted range directly</span>
              </label>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--surface-hover)]">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} loading={loading}>
            <Check size={13} strokeWidth={2} /> Extract Pages
          </Button>
        </div>
      </div>
    </div>
  );
}
