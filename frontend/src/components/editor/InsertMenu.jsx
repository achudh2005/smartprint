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
    <div className="flex items-center gap-1.5 flex-wrap py-0.5 text-xs select-none">
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
        className="mac-button-secondary px-2.5 py-1 text-xs font-medium flex items-center gap-1.5"
      >
        <Image size={12} strokeWidth={2} className="text-[#0E7490]" />
        <span>Insert Image</span>
      </button>

      {/* Insert Signature */}
      <button
        type="button"
        onClick={onOpenSignatureModal}
        className="mac-button-secondary px-2.5 py-1 text-xs font-medium flex items-center gap-1.5"
      >
        <PenTool size={12} strokeWidth={2} className="text-[#0E7490]" />
        <span>Add Signature</span>
      </button>

      {/* Page Numbers */}
      <button
        type="button"
        onClick={onOpenPageNumberModal}
        className={`px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 transition-all ${
          hasPageNumbers
            ? 'mac-button-primary'
            : 'mac-button-secondary'
        }`}
      >
        <Hash size={12} strokeWidth={2} />
        <span>Page Numbers {hasPageNumbers ? '✓' : ''}</span>
      </button>

      {/* Watermark */}
      <button
        type="button"
        onClick={onOpenWatermarkModal}
        className={`px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 transition-all ${
          hasWatermark
            ? 'mac-button-primary'
            : 'mac-button-secondary'
        }`}
      >
        <ShieldAlert size={12} strokeWidth={2} />
        <span>Watermark {hasWatermark ? '✓' : ''}</span>
      </button>
    </div>
  );
}
