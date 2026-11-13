import { useState } from 'react';
import { X, Check, ShieldAlert } from 'lucide-react';
import { Button } from '../ui';

export default function WatermarkModal({ isOpen, onClose, watermark, onSaveWatermark }) {
  if (!isOpen) return null;

  const [enabled, setEnabled] = useState(watermark?.enabled ?? true);
  const [text, setText] = useState(watermark?.text || 'CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(watermark?.fontSize || 48);
  const [opacity, setOpacity] = useState(watermark?.opacity ?? 0.2);
  const [angle, setAngle] = useState(watermark?.angle || -45);
  const [color, setColor] = useState(watermark?.color || '#94A3B8');

  const presets = ['CONFIDENTIAL', 'DRAFT', 'PAID', 'APPROVED', 'VOID', 'SAMPLE', 'DO NOT COPY'];

  const handleApply = () => {
    onSaveWatermark({
      enabled,
      text: text.trim(),
      fontSize,
      opacity,
      angle,
      color,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} strokeWidth={2} className="text-[#0E7490]" />
            <h3 className="font-display font-bold text-sm text-[var(--text)]">Document Watermark</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text)]">Enable Watermark across all pages</label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="toggle"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Watermark Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. CONFIDENTIAL"
              className="input text-xs font-bold uppercase tracking-wider bg-[var(--surface)] text-[var(--text)]"
            />
            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setText(p)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    text === p
                      ? 'bg-[#0E7490] text-white border-[#0E7490]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity slider */}
          <div>
            <div className="flex justify-between text-xs font-medium text-[var(--text-muted)] mb-1">
              <span>Opacity</span>
              <span className="tabular-nums font-semibold text-[var(--text)]">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-[#0E7490]"
            />
          </div>

          {/* Angle & Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Rotation Angle</label>
              <select
                value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value, 10))}
                className="input text-xs bg-[var(--surface)] text-[var(--text)]"
              >
                <option value={-45}>-45° (Diagonal)</option>
                <option value={0}>0° (Horizontal)</option>
                <option value={45}>45° (Reverse Diagonal)</option>
                <option value={-90}>-90° (Vertical)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="input text-xs bg-[var(--surface)] text-[var(--text)]"
              >
                <option value={32}>Small (32pt)</option>
                <option value={48}>Medium (48pt)</option>
                <option value={64}>Large (64pt)</option>
                <option value={80}>Extra Large (80pt)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--surface-hover)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            <Check size={13} strokeWidth={2} /> Apply Watermark
          </Button>
        </div>
      </div>
    </div>
  );
}
