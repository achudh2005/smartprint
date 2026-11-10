import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Printer,
  RefreshCw,
  Plus,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  Activity,
  History,
  RotateCcw,
} from 'lucide-react'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import api from '../../lib/api'

export default function ShopPrintersPage() {
  const { shopId } = useParams()
  const [printers, setPrinters] = useState([])
  const [printJobs, setPrintJobs] = useState([])
  const [agentToken, setAgentToken] = useState(null)
  const [shopCode, setShopCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    model: '',
    connectionType: 'USB',
    isDefault: false,
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [printersRes, jobsRes] = await Promise.all([
        api.get(`/shops/${shopId}/printers`),
        api.get(`/shops/${shopId}/print-jobs`),
      ])

      setPrinters(printersRes.data.data.printers || [])
      setShopCode(printersRes.data.data.shopCode || '')
      setPrintJobs(jobsRes.data.data.jobs || [])
    } catch (err) {
      console.error('Failed to load printer data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [shopId])

  const handleGenerateToken = async () => {
    try {
      setActionLoading(true)
      const res = await api.post(`/shops/${shopId}/agent-token`)
      setAgentToken(res.data.data.agentToken)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate token')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyToken = () => {
    if (!agentToken) return
    navigator.clipboard.writeText(agentToken)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  const handleAddPrinter = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      await api.post(`/shops/${shopId}/printers`, newPrinter)
      setShowAddModal(false)
      setNewPrinter({ name: '', model: '', connectionType: 'USB', isDefault: false })
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add printer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleActive = async (printer) => {
    try {
      await api.patch(`/shops/${shopId}/printers/${printer.id}`, {
        isActive: !printer.isActive,
      })
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update printer')
    }
  }

  const handleSetDefault = async (printerId) => {
    try {
      await api.patch(`/shops/${shopId}/printers/${printerId}`, {
        isDefault: true,
      })
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set default printer')
    }
  }

  const handleRetryJob = async (jobId) => {
    try {
      await api.post(`/shops/${shopId}/print-jobs/${jobId}/retry`)
      alert('Print job requeued successfully!')
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to retry job')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight">
            Printer Management &amp; Windows Print Agent
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage physical and network printers, monitor Windows Print Agent heartbeats, and review live print spooler jobs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="btn btn-secondary"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus size={14} />
            Add Printer
          </button>
        </div>
      </div>

      <ShopNavTabs shopId={shopId} />

      {/* Print Agent Setup Banner */}
      <div className="text-white rounded-xl p-6 shadow-sm" style={{ background: '#0E182A' }}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary-500/20 text-primary-300 rounded-lg text-xs font-semibold mb-3 border border-primary-500/30">
              <Terminal size={13} />
              Windows Direct Printing Agent
            </div>
            <h2 className="text-lg font-bold text-white">Connect Your Windows Shop Computer</h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Run the SmartPrint Windows Print Agent on your counter PC to automatically receive incoming print orders, apply duplex/color settings, and print directly without manual downloads.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            {agentToken ? (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-emerald-400 w-full sm:w-auto">
                <span className="truncate max-w-[200px]">{agentToken}</span>
                <button
                  onClick={handleCopyToken}
                  className="p-1 hover:text-white transition-colors duration-150"
                  title="Copy Token"
                >
                  {tokenCopied ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Copy size={15} />}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateToken}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors duration-150 shadow-xs"
              >
                <Key size={14} />
                Generate Agent Token
              </button>
            )}
          </div>
        </div>

        {agentToken && (
          <div className="mt-4 pt-4 border-t border-slate-700/60 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-slate-400">Launch command on Windows PC:</span>{' '}
              <code className="bg-slate-950 px-2.5 py-1 rounded-md text-amber-300 font-mono text-[11px]">
                python print-agent/print_agent.py
              </code>
            </div>
            <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
              <CheckCircle2 size={13} /> Shop Code: {shopCode}
            </span>
          </div>
        )}
      </div>

      {/* Printers Grid */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <Activity size={16} className="text-[#0E7490]" />
          Configured Printers ({printers.length})
        </h2>

        {printers.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 text-center">
            <Printer className="mx-auto text-[var(--border)] mb-3" size={40} />
            <h3 className="text-sm font-bold text-[var(--text)]">No Printers Connected</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1 mb-4">
              Launch the Windows Print Agent on your computer to auto-discover installed printers, or add one manually.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <Plus size={14} />
              Add Printer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {printers.map((printer) => (
              <div
                key={printer.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-xs relative hover:border-[#0E7490]/30 transition-colors duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text)] truncate max-w-[200px]">
                        {printer.name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {printer.model || 'Standard Spooler'} ({printer.connectionType || 'USB'})
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        printer.status === 'ONLINE'
                          ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          printer.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'
                        }`}
                      />
                      {printer.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[var(--text-muted)] py-3 border-y border-[var(--border)] mb-4">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Total Print Jobs:</span>
                      <span className="font-semibold text-[var(--text)]">{printer._count?.printJobs || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Last Active:</span>
                      <span className="font-semibold text-[var(--text)]">
                        {printer.lastSeenAt ? new Date(printer.lastSeenAt).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    {printer.isDefault ? (
                      <span className="px-2 py-1 bg-[var(--accent-tint)] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold rounded-lg">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(printer.id)}
                        className="text-xs text-[var(--text-muted)] hover:text-[#0E7490] font-medium transition-colors duration-150"
                      >
                        Make Default
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleActive(printer)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                      printer.isActive
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                    }`}
                  >
                    {printer.isActive ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print Jobs History Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <History size={16} className="text-[#0E7490]" />
              Direct Print Jobs Spooler History
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Live status progression from queue dispatch to physical Windows driver completion.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Target Printer</th>
                <th className="py-3 px-4">Status Lifecycle</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)] font-medium">
              {printJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    No direct print jobs recorded yet.
                  </td>
                </tr>
              ) : (
                printJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[var(--text-muted)]">#{job.id}</td>
                    <td className="py-2.5 px-4 font-bold text-[var(--text)]">{job.file?.order?.orderNumber || '-'}</td>
                    <td className="py-2.5 px-4 max-w-[200px] truncate text-[var(--text)]">{job.file?.originalName}</td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)]">{job.printer?.name || 'Any Available'}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                          job.status === 'DRIVER_COMPLETED' || job.status === 'COMPLETED'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                            : job.status === 'FAILED'
                            ? 'bg-red-50 text-[#B91C1C] border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            : job.status === 'SUBMITTED_TO_OS'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                            : job.status === 'DOWNLOADED'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)] text-[11px]">
                      {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-medium transition-colors duration-150"
                        >
                          <RotateCcw size={12} /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Printer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--surface)] rounded-xl max-w-md w-full p-6 shadow-card border border-[var(--border)]">
            <h3 className="text-base font-bold text-[var(--text)] mb-1">Add Printer Manually</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Register a printer installed on your shop workstation or local network.
            </p>

            <form onSubmit={handleAddPrinter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Printer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HP LaserJet Pro M428fdw"
                  value={newPrinter.name}
                  onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Model / Driver</label>
                <input
                  type="text"
                  placeholder="e.g. HP LaserJet Series"
                  value={newPrinter.model}
                  onChange={(e) => setNewPrinter({ ...newPrinter, model: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Connection Type</label>
                <select
                  value={newPrinter.connectionType}
                  onChange={(e) => setNewPrinter({ ...newPrinter, connectionType: e.target.value })}
                  className="input w-full"
                >
                  <option value="USB">USB Cable</option>
                  <option value="NETWORK">LAN / WiFi Network</option>
                  <option value="WINDOWS_SPOOLER">Windows Spooler</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={newPrinter.isDefault}
                  onChange={(e) => setNewPrinter({ ...newPrinter, isDefault: e.target.checked })}
                  className="rounded-sm border-[var(--border)] text-[#0E7490] focus:ring-[#22D3EE]/30"
                />
                <label htmlFor="isDefault" className="text-xs text-[var(--text)] font-medium">
                  Set as shop default printer
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  {actionLoading ? 'Saving...' : 'Save Printer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
