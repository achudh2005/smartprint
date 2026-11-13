import { Type, Edit3, Eraser, Bold, Italic } from 'lucide-react';

export default function EditTextMenu({
  activeTool,
  onSelectTool,
  textConfig,
  onTextConfigChange,
}) {
  const fontFamilies = [
    { label: 'Helvetica (Sans)', value: 'Helvetica' },
    { label: 'Times Roman (Serif)', value: 'TimesRoman' },
    { label: 'Courier (Monospace)', value: 'Courier' },
  ];

  const fontSizes = [9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48];

  const colors = [
    '#000000', '#1E293B', '#1E3A8A', '#0E7490', '#047857', '#B45309', '#DC2626'
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap py-1 text-xs">
      {/* Tool Selection Buttons */}
      <div className="flex items-center gap-1 border-r border-[var(--border)] pr-2">
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === 'MASK_AND_EDIT' ? 'SELECT' : 'MASK_AND_EDIT')}
          className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
            activeTool === 'MASK_AND_EDIT'
              ? 'bg-[#0E7490] text-white border-[#0E7490] shadow-xs'
              : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
          }`}
          title="Click any existing text on the document to replace it"
        >
          <Edit3 size={13} strokeWidth={2} />
          <span>Edit Existing Text</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool(activeTool === 'ADD_TEXT' ? 'SELECT' : 'ADD_TEXT')}
          className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
            activeTool === 'ADD_TEXT'
              ? 'bg-[#0E7490] text-white border-[#0E7490] shadow-xs'
              : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
          }`}
          title="Click anywhere to place a new text box"
        >
          <Type size={13} strokeWidth={2} />
          <span>Add New Text</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool(activeTool === 'DELETE_TEXT' ? 'SELECT' : 'DELETE_TEXT')}
          className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
            activeTool === 'DELETE_TEXT'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'border-[var(--border)] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
          }`}
          title="Click any text block to erase it with a seamless background mask"
        >
          <Eraser size={13} strokeWidth={2} />
          <span>Erase Text</span>
        </button>
      </div>

      {/* Font Family */}
      <div className="flex items-center gap-1.5">
        <select
          value={textConfig.fontFamily}
          onChange={(e) => onTextConfigChange('fontFamily', e.target.value)}
          className="input text-xs py-1 px-2 min-h-[32px] bg-[var(--surface)] text-[var(--text)]"
        >
          {fontFamilies.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="flex items-center gap-1.5">
        <select
          value={textConfig.fontSize}
          onChange={(e) => onTextConfigChange('fontSize', parseInt(e.target.value, 10))}
          className="input text-xs py-1 px-2 min-h-[32px] bg-[var(--surface)] text-[var(--text)] w-18 tabular-nums"
        >
          {fontSizes.map((s) => (
            <option key={s} value={s}>
              {s} pt
            </option>
          ))}
        </select>
      </div>

      {/* Bold & Italic */}
      <div className="flex items-center gap-1 border-r border-[var(--border)] pr-2">
        <button
          type="button"
          onClick={() => onTextConfigChange('isBold', !textConfig.isBold)}
          className={`w-7 h-7 rounded flex items-center justify-center border transition-all ${
            textConfig.isBold
              ? 'bg-[#0E7490] text-white border-[#0E7490]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
          title="Bold"
        >
          <Bold size={13} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => onTextConfigChange('isItalic', !textConfig.isItalic)}
          className={`w-7 h-7 rounded flex items-center justify-center border transition-all ${
            textConfig.isItalic
              ? 'bg-[#0E7490] text-white border-[#0E7490]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
          title="Italic"
        >
          <Italic size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Color Swatches */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-[var(--text-muted)]">Color:</span>
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onTextConfigChange('color', c)}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              textConfig.color === c ? 'scale-110 border-[#0E7490]' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={textConfig.color}
          onChange={(e) => onTextConfigChange('color', e.target.value)}
          className="w-6 h-6 p-0 border-0 rounded cursor-pointer ml-1"
          title="Custom color"
        />
      </div>
    </div>
  );
}
