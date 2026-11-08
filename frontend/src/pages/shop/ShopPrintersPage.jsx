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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Printer className="text-primary-600" size={26} />
            Printer Management & Windows Print Agent
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage physical and network printers, monitor Windows Print Agent heartbeats, and review live print spooler jobs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-surface-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-surface-50 shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 shadow-xs"
          >
            <Plus size={14} />
            Add Printer
          </button>
        </div>
      </div>

      <ShopNavTabs shopId={shopId} />

      {/* Print Agent Setup Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 mb-8 shadow-sm">
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
                  className="p-1 hover:text-white transition-colors"
                  title="Copy Token"
                >
                  {tokenCopied ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Copy size={15} />}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateToken}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
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
      <div className="mb-10">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-primary-600" />
          Configured Printers ({printers.length})
        </h2>

        {printers.length === 0 ? (
          <div className="bg-white border border-surface-200 rounded-2xl p-10 text-center">
            <Printer className="mx-auto text-slate-300 mb-3" size={40} />
            <h3 className="text-sm font-bold text-slate-800">No Printers Connected</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Launch the Windows Print Agent on your computer to auto-discover installed printers, or add one manually.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700"
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
                className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs relative hover:border-surface-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                        {printer.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {printer.model || 'Standard Spooler'} ({printer.connectionType || 'USB'})
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        printer.status === 'ONLINE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          printer.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {printer.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 py-3 border-y border-surface-100 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Print Jobs:</span>
                      <span className="font-semibold text-slate-800">{printer._count?.printJobs || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Active:</span>
                      <span className="font-semibold text-slate-800">
                        {printer.lastSeenAt ? new Date(printer.lastSeenAt).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    {printer.isDefault ? (
                      <span className="px-2 py-1 bg-primary-50 text-primary-700 border border-primary-200 text-[10px] font-bold rounded-lg">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(printer.id)}
                        className="text-xs text-slate-500 hover:text-primary-600 font-medium"
                      >
                        Make Default
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleActive(printer)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      printer.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History size={18} className="text-primary-600" />
              Direct Print Jobs Spooler History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status progression from queue dispatch to physical Windows driver completion.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 text-slate-500 border-b border-surface-100 uppercase tracking-wider text-[10px] font-semibold">
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
            <tbody className="divide-y divide-surface-100 text-slate-700 font-medium">
              {printJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No direct print jobs recorded yet.
                  </td>
                </tr>
              ) : (
                printJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-surface-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">#{job.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{job.file?.order?.orderNumber || '-'}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-800">{job.file?.originalName}</td>
                    <td className="py-3 px-4 text-slate-600">{job.printer?.name || 'Any Available'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          job.status === 'DRIVER_COMPLETED' || job.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : job.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : job.status === 'SUBMITTED_TO_OS'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : job.status === 'DOWNLOADED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-semibold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-surface-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Printer Manually</h3>
            <p className="text-xs text-slate-500 mb-4">
              Register a printer installed on your shop workstation or local network.
            </p>

            <form onSubmit={handleAddPrinter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Printer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HP LaserJet Pro M428fdw"
                  value={newPrinter.name}
                  onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model / Driver</label>
                <input
                  type="text"
                  placeholder="e.g. HP LaserJet Series"
                  value={newPrinter.model}
                  onChange={(e) => setNewPrinter({ ...newPrinter, model: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Connection Type</label>
                <select
                  value={newPrinter.connectionType}
                  onChange={(e) => setNewPrinter({ ...newPrinter, connectionType: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
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
                  className="rounded-sm border-surface-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isDefault" className="text-xs text-slate-700 font-medium">
                  Set as shop default printer
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-surface-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-surface-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700"
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
