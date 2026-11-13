import { useState } from 'react';
import {
  PenTool, Highlighter, Underline as UnderlineIcon, Strikethrough as StrikeIcon,
  Square, Circle, Minus, MoveRight, MessageSquare, Stamp
} from 'lucide-react';

export default function DrawMarkupMenu({
  activeTool,
  onSelectTool,
  markupConfig,
  onMarkupConfigChange,
  onOpenStickyNoteModal,
}) {
  const [customStampText, setCustomStampText] = useState('VERIFIED');

  const tools = [
    { id: 'PEN', label: 'Pen', icon: PenTool },
    { id: 'HIGHLIGHT', label: 'Highlight', icon: Highlighter },
    { id: 'UNDERLINE', label: 'Underline', icon: UnderlineIcon },
    { id: 'STRIKETHROUGH', label: 'Strikethrough', icon: StrikeIcon },
  ];

  const shapes = [
    { id: 'SHAPE_RECTANGLE', label: 'Rectangle', icon: Square },
    { id: 'SHAPE_ELLIPSE', label: 'Ellipse', icon: Circle },
    { id: 'SHAPE_LINE', label: 'Line', icon: Minus },
    { id: 'SHAPE_ARROW', label: 'Arrow', icon: MoveRight },
  ];

  const stamps = ['APPROVED', 'CONFIDENTIAL', 'DRAFT', 'PAID', 'VOID', 'REJECTED'];

  return (
    <div className="flex items-center gap-2 flex-wrap py-1 text-xs">
      {/* Freehand & Text Markups */}
      <div className="flex items-center gap-1 border-r border-[var(--border)] pr-2">
        {tools.map((t) => {
          const Icon = t.icon;
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTool(active ? 'SELECT' : t.id)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                active
                  ? 'bg-[#0E7490] text-white border-[#0E7490] shadow-xs'
                  : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
              title={t.label}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Shapes Dropdown / Buttons */}
      <div className="flex items-center gap-1 border-r border-[var(--border)] pr-2">
        {shapes.map((s) => {
          const Icon = s.icon;
          const active = activeTool === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectTool(active ? 'SELECT' : s.id)}
              className={`p-1.5 rounded-lg border transition-all ${
                active
                  ? 'bg-[#0E7490] text-white border-[#0E7490] shadow-xs'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
              title={s.label}
            >
              <Icon size={14} strokeWidth={1.75} />
            </button>
          );
        })}
      </div>

      {/* Sticky Note Pin */}
      <button
        type="button"
        onClick={() => onSelectTool(activeTool === 'STICKY_NOTE' ? 'SELECT' : 'STICKY_NOTE')}
        className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
          activeTool === 'STICKY_NOTE'
            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
            : 'border-[var(--border)] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
        }`}
        title="Place a sticky note comment pin on the document"
      >
        <MessageSquare size={13} strokeWidth={1.75} />
        <span>Comment Note</span>
      </button>

      {/* Stamp Selector */}
      <div className="flex items-center gap-1.5 border-r border-[var(--border)] pr-2">
        <Stamp size={13} strokeWidth={1.75} className="text-[#0E7490]" />
        <select
          value={markupConfig.stampPreset || 'APPROVED'}
          onChange={(e) => {
            onMarkupConfigChange('stampPreset', e.target.value);
            onSelectTool('STAMP');
          }}
          className="input text-xs py-1 px-2 min-h-[32px] bg-[var(--surface)] text-[var(--text)] font-semibold"
        >
          {stamps.map((st) => (
            <option key={st} value={st}>
              Stamp: {st}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === 'STAMP' ? 'SELECT' : 'STAMP')}
          className={`px-2 py-1 rounded text-xs font-semibold border ${
            activeTool === 'STAMP'
              ? 'bg-[#0E7490] text-white border-[#0E7490]'
              : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          Place Stamp
        </button>
      </div>

      {/* Color picker & stroke thickness */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--text-muted)]">Color:</span>
        {['#EF4444', '#F59E0B', '#10B981', '#0E7490', '#3B82F6', '#8B5CF6', '#000000'].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onMarkupConfigChange('color', c)}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              markupConfig.color === c ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}

        <span className="text-[11px] text-[var(--text-muted)] ml-2">Width:</span>
        <select
          value={markupConfig.strokeWidth}
          onChange={(e) => onMarkupConfigChange('strokeWidth', parseInt(e.target.value, 10))}
          className="input text-xs py-1 px-1.5 min-h-[30px] w-14 bg-[var(--surface)] text-[var(--text)]"
        >
          {[1, 2, 3, 5, 8].map((w) => (
            <option key={w} value={w}>
              {w}px
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
