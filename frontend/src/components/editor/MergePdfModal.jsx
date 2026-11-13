import { useState } from 'react';
import { X, Layers, Upload, Check } from 'lucide-react';
import { Button } from '../ui';
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} strokeWidth={2} className="text-[#0E7490]" />
            <h3 className="font-display font-bold text-sm text-[var(--text)]">Insert Pages from PDF</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text)] block mb-1">Select PDF to Merge</label>
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center bg-[var(--surface-hover)]">
              <Upload size={20} className="mx-auto text-[var(--text-muted)] mb-1" />
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="text-xs text-[var(--text-muted)] w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0E7490] file:text-white hover:file:bg-[#155E75]"
              />
              {selectedFile && (
                <p className="text-xs font-semibold text-emerald-600 mt-2 truncate">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Insertion Position</label>
            <select
              value={insertPosition}
              onChange={(e) => setInsertPosition(e.target.value)}
              className="input text-xs bg-[var(--surface)] text-[var(--text)]"
            >
              <option value="AFTER_CURRENT">After current page (Page {currentPage})</option>
              <option value="BEFORE_CURRENT">Before current page (Page {currentPage})</option>
              <option value="AT_END">At the very end of document</option>
            </select>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--surface-hover)]">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} loading={loading} disabled={!selectedFile}>
            <Check size={13} strokeWidth={2} /> Insert & Merge
          </Button>
        </div>
      </div>
    </div>
  );
}
