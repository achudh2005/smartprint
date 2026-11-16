import React, { useState, useEffect } from 'react'
import {
  Search,
  ShieldAlert,
  FileText,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react'
import api from '../../lib/api'
import {
  Card,
  CardBody,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableSkeleton,
  EmptyState,
} from '../../components/ui'
import { getAuditSummary } from '../../lib/auditSummary'
import { exportToCsv } from '../../lib/csvExport'
import toast from 'react-hot-toast'

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [expandedLogId, setExpandedLogId] = useState(null)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/admin/audit-logs')
      const payload = res.data?.data
      setLogs(Array.isArray(payload) ? payload : payload?.logs || [])
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setError(err.response?.data?.message || 'Failed to load audit logs')
      toast.error('Failed to load audit records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const payloadStr = JSON.stringify(log.newData || log.details || log.oldData || '')
    const matchesSearch =
      !search ||
      (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
      payloadStr.toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.email && log.user.email.toLowerCase().includes(search.toLowerCase())) ||
      (log.user?.name && log.user.name.toLowerCase().includes(search.toLowerCase())) ||
      (log.shop?.name && log.shop.name.toLowerCase().includes(search.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.includes(search))

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter
    return matchesSearch && matchesAction
  })

  const standardActions = [
    'ALL',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'CREATE_SHOP_OWNER',
    'AUTO_SUSPENDED_BRUTE_FORCE',
    'IMPERSONATION_START',
    'RESET_PASSWORD',
    'USER_UPDATED',
    'REVOKE_SESSION',
    'REVOKE_ALL_SESSIONS',
  ]
  const dynamicActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)))
  const allActionOptions = Array.from(new Set([...standardActions, ...dynamicActions]))

  const handleExportCsv = () => {
    const columns = [
      { label: 'ID', key: 'id' },
      { label: 'Timestamp', accessor: (l) => new Date(l.createdAt).toISOString() },
      { label: 'Action', key: 'action' },
      { label: 'Actor Name', accessor: (l) => l.user?.name || '' },
      { label: 'Actor Email', accessor: (l) => l.user?.email || '' },
      { label: 'Target Shop', accessor: (l) => l.shop?.name || '' },
      { label: 'Resource', accessor: (l) => (l.resource ? `${l.resource}:${l.resourceId || ''}` : '') },
      { label: 'IP Address', key: 'ipAddress' },
      { label: 'Summary', accessor: (l) => getAuditSummary(l).summary },
      { label: 'Raw Details', accessor: (l) => JSON.stringify(l.details || l.newData || {}) },
    ]

    const success = exportToCsv(`smartprint_audit_logs_${new Date().toISOString().slice(0, 10)}`, filteredLogs, columns)
    if (success) {
      toast.success(`Exported ${filteredLogs.length} audit records to CSV`)
    } else {
      toast.error('No logs to export')
    }
  }

  const toggleExpand = (id) => {
    setExpandedLogId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-[#007AFF] dark:text-[#0A84FF]" size={22} strokeWidth={2} />
            <span>Security & Audit Trail</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Immutable log of administrative operations, authentication events, and platform security triggers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="text-xs"
          >
            <Download size={13} strokeWidth={1.75} />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogs}
            loading={loading}
            className="text-xs"
          >
            <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <Card className="p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search action, actor, IP, summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <Filter size={13} className="text-[var(--text-muted)] shrink-0 ml-1" />
          <span className="text-xs text-[var(--text-muted)] shrink-0 font-medium">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input h-9 text-xs py-1 px-2.5 w-auto"
          >
            {allActionOptions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No audit records found"
            description="No platform events match your current filter and search criteria."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Event Summary</TableHead>
                <TableHead>Actor / Role</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">IP Address</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const { summary, variant } = getAuditSummary(log)
                const isExpanded = expandedLogId === log.id
                const rawJson = log.details || log.newData || log.oldData

                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      onClick={() => toggleExpand(log.id)}
                      className="cursor-pointer group"
                    >
                      <TableCell className="w-10 text-center text-[var(--text-muted)]">
                        <button
                          type="button"
                          className="p-1 text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <Badge variant={variant} dot>
                          {log.action}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium text-xs text-[var(--text)] max-w-md truncate">
                        {summary}
                      </TableCell>

                      <TableCell className="text-xs">
                        {log.user ? (
                          <div>
                            <span className="font-semibold text-[var(--text)] block truncate">
                              {log.user.name || log.user.email}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] block">
                              {log.user.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] italic text-xs">System / Anonymous</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-[var(--text)]">
                        {log.shop ? (
                          <span className="font-medium truncate block">{log.shop.name}</span>
                        ) : log.resource ? (
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            {log.resource}:{log.resourceId || '-'}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-[var(--text-muted)]">
                        {log.ipAddress || '-'}
                      </TableCell>
                    </TableRow>

                    {/* Expandable Raw JSON Drawer */}
                    {isExpanded && (
                      <tr className="bg-black/[0.02] dark:bg-white/[0.02]">
                        <td colSpan={7} className="px-6 py-4 border-b border-[var(--border)]">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[var(--text)]">
                                Full Event Payload & Technical Metadata
                              </span>
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                Event ID: {log.id} • UserAgent: {log.userAgent || 'N/A'}
                              </span>
                            </div>
                            <pre className="p-3 rounded-xl bg-black/[0.04] dark:bg-black/60 border border-[var(--border)] font-mono text-[11px] text-[var(--text)] overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                              {JSON.stringify(rawJson || log, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
