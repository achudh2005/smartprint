import { useState } from 'react';
import { X, Layers, Upload, Check, FileText } from 'lucide-react';
import { Button, MacTrafficLights } from '../ui';
import toast from 'react-hot-toast';

export default function MergePdfModal({ isOpen, onClose, currentPage, onMergePdf }) {
  if (!isOpen) return null;

  const [selectedFile, setSelectedFile] = useState(null);
  const [insertPosition, setInsertPosition] = useState('AFTER_CURRENT'); // 'AFTER_CURRENT' | 'BEFORE_CURRENT' | 'AT_END'
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        toast.error('Please select a valid PDF file to merge.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleConfirm = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file first.');
      return;
    }
    setLoading(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const res = await onMergePdf(buffer, insertPosition);
      const count = res?.insertedCount ? `${res.insertedCount} page(s)` : 'pages';
      toast.success(`Merged ${count} from ${selectedFile.name}`);
      onClose();
    } catch (err) {
      console.error('Merge PDF error:', err);
      toast.error('Failed to merge PDF: ' + (err.message || 'Invalid or unreadable PDF'));
    } finally {
      setLoading(false);
    }
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
              <Layers size={14} strokeWidth={2} className="text-[#0E7490]" />
              <h3 className="font-semibold text-xs text-[var(--text)]">Insert Pages from PDF</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
              Select PDF to Merge
            </label>
            <div className="border border-dashed border-black/20 dark:border-white/20 hover:border-[#0E7490] dark:hover:border-[#22D3EE] rounded-xl p-5 text-center bg-black/[0.02] dark:bg-white/[0.03] transition-all">
              <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center mx-auto mb-2 text-[#0E7490]">
                <Upload size={17} strokeWidth={2} />
              </div>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="text-xs text-[var(--text-muted)] w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0E7490] file:text-white hover:file:bg-[#155E75] cursor-pointer"
              />
              {selectedFile ? (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  <FileText size={13} strokeWidth={2} />
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-[10px] opacity-75 font-normal">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                  Choose a PDF document to insert
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
              Insertion Position
            </label>
            <select
              value={insertPosition}
              onChange={(e) => setInsertPosition(e.target.value)}
              className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
            >
              <option value="AFTER_CURRENT">After current page (Page {currentPage})</option>
              <option value="BEFORE_CURRENT">Before current page (Page {currentPage})</option>
              <option value="AT_END">At the very end of document</option>
            </select>
          </div>
        </div>

        {/* macOS Sheet Footer */}
        <div className="px-4 py-3 border-t border-black/[0.08] dark:border-white/[0.08] flex justify-end gap-2 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="mac-button-secondary px-3.5 py-1.5 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !selectedFile}
            className="mac-button-primary px-4 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check size={13} strokeWidth={2} />
            <span>{loading ? 'Merging...' : 'Insert & Merge'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

