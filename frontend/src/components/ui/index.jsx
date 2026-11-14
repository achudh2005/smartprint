import clsx from 'clsx'

// ── Button ────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className,
  disabled,
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    outline: 'btn-secondary',
  }
  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  }

  return (
    <button
      className={clsx('btn', variants[variant] || 'btn-primary', sizes[size] || 'btn-md', className)}
      disabled={loading || disabled}
      {...props}
    >
      {loading && (
        <span
          className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────
export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx('input', error && 'input-error', className)}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && !error && (
        <p className="text-xs text-text-muted mt-1">{hint}</p>
      )}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────
export function Textarea({
  label,
  error,
  className,
  id,
  rows = 3,
  ...props
}) {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={clsx('input h-auto min-h-[80px] py-2.5 resize-y', error && 'input-error', className)}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, className, ...props }) {
  return (
    <div className={clsx('card', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={clsx('card-header', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...props }) {
  return (
    <div className={clsx('card-body', className)} {...props}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({
  children,
  variant = 'gray',
  dot = false,
  className,
  ...props
}) {
  const variants = {
    green: 'badge-green',
    success: 'badge-green',
    blue: 'badge-blue',
    accent: 'badge-blue',
    yellow: 'badge-yellow',
    warning: 'badge-yellow',
    red: 'badge-red',
    danger: 'badge-red',
    gray: 'badge-gray',
    neutral: 'badge-gray',
  }

  return (
    <span className={clsx('badge', variants[variant] || 'badge-gray', className)} {...props}>
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-80"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 'md', className, ...props }) {
  const sizes = {
    sm: 'w-4 h-4',   // ~16px
    md: 'w-7 h-7',   // ~28px
    lg: 'w-10 h-10', // ~40px
  };

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center shrink-0 select-none align-middle',
        sizes[size] || sizes.md,
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <svg
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        {/* Rear feed tray paper guide */}
        <rect
          x="7.5"
          y="3.5"
          width="13"
          height="5"
          rx="1"
          className="fill-surface-2 stroke-border"
          strokeWidth="0.75"
        />

        {/* Emerging Paper Sheet (animated sliding UP out of slot) */}
        <g className="smartprint-loader-paper">
          <rect
            x="6.5"
            y="4"
            width="15"
            height="14"
            rx="1.5"
            className="fill-surface stroke-border"
            strokeWidth="1"
          />
          {/* Subtle printed text lines */}
          {!isSmall && (
            <>
              <line
                x1="9"
                y1="7.5"
                x2="19"
                y2="7.5"
                className="stroke-primary-600 dark:stroke-primary-400"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <line
                x1="9"
                y1="10.5"
                x2="16"
                y2="10.5"
                className="stroke-text-muted"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
            </>
          )}
          {isLarge && (
            <line
              x1="9"
              y1="13.5"
              x2="17.5"
              y2="13.5"
              className="stroke-text-muted"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* Printer Chassis Body (sits on top, masking lower paper half) */}
        <rect
          x="3"
          y="13"
          width="22"
          height="12"
          rx="2.5"
          className="fill-surface-2 stroke-border"
          strokeWidth="1.5"
        />

        {/* Paper Exit Slot */}
        <line
          x1="6.5"
          y1="13"
          x2="21.5"
          y2="13"
          className="stroke-text-muted"
          strokeWidth="1.25"
          strokeLinecap="round"
        />

        {/* Active Status LED Indicator (pulsing deep cyan) */}
        <circle
          cx="6.5"
          cy="19"
          r="1.25"
          className="smartprint-loader-led fill-primary-600 dark:fill-primary-400"
        />

        {/* Bottom Output Tray Lip */}
        <line
          x1="9.5"
          y1="21.5"
          x2="18.5"
          y2="21.5"
          className="stroke-border"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

// ── Page Header ───────────────────────────────────────────
export function PageHeader({ title, description, action, className, ...props }) {
  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6', className)} {...props}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-text-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({ icon: Icon, illustration: Illustration, title, description, action, className, ...props }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4 text-center', className)} {...props}>
      {Illustration ? (
        <div className="mb-4 flex items-center justify-center">
          <Illustration size={96} />
        </div>
      ) : Icon ? (
        <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center mb-3 text-text-muted">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-text-muted max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────
export function Alert({ type = 'info', children, className, ...props }) {
  const styles = {
    info:    'bg-primary-500/10 border-primary-500/20 text-primary-700 dark:text-primary-300',
    success: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
    error:   'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
  }

  return (
    <div className={clsx('border rounded-lg px-4 py-3 text-sm transition-colors duration-150', styles[type] || styles.info, className)} {...props}>
      {children}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, description, className, disabled, ...props }) {
  return (
    <div className={clsx('flex items-center justify-between gap-4', className)} {...props}>
      <div>
        {label && <p className="text-sm font-medium text-text">{label}</p>}
        {description && (
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40 disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-primary-600' : 'bg-surface-2 border border-border'
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white dark:bg-white shadow-xs transform transition-transform duration-150 ease-in-out',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

// ── Skeleton (New Optional Component) ─────────────────────
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={clsx('skeleton-shimmer rounded-md', className)}
      {...props}
    />
  )
}

// ── StatCard (New Optional Component) ─────────────────────
export function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
  className,
  ...props
}) {
  const changeStyles = {
    positive: 'text-green-700 dark:text-green-400 bg-green-500/10',
    negative: 'text-red-700 dark:text-red-400 bg-red-500/10',
    neutral:  'text-text-muted bg-surface-2',
  }

  return (
    <div className={clsx('card p-4 sm:p-5 flex flex-col justify-between', className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {Icon && (
          <div className="w-7 h-7 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted shrink-0">
            <Icon size={14} strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text tabular-nums">
          {value}
        </div>
        {(change || description) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
            {change && (
              <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums', changeStyles[changeType])}>
                {change}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tabs (New Optional Component - Underline style) ───────
export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className,
  ...props
}) {
  return (
    <div className={clsx('border-b border-border overflow-x-auto scrollbar-none', className)} {...props}>
      <nav className="flex space-x-6 min-w-max" aria-label="Tabs">
        {tabs.map((tab) => {
          const tabKey = typeof tab === 'object' ? tab.key || tab.id : tab
          const tabLabel = typeof tab === 'object' ? tab.label || tab.name : tab
          const tabCount = typeof tab === 'object' ? tab.count : undefined
          const isActive = activeTab === tabKey

          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => onChange && onChange(tabKey)}
              className={clsx(
                'group relative pb-2.5 text-sm font-medium transition-colors duration-150 inline-flex items-center gap-2 select-none',
                isActive
                  ? 'text-primary-600 dark:text-primary-400 font-semibold'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <span>{tabLabel}</span>
              {tabCount !== undefined && (
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded-full text-[11px] tabular-nums font-medium',
                    isActive
                      ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
                      : 'bg-surface-2 text-text-muted'
                  )}
                >
                  {tabCount}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ── DataTable Styles (New Optional Components) ────────────
export function Table({ children, className, ...props }) {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <table className={clsx('w-full text-left text-sm text-text', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className, ...props }) {
  return (
    <thead className={clsx('bg-surface-2 text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border select-none', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className, ...props }) {
  return (
    <tbody className={clsx('divide-y divide-border', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ children, className, ...props }) {
  return (
    <tr className={clsx('hover:bg-surface-hover/60 transition-colors duration-150', className)} {...props}>
      {children}
    </tr>
  )
}

export function TableHead({ children, className, ...props }) {
  return (
    <th className={clsx('px-4 py-3 text-xs font-semibold', className)} {...props}>
      {children}
    </th>
  )
}

export function TableCell({ children, className, ...props }) {
  return (
    <td className={clsx('px-4 py-3 text-sm tabular-nums', className)} {...props}>
      {children}
    </td>
  )
}

// Re-export ThemeToggle
export { default as ThemeToggle } from './ThemeToggle'


// Brand Identity Components
export { BrandMark } from './BrandMark'
export { Wordmark } from './Wordmark'