import { useState } from 'react';
import { X, MessageSquare, Trash2, Check } from 'lucide-react';
import { Button } from '../ui';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} strokeWidth={2} className="text-[#0E7490]" />
            <h3 className="font-display font-bold text-sm text-[var(--text)]">Sticky Note Comment</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Comment Note</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your comment or instruction here..."
              className="input text-xs bg-[var(--surface)] text-[var(--text)] leading-relaxed"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)] font-medium">Note Color:</span>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    color === c.hex ? 'scale-110 border-[#0E7490]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]">
          {onDeleteNote ? (
            <button
              type="button"
              onClick={() => {
                onDeleteNote(note.id);
                onClose();
              }}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold"
            >
              <Trash2 size={13} strokeWidth={2} /> Delete Note
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              <Check size={13} strokeWidth={2} /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
