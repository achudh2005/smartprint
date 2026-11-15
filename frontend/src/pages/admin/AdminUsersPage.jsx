import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  Plus,
  KeyRound,
  History,
  Laptop,
  Copy,
  Check,
  AlertTriangle,
  X,
  Lock,
} from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState(false)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    ownerName: '',
    ownerEmail: '',
    shopName: '',
    shopPhone: '',
    shopAddress: '',
  })
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [copied, setCopied] = useState(false)

  // Active Sessions Modal
  const [selectedUserForSessions, setSelectedUserForSessions] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Login History Modal
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null)
  const [historyLogs, setHistoryLogs] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Reset Password Result Modal
  const [resetResult, setResetResult] = useState(null)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/users', {
        params: {
          search: search || undefined,
          role: roleFilter !== 'ALL' ? roleFilter : undefined,
        },
      })
      setUsers(res.data.data.users || [])
    } catch (err) {
      console.error('Failed to load users:', err)
      toast.error('Failed to load user accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  // Create Shop Owner
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!createForm.ownerName || !createForm.ownerEmail || !createForm.shopName) {
      toast.error('Owner Name, Email, and Shop Name are required')
      return
    }

    try {
      setActionLoading(true)
      const res = await api.post('/admin/shop-owners', createForm)
      setCreatedCredentials(res.data.data)
      setShowCreateModal(false)
      setCreateForm({ ownerName: '', ownerEmail: '', shopName: '', shopPhone: '', shopAddress: '' })
      await loadUsers()
      toast.success('Shop owner account provisioned!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create shop owner')
    } finally {
      setActionLoading(false)
    }
  }

  // Update Role
  const handleUpdateRole = async (userId, role) => {
    try {
      setActionLoading(true)
      await api.patch(`/admin/users/${userId}`, { role })
      toast.success(`Role updated to ${role}`)
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role')
    } finally {
      setActionLoading(false)
    }
  }

  // Update Status (ACTIVE, SUSPENDED, INACTIVE)
  const handleUpdateStatus = async (user, newStatus) => {
    const confirmMsg =
      newStatus === 'SUSPENDED'
        ? `Are you sure you want to SUSPEND ${user.email}? This will immediately terminate all active sessions.`
        : newStatus === 'INACTIVE'
        ? `Deactivate ${user.email}? This terminates all active sessions.`
        : `Reactivate account for ${user.email}?`

    if (!window.confirm(confirmMsg)) return

    try {
      setActionLoading(true)
      await api.patch(`/admin/users/${user.id}`, { status: newStatus })
      toast.success(`User status changed to ${newStatus}`)
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  // Reset Password
  const handleResetPassword = async (user) => {
    if (
      !window.confirm(
        `Reset password for ${user.email}?\n\nA new temporary password will be generated, all active sessions will be terminated, and credentials will be emailed to the owner.`
      )
    )
      return

    try {
      setActionLoading(true)
      const res = await api.post(`/admin/users/${user.id}/reset-password`)
      setResetResult({
        email: user.email,
        temporaryPassword: res.data.data?.temporaryPassword,
      })
      toast.success('Password reset successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setActionLoading(false)
    }
  }

  // Load Sessions
  const openSessionsModal = async (user) => {
    setSelectedUserForSessions(user)
    setSessionsLoading(true)
    try {
      const res = await api.get(`/admin/users/${user.id}/sessions`)
      setSessions(res.data.data?.sessions || [])
    } catch (err) {
      toast.error('Failed to load active sessions')
    } finally {
      setSessionsLoading(false)
    }
  }

  // Revoke Single Session
  const handleRevokeSession = async (sessionId) => {
    try {
      await api.post(`/admin/sessions/${sessionId}/revoke`)
      toast.success('Session revoked')
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err) {
      toast.error('Failed to revoke session')
    }
  }

  // Revoke All Sessions
  const handleRevokeAllSessions = async (userId) => {
    if (!window.confirm('Force logout this user from ALL active devices?')) return
    try {
      await api.post(`/admin/users/${userId}/revoke-all-sessions`)
      toast.success('All sessions revoked')
      setSessions([])
    } catch (err) {
      toast.error('Failed to revoke all sessions')
    }
  }

  // Load Login History
  const openHistoryModal = async (user) => {
    setSelectedUserForHistory(user)
    setHistoryLoading(true)
    try {
      const res = await api.get(`/admin/users/${user.id}/login-history`)
      setHistoryLogs(res.data.data?.logs || [])
    } catch (err) {
      toast.error('Failed to load login history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Users className="text-[#0E7490]" size={18} strokeWidth={1.75} />
            User Accounts & Security Controls
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Provision shop owners, monitor logged-in devices, terminate sessions, and manage credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0E7490] hover:bg-[#155E75] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors duration-150"
          >
            <Plus size={14} strokeWidth={2} />
            Create Shop Owner
          </button>
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150"
          >
            <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); loadUsers(); }} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs"
          />
        </form>

        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'OWNER', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                roleFilter === r
                  ? 'bg-[#0E7490] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wider text-[11px] font-semibold sticky top-0">
              <tr>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Shop Name</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Last Login</th>
                <th className="py-2.5 px-4 text-right">Security Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[var(--text-muted)]">
                    No users match criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-12">
                    <td className="py-2.5 px-4 font-semibold text-xs text-[var(--text)]">
                      {u.name || 'Unnamed'}
                      {u.mustChangePassword && (
                        <span className="block text-[10px] text-amber-500 font-normal">Must change pass</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)] font-mono text-xs">{u.email}</td>
                    <td className="py-2.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="px-2 py-1 bg-[var(--surface-hover)] border border-[var(--border)] rounded-md text-xs font-medium text-[var(--text)] focus:outline-hidden"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="STAFF">STAFF</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)]">
                      {u.shopUsers && u.shopUsers.length > 0 ? (
                        u.shopUsers.map((su) => su.shop?.name).join(', ')
                      ) : (
                        <span className="text-[var(--text-muted)] italic">None</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          u.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                            : u.status === 'SUSPENDED'
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            u.status === 'ACTIVE' ? 'bg-green-500' : u.status === 'SUSPENDED' ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                        />
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono text-[var(--text-muted)]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Sessions */}
                        <button
                          onClick={() => openSessionsModal(u)}
                          title="Active Devices & Sessions"
                          className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[#0E7490] transition-colors"
                        >
                          <Laptop size={13} strokeWidth={1.75} />
                        </button>

                        {/* View Login History */}
                        <button
                          onClick={() => openHistoryModal(u)}
                          title="Login History"
                          className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[#0E7490] transition-colors"
                        >
                          <History size={13} strokeWidth={1.75} />
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => handleResetPassword(u)}
                          title="Reset Password (Generates temp password & forces change)"
                          className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-amber-500 transition-colors"
                        >
                          <KeyRound size={13} strokeWidth={1.75} />
                        </button>

                        {/* Status Toggle */}
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateStatus(u, 'SUSPENDED')}
                            title="Suspend Account (Terminates all sessions)"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                          >
                            <UserX size={12} strokeWidth={1.75} />
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(u, 'ACTIVE')}
                            title="Reactivate Account"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                          >
                            <UserCheck size={12} strokeWidth={1.75} />
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE SHOP OWNER MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">Provision New Shop Owner</h3>
                <p className="text-xs text-[var(--text-muted)]">Creates user, shop, sets up defaults, and generates credentials.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.ownerName}
                    onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-xs">Owner Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.ownerEmail}
                    onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                    placeholder="e.g. rahul@printshop.in"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.shopName}
                  onChange={(e) => setCreateForm({ ...createForm, shopName: e.target.value })}
                  placeholder="e.g. Apex Fast Print Hub"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Shop Phone Number</label>
                  <input
                    type="tel"
                    value={createForm.shopPhone}
                    onChange={(e) => setCreateForm({ ...createForm, shopPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-xs">Shop Address / City</label>
                  <input
                    type="text"
                    value={createForm.shopAddress}
                    onChange={(e) => setCreateForm({ ...createForm, shopAddress: e.target.value })}
                    placeholder="MG Road, Bangalore"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)] text-xs text-[var(--text-muted)] space-y-1">
                <p className="font-semibold text-[var(--text)]">Administrative Security Notice:</p>
                <p>&bull; A strong 12-character temporary password will be generated automatically.</p>
                <p>&bull; Account will be created with <code className="text-[#0E7490]">mustChangePassword = true</code>.</p>
                <p>&bull; Credentials will be displayed once here and emailed directly to the owner.</p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#0E7490] hover:bg-[#155E75] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Account & Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SHOW CREATED CREDENTIALS MODAL ── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-green-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 text-green-600 flex items-center justify-center">
                <Check size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">Shop Owner Provisioned!</h3>
                <p className="text-xs text-[var(--text-muted)]">Copy credentials now — shown only once</p>
              </div>
            </div>

            <div className="p-4 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">Login ID (Email):</span>
                <p className="font-mono font-semibold text-[var(--text)] select-all">{createdCredentials.user?.email}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Shop Code:</span>
                <p className="font-mono font-semibold text-[#0E7490] select-all">{createdCredentials.shop?.shopCode}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Temporary Password:</span>
                <p className="font-mono font-bold text-sm text-amber-500 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 select-all tracking-wider">
                  {createdCredentials.temporaryPassword}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              An email has also been dispatched to the owner. They will be required to choose a new password upon first login.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    `SmartPrint Account Provisioned\nEmail: ${createdCredentials.user?.email}\nTemporary Password: ${createdCredentials.temporaryPassword}\nShop Code: ${createdCredentials.shop?.shopCode}`
                  )
                }
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-[var(--border)] text-xs font-semibold rounded-lg text-[var(--text)]"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Credentials'}
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 bg-[#0E7490] hover:bg-[#155E75] text-white text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD RESULT MODAL ── */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <KeyRound size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">Password Reset Complete</h3>
                <p className="text-xs text-[var(--text-muted)]">Active sessions terminated everywhere</p>
              </div>
            </div>

            <div className="p-4 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">Account:</span>
                <p className="font-mono font-semibold text-[var(--text)] select-all">{resetResult.email}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">New Temporary Password:</span>
                <p className="font-mono font-bold text-sm text-amber-500 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 select-all tracking-wider">
                  {resetResult.temporaryPassword}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    `SmartPrint Password Reset\nEmail: ${resetResult.email}\nTemporary Password: ${resetResult.temporaryPassword}`
                  )
                }
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-[var(--border)] text-xs font-semibold rounded-lg text-[var(--text)]"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Password'}
              </button>
              <button
                onClick={() => setResetResult(null)}
                className="px-4 py-2 bg-[#0E7490] hover:bg-[#155E75] text-white text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVE SESSIONS MODAL ── */}
      {selectedUserForSessions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                  <Laptop size={16} className="text-[#0E7490]" />
                  Active Sessions & Devices ({selectedUserForSessions.email})
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Currently logged-in browser sessions and mobile devices.</p>
              </div>
              <div className="flex items-center gap-2">
                {sessions.length > 0 && (
                  <button
                    onClick={() => handleRevokeAllSessions(selectedUserForSessions.id)}
                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 text-xs font-medium rounded-lg transition-colors"
                  >
                    Revoke All
                  </button>
                )}
                <button
                  onClick={() => setSelectedUserForSessions(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto">
              {sessionsLoading ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading active sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No active sessions currently found for this user.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[var(--text)]">{sess.ipAddress || 'Unknown IP'}</span>
                          <span className="text-[10px] text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded font-medium">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono max-w-md truncate">
                          {sess.userAgent || 'Unknown Browser / OS'}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] font-mono">
                          <span>Created: {new Date(sess.createdAt).toLocaleString()}</span>
                          {sess.lastUsedAt && (
                            <span>Last active: {new Date(sess.lastUsedAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN HISTORY MODAL ── */}
      {selectedUserForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                  <History size={16} className="text-[#0E7490]" />
                  Login History ({selectedUserForHistory.email})
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Historical authentication attempts, device signatures, and IPs.</p>
              </div>
              <button
                onClick={() => setSelectedUserForHistory(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading login history...</div>
              ) : historyLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">No login activity logged yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">
                    <tr>
                      <th className="py-2">Time</th>
                      <th className="py-2">Result</th>
                      <th className="py-2">IP Address</th>
                      <th className="py-2">Client / Device</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {historyLogs.map((log) => (
                      <tr key={log.id} className="h-9">
                        <td className="py-2 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 font-mono">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              log.action === 'LOGIN_SUCCESS'
                                ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                : 'bg-red-500/10 text-red-600 border-red-500/20'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-[11px]">{log.ipAddress || '-'}</td>
                        <td className="py-2 font-mono text-[10px] text-[var(--text-muted)] max-w-xs truncate">
                          {log.userAgent || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
