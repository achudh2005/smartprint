import { useRef } from 'react';
import { Image, PenTool, Hash, ShieldAlert } from 'lucide-react';

export default function InsertMenu({
  onInsertImageFile,
  onOpenSignatureModal,
  onOpenPageNumberModal,
  onOpenWatermarkModal,
  hasWatermark,
  hasPageNumbers,
}) {
  const imageInputRef = useRef(null);

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onInsertImageFile(event.target.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2 flex-wrap py-1 text-xs">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Insert Image */}
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        className="px-3 py-1.5 rounded-lg border border-[var(--border)] font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-colors"
      >
        <Image size={13} strokeWidth={1.75} className="text-[#0E7490]" />
        <span>Insert Image</span>
      </button>

      {/* Insert Signature */}
      <button
        type="button"
        onClick={onOpenSignatureModal}
        className="px-3 py-1.5 rounded-lg border border-[var(--border)] font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-colors"
      >
        <PenTool size={13} strokeWidth={1.75} className="text-[#0E7490]" />
        <span>Add Signature</span>
      </button>

      {/* Page Numbers */}
      <button
        type="button"
        onClick={onOpenPageNumberModal}
        className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
          hasPageNumbers
            ? 'bg-[var(--accent-tint)] border-[#0E7490] text-[#0E7490] dark:text-[#22D3EE]'
            : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
        }`}
      >
        <Hash size={13} strokeWidth={1.75} />
        <span>Page Numbers {hasPageNumbers ? '✓' : ''}</span>
      </button>

      {/* Watermark */}
      <button
        type="button"
        onClick={onOpenWatermarkModal}
        className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
          hasWatermark
            ? 'bg-[var(--accent-tint)] border-[#0E7490] text-[#0E7490] dark:text-[#22D3EE]'
            : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
        }`}
      >
        <ShieldAlert size={13} strokeWidth={1.75} />
        <span>Watermark {hasWatermark ? '✓' : ''}</span>
      </button>
    </div>
  );
}
