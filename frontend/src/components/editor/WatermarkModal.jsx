import { useState } from 'react';
import { X, Check, ShieldAlert } from 'lucide-react';
import { Button, MacTrafficLights } from '../ui';

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
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="mac-sheet rounded-2xl w-full max-w-md overflow-hidden flex flex-col animate-scaleIn select-none">
        {/* macOS Sheet Titlebar with Traffic Lights */}
        <div className="px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MacTrafficLights size="sm" onClose={onClose} />
            <div className="h-3 w-px bg-black/[0.1] dark:bg-white/[0.1] mx-0.5" />
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} strokeWidth={2} className="text-[#0E7490]" />
              <h3 className="font-semibold text-xs text-[var(--text)]">Document Watermark</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X size={14} strokeWidth={2} />
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
            <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Watermark Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
              placeholder="e.g. CONFIDENTIAL"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1 mt-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setText(preset)}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.08] transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Opacity: {Math.round(opacity * 100)}%</label>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Rotation Angle: {angle}°</label>
              <input
                type="range"
                min="-90"
                max="90"
                step="5"
                value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-black/10 dark:border-white/10 cursor-pointer"
                />
                <span className="text-xs font-mono text-[var(--text-muted)]">{color}</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
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
            <Check size={13} strokeWidth={2} /> Apply Watermark
          </button>
        </div>
      </div>
    </div>
  );
}
