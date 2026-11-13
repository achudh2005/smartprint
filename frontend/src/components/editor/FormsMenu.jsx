import { CheckSquare, Edit } from 'lucide-react';

export default function FormsMenu({
  detectedFormFields,
  formValues,
  onFormFieldChange,
}) {
  if (!detectedFormFields || detectedFormFields.length === 0) {
    return (
      <div className="py-2 text-xs text-[var(--text-muted)] italic">
        No interactive AcroForm fields detected in this document.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap py-1 text-xs">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0E7490] border-r border-[var(--border)] pr-2">
        <CheckSquare size={13} strokeWidth={2} />
        <span>{detectedFormFields.length} Form Fields:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
        {detectedFormFields.slice(0, 5).map((f) => {
          const val = formValues[f.name] !== undefined ? formValues[f.name] : f.value;
          const isCheck = f.type.includes('CheckBox');

          return (
            <div
              key={f.name}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] shrink-0"
            >
              <label className="text-[11px] font-semibold text-[var(--text)] truncate max-w-[100px]" title={f.name}>
                {f.name}:
              </label>

              {isCheck ? (
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => onFormFieldChange(f.name, e.target.checked)}
                  className="rounded"
                />
              ) : (
                <input
                  type="text"
                  value={val || ''}
                  onChange={(e) => onFormFieldChange(f.name, e.target.value)}
                  placeholder="Fill value..."
                  className="input text-xs py-0.5 px-1.5 min-h-[26px] w-28 bg-[var(--surface)] text-[var(--text)]"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
