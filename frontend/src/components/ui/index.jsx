import clsx from 'clsx'

// ── Button ────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className, ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }
  const sizes = { sm: 'btn-sm', md: '', lg: 'btn-lg' }

  return (
    <button
      className={clsx(variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, error, hint, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <input
        className={clsx('input', error && 'input-error', className)}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────
export function Textarea({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <textarea
        className={clsx('input resize-none', error && 'input-error', className)}
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

export function CardHeader({ children, className }) {
  return <div className={clsx('card-header', className)}>{children}</div>
}

export function CardBody({ children, className }) {
  return <div className={clsx('card-body', className)}>{children}</div>
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, variant = 'gray' }) {
  const variants = {
    green: 'badge-green', blue: 'badge-blue',
    yellow: 'badge-yellow', red: 'badge-red', gray: 'badge-gray',
  }
  return <span className={variants[variant]}>{children}</span>
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-2', lg: 'w-10 h-10 border-4' }
  return (
    <div className={clsx(
      sizes[size],
      'border-primary-200 border-t-primary-600 rounded-full animate-spin',
      className
    )} />
  )
}

// ── Page Header ───────────────────────────────────────────
export function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-surface-100 flex items-center justify-center mb-4">
          <Icon size={24} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-400 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error:   'bg-red-50 border-red-200 text-red-800',
  }
  return (
    <div className={clsx('border rounded-lg px-4 py-3 text-sm', styles[type])}>
      {children}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          checked ? 'bg-primary-600' : 'bg-slate-200'
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

export { default as ThemeToggle } from './ThemeToggle'

