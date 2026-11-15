import { useState, useEffect } from 'react'
import {
  Cpu,
  RefreshCw,
  Server,
  Database,
  HardDrive,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminSystemHealthPage() {
  const [telemetry, setTelemetry] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadHealth = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/system-health')
      setTelemetry(res.data.data)
    } catch (err) {
      console.error('Failed to load system diagnostics:', err)
      toast.error('Failed to load telemetry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [])

  const formatBytes = (bytes) => {
    const b = Number(bytes || 0)
    if (b <= 0 || isNaN(b)) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return `${parseFloat((b / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatUptime = (sec) => {
    const s = Number(sec || 0)
    const days = Math.floor(s / (24 * 3600))
    const hours = Math.floor((s % (24 * 3600)) / 3600)
    const mins = Math.floor((s % 3600) / 60)
    return `${days}d ${hours}h ${mins}m`
  }

  const proc = telemetry?.process || {}
  const sys = telemetry?.system || {}
  const db = telemetry?.databaseCounts || {}

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Cpu className="text-[#0E7490]" size={20} strokeWidth={2} />
            System Telemetry & Platform Diagnostics
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real-time host server metrics, Node.js process health, and MySQL database table records.
          </p>
        </div>

        <button
          onClick={loadHealth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh Diagnostics
        </button>
      </div>

      {/* Host Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Node Process
            </span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="text-base font-bold text-[var(--text)] font-mono">{proc.nodeVersion || 'v20+'}</div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">PID: {proc.pid} &bull; PM2 Online</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Process Uptime
            </span>
            <Clock size={14} className="text-[#0E7490]" />
          </div>
          <div className="text-base font-bold text-[var(--text)] font-mono">
            {formatUptime(proc.uptimeSeconds)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Host: {formatUptime(sys.uptimeSeconds)}</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Heap Memory
            </span>
            <Activity size={14} className="text-amber-500" />
          </div>
          <div className="text-base font-bold text-[var(--text)] font-mono">
            {formatBytes(proc.memory?.heapUsedBytes)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
            Total Heap: {formatBytes(proc.memory?.heapTotalBytes)}
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              System RAM
            </span>
            <Server size={14} className="text-[#0E7490]" />
          </div>
          <div className="text-base font-bold text-[var(--text)] font-mono">
            {formatBytes(sys.totalMemBytes - sys.freeMemBytes)} / {formatBytes(sys.totalMemBytes)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            {sys.cpus} vCPU &bull; {sys.platform} ({sys.arch})
          </p>
        </div>
      </div>

      {/* Database Entity Telemetry */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
          <Database size={16} className="text-[#0E7490]" />
          Live MySQL Database Telemetry
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Users Table
            </span>
            <div className="text-2xl font-bold text-[var(--text)] mt-1 font-mono">{db.users || 0}</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Owners, staff, admins</p>
          </div>

          <div className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Shops Table
            </span>
            <div className="text-2xl font-bold text-[var(--text)] mt-1 font-mono">{db.shops || 0}</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Active & suspended tenants</p>
          </div>

          <div className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Orders Table
            </span>
            <div className="text-2xl font-bold text-[var(--text)] mt-1 font-mono">{db.orders || 0}</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Customer jobs fulfilled</p>
          </div>

          <div className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Documents Table
            </span>
            <div className="text-2xl font-bold text-[var(--text)] mt-1 font-mono">{db.files || 0}</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">PDFs, images, docx files</p>
          </div>

          <div className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Payments Table
            </span>
            <div className="text-2xl font-bold text-[var(--text)] mt-1 font-mono">{db.payments || 0}</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Razorpay & counter records</p>
          </div>

          <div className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Printers Table
            </span>
            <div className="text-2xl font-bold text-[var(--text)] mt-1 font-mono">{db.printers || 0}</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Connected physical drivers</p>
          </div>

          <div className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Audit Logs Table
            </span>
            <div className="text-2xl font-bold text-[var(--text)] mt-1 font-mono">{db.auditLogs || 0}</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Immutable security events</p>
          </div>

          <div className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Active Sessions
            </span>
            <div className="text-2xl font-bold text-[var(--text)] mt-1 font-mono">{db.sessions || 0}</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Refresh token devices</p>
          </div>
        </div>
      </div>
    </div>
  )
}
