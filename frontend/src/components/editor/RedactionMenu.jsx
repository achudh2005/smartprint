import { ShieldX, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { Button } from '../ui';

export default function RedactionMenu({
  activeTool,
  onSelectTool,
  currentPendingRedactionsCount,
  onApplyPendingRedactions,
  onClearPendingRedactions,
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap py-1 text-xs">
      {/* Activate Redaction Tool */}
      <button
        type="button"
        onClick={() => onSelectTool(activeTool === 'REDACT_AREA' ? 'SELECT' : 'REDACT_AREA')}
        className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
          activeTool === 'REDACT_AREA'
            ? 'bg-rose-700 text-white border-rose-700 shadow-xs ring-2 ring-rose-500/30'
            : 'border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
        }`}
      >
        <ShieldX size={14} strokeWidth={2} />
        <span>{activeTool === 'REDACT_AREA' ? 'Cancel Redaction Box' : 'Select Region to Redact'}</span>
      </button>

      {/* Confirmation of pending redactions */}
      {currentPendingRedactionsCount > 0 && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-3 py-1 rounded-lg">
          <span className="text-xs font-semibold text-rose-900 dark:text-rose-300">
            {currentPendingRedactionsCount} area{currentPendingRedactionsCount === 1 ? '' : 's'} marked
          </span>
          <Button variant="danger" size="sm" onClick={onApplyPendingRedactions} className="py-1 px-2.5 text-xs">
            <Check size={12} strokeWidth={2} /> Permanently Redact
          </Button>
          <button
            type="button"
            onClick={onClearPendingRedactions}
            className="p-1 text-rose-600 hover:text-rose-800 transition-colors"
            title="Clear marked redaction areas"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Honest security info badge */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] ml-auto">
        <AlertTriangle size={13} strokeWidth={2} className="text-amber-500 shrink-0" />
        <span className="hidden sm:inline">
          True Redaction permanently removes the underlying text stream from the output PDF before solid black overlay.
        </span>
      </div>
    </div>
  );
}
