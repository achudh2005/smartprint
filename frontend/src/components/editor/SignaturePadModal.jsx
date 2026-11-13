import { useState, useRef, useEffect } from 'react';
import { X, PenTool, Type, Upload, RotateCcw, Check } from 'lucide-react';
import { Button } from '../ui';

export default function SignaturePadModal({ isOpen, onClose, onSaveSignature }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('draw'); // 'draw' | 'type' | 'upload'
  const [penColor, setPenColor] = useState('#000000');
  const [penWidth, setPenWidth] = useState(2.5);
  const [typedName, setTypedName] = useState('');
  const [typedFont, setTypedFont] = useState('cursive');

  // Draw canvas refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [activeTab]);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handlePointerDown = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    lastPointRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleSave = () => {
    if (activeTab === 'draw') {
      if (!canvasRef.current) return;
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSaveSignature(dataUrl);
      onClose();
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return;
      // Render typed text to temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d');
      ctx.font = `44px ${typedFont}`;
      ctx.fillStyle = penColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 20, 60);
      const dataUrl = tempCanvas.toDataURL('image/png');
      onSaveSignature(dataUrl);
      onClose();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onSaveSignature(event.target.result);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text)]">Create Signature</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Draw, type, or upload a signature to stamp on documents</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[var(--border)] bg-[var(--surface-hover)] px-5 pt-2">
          {[
            { id: 'draw', label: 'Draw', icon: PenTool },
            { id: 'type', label: 'Type', icon: Type },
            { id: 'upload', label: 'Upload Image', icon: Upload },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  active
                    ? 'border-[#0E7490] text-[#0E7490] dark:text-[#22D3EE] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={13} strokeWidth={1.75} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5 flex-1">
          {activeTab === 'draw' && (
            <div className="space-y-4">
              <div className="relative border-2 border-dashed border-[var(--border)] rounded-xl bg-white dark:bg-slate-950 overflow-hidden cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={180}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="w-full h-[180px] touch-none"
                />
                <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 select-none pointer-events-none">
                  Sign above this line
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Color:</span>
                  {['#000000', '#1E3A8A', '#DC2626'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPenColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        penColor === c ? 'scale-110 border-[#0E7490]' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <RotateCcw size={12} strokeWidth={2} /> Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text)] block mb-1">Enter your name</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="input text-sm bg-[var(--surface)] text-[var(--text)]"
                />
              </div>

              <div className="p-6 bg-white dark:bg-slate-950 border border-[var(--border)] rounded-xl text-center min-h-[120px] flex items-center justify-center">
                <span
                  style={{ fontFamily: typedFont, fontSize: '38px', color: penColor }}
                  className="select-none"
                >
                  {typedName || 'Your Signature'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">Style:</span>
                {['cursive', 'serif', 'sans-serif'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setTypedFont(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      typedFont === f ? 'bg-[var(--accent-tint)] border-[#0E7490] text-[#0E7490]' : 'border-[var(--border)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center bg-[var(--surface-hover)]">
              <Upload size={28} className="mx-auto text-[var(--text-muted)] mb-2" />
              <p className="text-xs font-medium text-[var(--text)]">Upload a photo of your signature</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">PNG or JPEG format (transparent background works best)</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-4 text-xs text-[var(--text-muted)]"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--surface-hover)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {activeTab !== 'upload' && (
            <Button variant="primary" size="sm" onClick={handleSave}>
              <Check size={13} strokeWidth={2} /> Use Signature
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
