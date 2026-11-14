import { useState, useRef, useEffect } from 'react';
import { X, PenTool, Type, Upload, RotateCcw, Check } from 'lucide-react';
import { Button, MacTrafficLights } from '../ui';

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
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 440;
      tempCanvas.height = 140;
      const ctx = tempCanvas.getContext('2d');
      ctx.font = `44px ${typedFont}`;
      ctx.fillStyle = penColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 20, 70);
      onSaveSignature(tempCanvas.toDataURL('image/png'));
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
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="mac-sheet rounded-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scaleIn select-none">
        {/* macOS Sheet Titlebar with Traffic Lights */}
        <div className="px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MacTrafficLights size="sm" onClose={onClose} />
            <div className="h-3 w-px bg-black/[0.1] dark:bg-white/[0.1] mx-0.5" />
            <div className="flex items-center gap-1.5">
              <PenTool size={14} strokeWidth={2} className="text-[#0E7490]" />
              <h3 className="font-semibold text-xs text-[var(--text)]">Create Signature</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Tab switch (macOS Segmented Control) */}
        <div className="px-4 py-2 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] flex items-center">
          <div className="mac-segmented-track">
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
                  className={`mac-segmented-pill flex items-center gap-1.5 cursor-pointer ${
                    active ? 'mac-segmented-pill-active' : 'mac-segmented-pill-inactive'
                  }`}
                >
                  <Icon size={12} strokeWidth={active ? 2.25 : 1.75} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex-1">
          {activeTab === 'draw' && (
            <div className="space-y-4">
              <div className="relative border border-dashed border-black/20 dark:border-white/20 rounded-xl bg-white dark:bg-slate-950 overflow-hidden cursor-crosshair">
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
                  <span className="text-[11px] text-[var(--text-muted)]">Color:</span>
                  {['#000000', '#1E3A8A', '#DC2626'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPenColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
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
                    className="mac-button-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
                  >
                    <RotateCcw size={11} strokeWidth={2} /> Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text)] block mb-1">Enter your name</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30"
                />
              </div>

              <div className="p-6 bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 rounded-xl text-center min-h-[120px] flex items-center justify-center">
                <span
                  style={{ fontFamily: typedFont, fontSize: '38px', color: penColor }}
                  className="select-none"
                >
                  {typedName || 'Your Signature'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">Style:</span>
                {['cursive', 'serif', 'sans-serif'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setTypedFont(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      typedFont === f
                        ? 'bg-[var(--accent-tint)] border-[#0E7490] text-[#0E7490]'
                        : 'border-black/10 dark:border-white/10 text-[var(--text-muted)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="border border-dashed border-black/20 dark:border-white/20 rounded-xl p-8 text-center bg-black/[0.02] dark:bg-white/[0.03]">
              <Upload size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
              <p className="text-xs font-semibold text-[var(--text)]">Upload a photo of your signature</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">PNG or JPEG format (transparent background works best)</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-4 text-xs text-[var(--text-muted)] cursor-pointer"
              />
            </div>
          )}
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
          {activeTab !== 'upload' && (
            <button
              type="button"
              onClick={handleSave}
              className="mac-button-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
            >
              <Check size={13} strokeWidth={2} /> Use Signature
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
