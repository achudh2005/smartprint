import { useState } from 'react';
import { X, MessageSquare, Trash2, Check } from 'lucide-react';
import { Button, MacTrafficLights } from '../ui';

export default function StickyNoteModal({ isOpen, onClose, note, onSaveNote, onDeleteNote }) {
  if (!isOpen || !note) return null;

  const [text, setText] = useState(note.text || '');
  const [color, setColor] = useState(note.color || '#F59E0B');

  const colors = [
    { label: 'Yellow', hex: '#F59E0B' },
    { label: 'Blue', hex: '#3B82F6' },
    { label: 'Green', hex: '#10B981' },
    { label: 'Pink', hex: '#EC4899' },
  ];

  const handleSave = () => {
    onSaveNote({
      ...note,
      text: text.trim(),
      color,
    });
    onClose();
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
              <MessageSquare size={14} strokeWidth={2} className="text-[#0E7490]" />
              <h3 className="font-semibold text-xs text-[var(--text)]">Sticky Note Comment</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Comment Note</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your comment or instruction here..."
              className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-medium text-[var(--text)] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)] font-semibold">Note Color:</span>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    color === c.hex ? 'scale-110 border-[#0E7490]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
          {onDeleteNote ? (
            <button
              type="button"
              onClick={() => {
                onDeleteNote(note.id);
                onClose();
              }}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              <Trash2 size={12} strokeWidth={2} /> Delete Note
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="mac-button-secondary px-3.5 py-1.5 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="mac-button-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
            >
              <Check size={13} strokeWidth={2} /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
