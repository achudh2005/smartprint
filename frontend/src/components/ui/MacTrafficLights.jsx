export default function MacTrafficLights({
  onClose,
  onMinimize,
  onMaximize,
  className = '',
  size = 'md', // 'sm' (10px) or 'md' (12px)
}) {
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const glyphSize = size === 'sm' ? 'text-[7px]' : 'text-[8px]';

  return (
    <div
      className={`mac-traffic-lights group inline-flex items-center gap-1.5 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Close Dot */}
      <button
        type="button"
        tabIndex={-1}
        onClick={onClose}
        disabled={!onClose}
        className={`${dotSize} rounded-full mac-dot-red flex items-center justify-center transition-all active:brightness-90 ${
          onClose ? 'cursor-pointer' : 'cursor-default'
        }`}
        title={onClose ? 'Close' : undefined}
      >
        <span
          className={`opacity-0 group-hover:opacity-100 text-[#4A0000] font-black leading-none ${glyphSize}`}
        >
          ×
        </span>
      </button>

      {/* Minimize Dot */}
      <button
        type="button"
        tabIndex={-1}
        onClick={onMinimize}
        disabled={!onMinimize}
        className={`${dotSize} rounded-full mac-dot-yellow flex items-center justify-center transition-all active:brightness-90 ${
          onMinimize ? 'cursor-pointer' : 'cursor-default'
        }`}
        title={onMinimize ? 'Minimize' : undefined}
      >
        <span
          className={`opacity-0 group-hover:opacity-100 text-[#4A3000] font-black leading-none ${glyphSize}`}
        >
          –
        </span>
      </button>

      {/* Zoom / Expand Dot */}
      <button
        type="button"
        tabIndex={-1}
        onClick={onMaximize}
        disabled={!onMaximize}
        className={`${dotSize} rounded-full mac-dot-green flex items-center justify-center transition-all active:brightness-90 ${
          onMaximize ? 'cursor-pointer' : 'cursor-default'
        }`}
        title={onMaximize ? 'Expand' : undefined}
      >
        <span
          className={`opacity-0 group-hover:opacity-100 text-[#003800] font-black leading-none ${glyphSize}`}
        >
          +
        </span>
      </button>
    </div>
  );
}
