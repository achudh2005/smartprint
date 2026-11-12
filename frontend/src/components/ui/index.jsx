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
        <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1">{hint}</p>
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
    sm: 'w-4 h-4 border-[1.5px]',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  }

  return (
    <div
      className={clsx(
        sizes[size] || sizes.md,
        'border-[#E4E4E7] dark:border-[#27272A] border-t-[#0E7490] dark:border-t-[#22D3EE] rounded-full animate-spin',
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    />
  )
}

// ── Page Header ───────────────────────────────────────────
export function PageHeader({ title, description, action, className, ...props }) {
  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6', className)} {...props}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#18181B] dark:text-[#FAFAFA]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[#71717A] dark:text-[#A1A1AA]">
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
        <div className="w-10 h-10 rounded-lg bg-[#F4F4F5] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] flex items-center justify-center mb-3 text-[#71717A] dark:text-[#A1A1AA]">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-[#18181B] dark:text-[#FAFAFA]">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA] max-w-sm">
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
    info:    'bg-[#ECFEFF] border-[#A5F3FC] text-[#0E7490] dark:bg-[#083344] dark:border-[#155E75] dark:text-[#67E8F9]',
    success: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D] dark:bg-[#052E16] dark:border-[#14532D] dark:text-[#4ADE80]',
    warning: 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309] dark:bg-[#451A03] dark:border-[#78350F] dark:text-[#FBBF24]',
    error:   'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C] dark:bg-[#450A0A] dark:border-[#7F1D1D] dark:text-[#F87171]',
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
        {label && <p className="text-sm font-medium text-[#18181B] dark:text-[#FAFAFA]">{label}</p>}
        {description && (
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/40 disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-[#0E7490]' : 'bg-[#E4E4E7] dark:bg-[#27272A]'
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transform transition-transform duration-150 ease-in-out',
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
    positive: 'text-[#15803D] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#052E16]',
    negative: 'text-[#B91C1C] dark:text-[#F87171] bg-[#FEF2F2] dark:bg-[#450A0A]',
    neutral:  'text-[#71717A] dark:text-[#A1A1AA] bg-[#F4F4F5] dark:bg-[#18181B]',
  }

  return (
    <div className={clsx('card p-4 sm:p-5 flex flex-col justify-between', className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
          {label}
        </span>
        {Icon && (
          <div className="w-7 h-7 rounded-md bg-[#F4F4F5] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] flex items-center justify-center text-[#71717A] dark:text-[#A1A1AA] shrink-0">
            <Icon size={14} strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B] dark:text-[#FAFAFA] tabular-nums">
          {value}
        </div>
        {(change || description) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
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
    <div className={clsx('border-b border-[#E4E4E7] dark:border-[#27272A] overflow-x-auto scrollbar-none', className)} {...props}>
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
                  ? 'text-[#0E7490] dark:text-[#22D3EE] font-semibold'
                  : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#FAFAFA]'
              )}
            >
              <span>{tabLabel}</span>
              {tabCount !== undefined && (
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded-full text-[11px] tabular-nums font-medium',
                    isActive
                      ? 'bg-[#ECFEFF] dark:bg-[#083344] text-[#0E7490] dark:text-[#22D3EE]'
                      : 'bg-[#F4F4F5] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA]'
                  )}
                >
                  {tabCount}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0E7490] dark:bg-[#22D3EE] rounded-t" />
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
      <table className={clsx('w-full text-left text-sm text-[#18181B] dark:text-[#FAFAFA]', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className, ...props }) {
  return (
    <thead className={clsx('bg-[#FAFAFA] dark:bg-[#18181B] text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] border-b border-[#E4E4E7] dark:border-[#27272A] select-none', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className, ...props }) {
  return (
    <tbody className={clsx('divide-y divide-[#E4E4E7] dark:divide-[#27272A]', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ children, className, ...props }) {
  return (
    <tr className={clsx('hover:bg-[#F4F4F5]/60 dark:hover:bg-[#18181B]/60 transition-colors duration-150', className)} {...props}>
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