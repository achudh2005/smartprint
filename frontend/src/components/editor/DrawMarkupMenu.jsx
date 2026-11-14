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
    <div className="flex items-center gap-1.5 flex-wrap py-0.5 text-xs select-none">
      {/* Freehand & Text Markups */}
      <div className="flex items-center gap-1 border-r border-black/[0.08] dark:border-white/[0.08] pr-2">
        {tools.map((t) => {
          const Icon = t.icon;
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTool(active ? 'SELECT' : t.id)}
              className={`px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                active
                  ? 'mac-button-primary'
                  : 'mac-button-secondary text-[var(--text)]'
              }`}
              title={t.label}
            >
              <Icon size={12} strokeWidth={2} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Shapes Dropdown / Buttons */}
      <div className="flex items-center gap-1 border-r border-black/[0.08] dark:border-white/[0.08] pr-2">
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
                  : 'mac-button-secondary text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={s.label}
            >
              <Icon size={13} strokeWidth={2} />
            </button>
          );
        })}
      </div>

      {/* Sticky Note Pin */}
      <button
        type="button"
        onClick={() => onSelectTool(activeTool === 'STICKY_NOTE' ? 'SELECT' : 'STICKY_NOTE')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
          activeTool === 'STICKY_NOTE'
            ? 'bg-amber-500 text-white border border-amber-600 shadow-xs'
            : 'mac-button-secondary text-amber-600 dark:text-amber-400'
        }`}
        title="Place a sticky note comment pin on the document"
      >
        <MessageSquare size={12} strokeWidth={2} />
        <span>Comment Note</span>
      </button>

      {/* Stamp Selector */}
      <div className="flex items-center gap-1 border-r border-black/[0.08] dark:border-white/[0.08] pr-2">
        <Stamp size={12} strokeWidth={2} className="text-[#0E7490]" />
        <select
          value={markupConfig.stampPreset || 'APPROVED'}
          onChange={(e) => {
            onMarkupConfigChange('stampPreset', e.target.value);
            onSelectTool('STAMP');
          }}
          className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-2.5 py-1 text-xs font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 shadow-xs"
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
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'STAMP'
              ? 'mac-button-primary'
              : 'mac-button-secondary text-[var(--text)]'
          }`}
        >
          Place
        </button>
      </div>

      {/* Color picker & stroke thickness */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">Color:</span>
        {['#EF4444', '#F59E0B', '#10B981', '#0E7490', '#3B82F6', '#8B5CF6', '#000000'].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onMarkupConfigChange('color', c)}
            className={`w-4.5 h-4.5 rounded-full border transition-all ${
              markupConfig.color === c ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : 'border-black/10 dark:border-white/20'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}

        <span className="text-[11px] text-[var(--text-muted)] font-medium ml-1.5">Width:</span>
        <select
          value={markupConfig.strokeWidth}
          onChange={(e) => onMarkupConfigChange('strokeWidth', parseInt(e.target.value, 10))}
          className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-2 py-1 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 shadow-xs w-14 tabular-nums"
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
