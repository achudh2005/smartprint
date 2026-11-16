import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  UserCheck,
  UserX,
  RefreshCw,
  Plus,
  KeyRound,
  History,
  Laptop,
  Copy,
  Check,
  Download,
  FileEdit,
  Sliders,
  LogIn,
  ArrowUpDown,
  Trash2,
  UserPlus,
  ShieldAlert,
} from 'lucide-react'
import api from '../../lib/api'
import {
  Card,
  CardBody,
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableSkeleton,
  EmptyState,
  Modal,
} from '../../components/ui'
import { parseUserAgent } from '../../lib/deviceParser'
import { exportToCsv } from '../../lib/csvExport'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const { user: currentAdmin, updateUser } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Selection & Bulk Actions
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'OWNER',
    status: 'ACTIVE',
    shopId: '',
  })

  const [showCreateShopOwnerModal, setShowCreateShopOwnerModal] = useState(false)
  const [createOwnerForm, setCreateOwnerForm] = useState({
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

  // Admin Note Modal
  const [noteUser, setNoteUser] = useState(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  // Session Limit Modal
  const [limitUser, setLimitUser] = useState(null)
  const [sessionLimitVal, setSessionLimitVal] = useState('')
  const [limitLoading, setLimitLoading] = useState(false)

  // Password Reset Result Modal
  const [resetResult, setResetResult] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const [usersRes, shopsRes] = await Promise.all([
        api.get('/admin/users', {
          params: {
            search: search || undefined,
            role: roleFilter !== 'ALL' ? roleFilter : undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            sortBy,
            sortOrder,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        }),
        api.get('/admin/shops').catch(() => ({ data: { data: { shops: [] } } })),
      ])
      setUsers(usersRes.data.data.users || [])
      setShops(shopsRes.data.data?.shops || [])
      setSelectedUserIds([])
    } catch (err) {
      console.error('Failed to load users:', err)
      toast.error('Failed to load user accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [roleFilter, statusFilter, sortBy, sortOrder])

  // Sorting helper
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Selection helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map((u) => u.id))
    } else {
      setSelectedUserIds([])
    }
  }

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Bulk Actions
  const handleBulkAction = async (action) => {
    if (selectedUserIds.length === 0) return

    const actionLabels = {
      SUSPEND: 'suspend',
      ACTIVATE: 'reactivate',
      REVOKE_SESSIONS: 'force logout (terminate all active sessions for)',
    }

    if (
      !window.confirm(
        `Are you sure you want to ${actionLabels[action]} ${selectedUserIds.length} selected user(s)?`
      )
    )
      return

    try {
      setBulkLoading(true)
      const res = await api.post('/admin/users/bulk-action', {
        userIds: selectedUserIds,
        action,
      })
      toast.success(
        `Bulk ${actionLabels[action]} completed for ${res.data.data.processedCount} user(s)!`
      )
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk action failed')
    } finally {
      setBulkLoading(false)
    }
  }

  // Direct Create User
  const handleAddUserSubmit = async (e) => {
    e.preventDefault()
    if (!addUserForm.name || !addUserForm.email) {
      toast.error('Name and email are required')
      return
    }

    try {
      setActionLoading(true)
      const res = await api.post('/admin/users', addUserForm)
      toast.success(`User ${addUserForm.email} created successfully!`)
      if (res.data.data?.temporaryPassword) {
        setCreatedCredentials({
          user: res.data.data.user,
          temporaryPassword: res.data.data.temporaryPassword,
        })
      }
      setShowAddUserModal(false)
      setAddUserForm({ name: '', email: '', password: '', role: 'OWNER', status: 'ACTIVE', shopId: '' })
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user')
    } finally {
      setActionLoading(false)
    }
  }

  // Provision Shop Owner
  const handleCreateOwnerSubmit = async (e) => {
    e.preventDefault()
    if (!createOwnerForm.ownerName || !createOwnerForm.ownerEmail || !createOwnerForm.shopName) {
      toast.error('Owner name, email, and shop name are required')
      return
    }

    try {
      setActionLoading(true)
      const res = await api.post('/admin/shop-owners', createOwnerForm)
      toast.success(`Shop Owner & Shop created successfully!`)
      setCreatedCredentials(res.data.data)
      setShowCreateShopOwnerModal(false)
      setCreateOwnerForm({ ownerName: '', ownerEmail: '', shopName: '', shopPhone: '', shopAddress: '' })
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to provision shop owner')
    } finally {
      setActionLoading(false)
    }
  }

  // Impersonate / "Login As"
  const handleImpersonate = async (targetUser) => {
    if (
      !window.confirm(
        `SUPPORT IMPERSONATION WARNING:\n\nYou are about to log in as ${targetUser.name} (${targetUser.email}).\n\nThis will issue a temporary 15-minute access session and record an IMPERSONATION_START security audit log.\n\nProceed?`
      )
    )
      return

    try {
      setActionLoading(true)
      const res = await api.post(`/admin/users/${targetUser.id}/impersonate`)
      const { accessToken, user } = res.data.data

      // Save original admin tokens
      localStorage.setItem('originalAdminAccessToken', localStorage.getItem('accessToken'))
      localStorage.setItem('originalAdminRefreshToken', localStorage.getItem('refreshToken'))
      localStorage.setItem('originalAdminUser', JSON.stringify(currentAdmin))
      localStorage.setItem('impersonationActive', 'true')
      localStorage.setItem('impersonatedUser', JSON.stringify(user))

      // Switch to impersonated user token
      localStorage.setItem('accessToken', accessToken)
      updateUser(user)

      toast.success(`Now viewing platform as ${user.name || user.email}`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate impersonation')
    } finally {
      setActionLoading(false)
    }
  }

  // Admin Note Save
  const handleSaveAdminNote = async () => {
    if (!noteUser) return
    try {
      setNoteLoading(true)
      await api.patch(`/admin/users/${noteUser.id}/notes`, { note: noteContent })
      toast.success(`Internal note updated for ${noteUser.email}`)
      setNoteUser(null)
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update note')
    } finally {
      setNoteLoading(false)
    }
  }

  // Session Limit Save
  const handleSaveSessionLimit = async () => {
    if (!limitUser) return
    try {
      setLimitLoading(true)
      await api.patch(`/admin/users/${limitUser.id}/session-limit`, {
        maxActiveSessions: sessionLimitVal ? parseInt(sessionLimitVal, 10) : null,
      })
      toast.success(`Session limit updated for ${limitUser.email}`)
      setLimitUser(null)
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update session limit')
    } finally {
      setLimitLoading(false)
    }
  }

  // Password Reset
  const handleResetPassword = async (user) => {
    if (!window.confirm(`Issue administrative password reset for ${user.email}? This will revoke all active sessions.`)) return
    try {
      setActionLoading(true)
      const res = await api.post(`/admin/users/${user.id}/reset-password`)
      setResetResult(res.data.data)
      toast.success(`Temporary password generated for ${user.email}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setActionLoading(false)
    }
  }

  // Status Change
  const handleUpdateStatus = async (user, newStatus) => {
    const actionText = newStatus === 'SUSPENDED' ? 'suspend' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${actionText} ${user.email}?`)) return
    try {
      setActionLoading(true)
      await api.patch(`/admin/users/${user.id}`, { status: newStatus })
      toast.success(`User ${user.email} status updated to ${newStatus}`)
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete User
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`PERMANENT DELETION:\nAre you sure you want to delete ${user.email}? This cannot be undone.`)) return
    try {
      setActionLoading(true)
      await api.delete(`/admin/users/${user.id}`)
      toast.success(`User ${user.email} deleted`)
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user')
    } finally {
      setActionLoading(false)
    }
  }

  // Sessions Modal
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

  const handleRevokeSession = async (sessionId) => {
    try {
      await api.post(`/admin/sessions/${sessionId}/revoke`)
      toast.success('Session revoked')
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err) {
      toast.error('Failed to revoke session')
    }
  }

  const handleRevokeAllSessions = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/revoke-all-sessions`)
      toast.success('All active sessions terminated')
      setSessions([])
    } catch (err) {
      toast.error('Failed to revoke sessions')
    }
  }

  // History Modal
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
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  // Export CSV
  const handleExportCsv = () => {
    const columns = [
      { label: 'User ID', key: 'id' },
      { label: 'Name', key: 'name' },
      { label: 'Email', key: 'email' },
      { label: 'Role', key: 'role' },
      { label: 'Status', key: 'status' },
      { label: 'Shop Name', accessor: (u) => u.shopUsers?.[0]?.shop?.name || '' },
      { label: 'Shop Code', accessor: (u) => u.shopUsers?.[0]?.shop?.shopCode || '' },
      { label: 'Max Active Sessions', accessor: (u) => u.maxActiveSessions ?? 'Default (3)' },
      { label: 'Admin Note', key: 'adminNote' },
      { label: 'Last Login', accessor: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : '') },
      { label: 'Created At', accessor: (u) => new Date(u.createdAt).toISOString() },
    ]

    const success = exportToCsv(`smartprint_users_${new Date().toISOString().slice(0, 10)}`, users, columns)
    if (success) {
      toast.success(`Exported ${users.length} users to CSV`)
    } else {
      toast.error('No users to export')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Users className="text-[#007AFF] dark:text-[#0A84FF]" size={22} strokeWidth={2} />
            <span>Platform User Accounts & Access Controls</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Directory of shop owners, managers, staff, and super administrators with session monitoring and bulk controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={users.length === 0}
            className="text-xs"
          >
            <Download size={13} strokeWidth={1.75} />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddUserModal(true)}
            className="text-xs"
          >
            <UserPlus size={14} strokeWidth={2} />
            <span>Add User</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateShopOwnerModal(true)}
            className="text-xs"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Provision Shop Owner</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadUsers}
            loading={loading}
            className="text-xs"
          >
            <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              loadUsers()
            }}
            className="relative w-full md:w-80"
          >
            <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search by name, email, shop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 h-9 text-xs w-full"
            />
          </form>

          {/* Role Filters */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto scrollbar-none pb-1 md:pb-0">
            {['ALL', 'OWNER', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                  roleFilter === r
                    ? 'bg-[#007AFF] text-white shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Row: Status, Date Range */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input h-8 text-xs py-1 px-2 w-auto font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium">Created:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input h-8 text-xs py-1 px-2 w-auto"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input h-8 text-xs py-1 px-2 w-auto"
            />
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                  loadUsers()
                }}
                className="text-xs h-7 px-2"
              >
                Clear Dates
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Bulk Action Bar */}
      {selectedUserIds.length > 0 && (
        <div className="bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 border border-[#007AFF]/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-scaleIn">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF]">
            <Check size={16} strokeWidth={2.5} />
            <span>{selectedUserIds.length} user account{selectedUserIds.length > 1 ? 's' : ''} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('ACTIVATE')}
              className="text-xs h-7 px-2.5 text-emerald-600"
            >
              <UserCheck size={12} strokeWidth={2} />
              <span>Bulk Reactivate</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('SUSPEND')}
              className="text-xs h-7 px-2.5 text-red-600"
            >
              <UserX size={12} strokeWidth={2} />
              <span>Bulk Suspend</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('REVOKE_SESSIONS')}
              className="text-xs h-7 px-2.5 text-amber-600"
            >
              <Laptop size={12} strokeWidth={2} />
              <span>Bulk Force Logout</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUserIds([])}
              className="text-xs h-7 px-2 text-[var(--text-muted)]"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={7} cols={8} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="No user accounts match the current filters or search criteria."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUserIds.length === users.length}
                    onChange={handleSelectAll}
                    className="rounded border-[var(--border)] text-[#007AFF] cursor-pointer"
                    aria-label="Select all users"
                  />
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <span>User</span>
                    <ArrowUpDown size={11} />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('email')}
                    className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <span>Email & ID</span>
                    <ArrowUpDown size={11} />
                  </button>
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <span>Status</span>
                    <ArrowUpDown size={11} />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('lastLoginAt')}
                    className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <span>Last Login</span>
                    <ArrowUpDown size={11} />
                  </button>
                </TableHead>
                <TableHead className="text-right">Master Controls</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const shop = u.shopUsers?.[0]?.shop
                const isSelected = selectedUserIds.includes(u.id)

                return (
                  <TableRow
                    key={u.id}
                    className={isSelected ? 'bg-[#007AFF]/5 dark:bg-[#0A84FF]/10' : ''}
                  >
                    {/* Checkbox */}
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectUser(u.id)}
                        className="rounded border-[var(--border)] text-[#007AFF] cursor-pointer"
                        aria-label={`Select user ${u.email}`}
                      />
                    </TableCell>

                    {/* Name + Note Indicator */}
                    <TableCell>
                      <div>
                        <div className="font-bold text-xs text-[var(--text)] flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.adminNote && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-500"
                              title={`Admin Note: ${u.adminNote}`}
                            />
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          ID: #{u.id} • Max Sessions: {u.maxActiveSessions ?? '3 (Default)'}
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      <div className="font-mono text-xs text-[var(--text)] truncate max-w-[180px]">
                        {u.email}
                      </div>
                      {u.mustChangePassword && (
                        <span className="text-[10px] text-amber-500 font-semibold block">
                          Must change password
                        </span>
                      )}
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge
                        variant={
                          u.role === 'SUPER_ADMIN' ? 'red' : u.role === 'OWNER' ? 'blue' : 'gray'
                        }
                      >
                        {u.role}
                      </Badge>
                    </TableCell>

                    {/* Shop */}
                    <TableCell>
                      {shop ? (
                        <div>
                          <span className="font-semibold text-xs text-[var(--text)] block truncate max-w-[140px]">
                            {shop.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#007AFF] dark:text-[#0A84FF] block">
                            {shop.shopCode}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">-</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={
                          u.status === 'ACTIVE'
                            ? 'green'
                            : u.status === 'SUSPENDED'
                            ? 'red'
                            : 'yellow'
                        }
                        dot
                      >
                        {u.status}
                      </Badge>
                    </TableCell>

                    {/* Last Login */}
                    <TableCell className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </TableCell>

                    {/* Master Controls */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Impersonate / Login As */}
                        {u.role !== 'SUPER_ADMIN' && u.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleImpersonate(u)}
                            title="Login As / Impersonate for Support (15-min session)"
                            className="p-1.5 rounded-lg border border-[#007AFF]/30 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#0A84FF] transition-colors cursor-pointer"
                          >
                            <LogIn size={13} strokeWidth={2} />
                          </button>
                        )}

                        {/* Admin Internal Note */}
                        <button
                          onClick={() => {
                            setNoteUser(u)
                            setNoteContent(u.adminNote || '')
                          }}
                          title="Internal Admin-Only Note"
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            u.adminNote
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                              : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <FileEdit size={13} strokeWidth={1.75} />
                        </button>

                        {/* Session Limit Config */}
                        <button
                          onClick={() => {
                            setLimitUser(u)
                            setSessionLimitVal(u.maxActiveSessions !== null ? String(u.maxActiveSessions) : '')
                          }}
                          title="Configure Max Active Sessions"
                          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        >
                          <Sliders size={13} strokeWidth={1.75} />
                        </button>

                        {/* Sessions Modal */}
                        <button
                          onClick={() => openSessionsModal(u)}
                          title="Inspect Active Device Sessions"
                          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        >
                          <Laptop size={13} strokeWidth={1.75} />
                        </button>

                        {/* Login History Modal */}
                        <button
                          onClick={() => openHistoryModal(u)}
                          title="View Login History & Audit Trail"
                          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        >
                          <History size={13} strokeWidth={1.75} />
                        </button>

                        {/* Password Reset */}
                        <button
                          onClick={() => handleResetPassword(u)}
                          title="Reset Password (Generates temp password & forces change)"
                          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        >
                          <KeyRound size={13} strokeWidth={1.75} />
                        </button>

                        {/* Status Toggle */}
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateStatus(u, 'SUSPENDED')}
                            title="Suspend Account"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                          >
                            <UserX size={12} strokeWidth={1.75} />
                            <span>Suspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(u, 'ACTIVE')}
                            title="Reactivate Account"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer"
                          >
                            <UserCheck size={12} strokeWidth={1.75} />
                            <span>Activate</span>
                          </button>
                        )}

                        {/* Delete User */}
                        {u.id !== currentAdmin.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Permanently Delete User"
                            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-500/15 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── ADMIN NOTE MODAL ── */}
      <Modal
        isOpen={!!noteUser}
        onClose={() => setNoteUser(null)}
        title={`Admin Internal Note: ${noteUser?.email}`}
        subtitle="Confidential admin remarks — NEVER visible to shop owners or customers"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="label">Internal Remarks & Follow-ups</label>
            <textarea
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="e.g. Called owner regarding overdue invoice. Verified shop phone."
              className="input h-auto min-h-[100px] py-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={() => setNoteUser(null)} disabled={noteLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAdminNote} loading={noteLoading}>
              Save Note
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── SESSION LIMIT CONFIGURATION MODAL ── */}
      <Modal
        isOpen={!!limitUser}
        onClose={() => setLimitUser(null)}
        title={`Session Limit: ${limitUser?.email}`}
        subtitle="Restrict concurrent active login sessions to stop credential sharing"
      >
        <div className="space-y-4">
          <Input
            label="Maximum Concurrent Active Sessions"
            type="number"
            min="1"
            max="20"
            placeholder="Leave blank for system default (3)"
            value={sessionLimitVal}
            onChange={(e) => setSessionLimitVal(e.target.value)}
            hint="When this limit is exceeded upon new login, the oldest active session is automatically revoked."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={() => setLimitUser(null)} disabled={limitLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveSessionLimit} loading={limitLoading}>
              Update Limit
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── ACTIVE SESSIONS MODAL ── */}
      <Modal
        isOpen={!!selectedUserForSessions}
        onClose={() => setSelectedUserForSessions(null)}
        title={`Active Sessions: ${selectedUserForSessions?.email}`}
        subtitle="Inspect authenticated browser sessions and terminate active credentials"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {sessions.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRevokeAllSessions(selectedUserForSessions.id)}
                className="text-xs"
              >
                Revoke All Active Sessions
              </Button>
            </div>
          )}

          {sessionsLoading ? (
            <TableSkeleton rows={3} cols={3} />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={Laptop}
              title="No active sessions found"
              description="This user currently has no active authenticated refresh tokens."
            />
          ) : (
            <div className="divide-y divide-[var(--border)] max-h-96 overflow-y-auto">
              {sessions.map((sess) => (
                <div key={sess.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text)]">
                        {parseUserAgent(sess.userAgent)}
                      </span>
                      <Badge variant="green" dot>Active</Badge>
                    </div>
                    <p className="font-mono text-[11px] text-[var(--text-muted)]">
                      IP: {sess.ipAddress || 'Unknown IP'} • Created: {new Date(sess.createdAt).toLocaleString()}
                    </p>
                    {sess.lastUsedAt && (
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">
                        Last Activity: {new Date(sess.lastUsedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRevokeSession(sess.id)}
                    className="text-xs h-7 px-2"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── LOGIN HISTORY MODAL ── */}
      <Modal
        isOpen={!!selectedUserForHistory}
        onClose={() => setSelectedUserForHistory(null)}
        title={`Login History: ${selectedUserForHistory?.email}`}
        subtitle="Recent authentication attempts and security audit trail"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {historyLoading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : historyLogs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No login events recorded"
              description="No authentication history records found for this account."
            />
          ) : (
            <div className="divide-y divide-[var(--border)] max-h-96 overflow-y-auto">
              {historyLogs.map((log) => {
                const isSuccess = log.action === 'LOGIN_SUCCESS'
                return (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isSuccess ? 'green' : 'red'} dot>
                          {log.action}
                        </Badge>
                        <span className="font-semibold text-[var(--text)]">
                          {parseUserAgent(log.userAgent)}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                        IP: {log.ipAddress || 'N/A'} • {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {isSuccess ? 'Authorized' : log.newData?.reason || 'Rejected'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ── PROVISION SHOP OWNER MODAL ── */}
      <Modal
        isOpen={showCreateShopOwnerModal}
        onClose={() => setShowCreateShopOwnerModal(false)}
        title="Provision New Shop Owner Account"
        subtitle="Creates shop owner credentials, registers shop, and issues temporary access"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateOwnerSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Owner Full Name *"
              required
              value={createOwnerForm.ownerName}
              onChange={(e) => setCreateOwnerForm({ ...createOwnerForm, ownerName: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
            />
            <Input
              label="Owner Email Address *"
              type="email"
              required
              value={createOwnerForm.ownerEmail}
              onChange={(e) => setCreateOwnerForm({ ...createOwnerForm, ownerEmail: e.target.value })}
              placeholder="e.g. ramesh@printhub.com"
            />
          </div>

          <Input
            label="Shop Name *"
            required
            value={createOwnerForm.shopName}
            onChange={(e) => setCreateOwnerForm({ ...createOwnerForm, shopName: e.target.value })}
            placeholder="e.g. Apex Fast Print Hub"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Shop Phone"
              value={createOwnerForm.shopPhone}
              onChange={(e) => setCreateOwnerForm({ ...createOwnerForm, shopPhone: e.target.value })}
              placeholder="+91 9876543210"
            />
            <Input
              label="Shop Address"
              value={createOwnerForm.shopAddress}
              onChange={(e) => setCreateOwnerForm({ ...createOwnerForm, shopAddress: e.target.value })}
              placeholder="Room 101, Complex B"
            />
          </div>

          <div className="p-3 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-[var(--border)] text-xs text-[var(--text-muted)] space-y-1">
            <p className="font-semibold text-[var(--text)]">Administrative Security Notice:</p>
            <p>&bull; A strong 12-character temporary password is generated automatically.</p>
            <p>&bull; <code className="text-[#007AFF]">mustChangePassword</code> is enabled by default.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowCreateShopOwnerModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={actionLoading}>
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── ADD USER MODAL (ANY ROLE) ── */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Create Platform User Account"
        subtitle="Add any user role (Owner, Manager, Staff, Super Admin)"
      >
        <form onSubmit={handleAddUserSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            required
            value={addUserForm.name}
            onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
            placeholder="e.g. John Doe"
          />

          <Input
            label="Email Address *"
            type="email"
            required
            value={addUserForm.email}
            onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
            placeholder="user@example.com"
          />

          <Input
            label="Custom Password (Optional)"
            type="password"
            placeholder="Leave empty to auto-generate temporary password"
            value={addUserForm.password}
            onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">User Role</label>
              <select
                value={addUserForm.role}
                onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                className="input text-xs"
              >
                <option value="OWNER">OWNER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="STAFF">STAFF</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Account Status</label>
              <select
                value={addUserForm.status}
                onChange={(e) => setAddUserForm({ ...addUserForm, status: e.target.value })}
                className="input text-xs"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="label">Associated Shop (Optional)</label>
            <select
              value={addUserForm.shopId}
              onChange={(e) => setAddUserForm({ ...addUserForm, shopId: e.target.value })}
              className="input text-xs"
            >
              <option value="">-- No Shop Associated --</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.shopCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowAddUserModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={actionLoading}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── SHOW CREATED CREDENTIALS MODAL ── */}
      <Modal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Account Credentials Issued"
        subtitle="Copy credentials now — shown only once"
      >
        <div className="space-y-4">
          <div className="p-4 bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)] rounded-xl space-y-2 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Login ID (Email):</span>
              <p className="font-mono font-semibold text-[var(--text)] select-all">
                {createdCredentials?.user?.email}
              </p>
            </div>
            {createdCredentials?.shop && (
              <div>
                <span className="text-[var(--text-muted)]">Shop Code:</span>
                <p className="font-mono font-semibold text-[#007AFF] select-all">
                  {createdCredentials.shop?.shopCode}
                </p>
              </div>
            )}
            {createdCredentials?.temporaryPassword && (
              <div>
                <span className="text-[var(--text-muted)]">Temporary Password:</span>
                <p className="font-mono font-bold text-sm text-amber-500 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 select-all tracking-wider mt-1">
                  {createdCredentials.temporaryPassword}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                copyToClipboard(
                  `SmartPrint Account Provisioned\nEmail: ${createdCredentials?.user?.email}\nPassword: ${
                    createdCredentials?.temporaryPassword || '(Manual)'
                  }\n${createdCredentials?.shop?.shopCode ? `Shop Code: ${createdCredentials.shop.shopCode}` : ''}`
                )
              }
              className="flex-1 text-xs"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Credentials'}</span>
            </Button>
            <Button variant="primary" onClick={() => setCreatedCredentials(null)} className="text-xs">
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── RESET PASSWORD RESULT MODAL ── */}
      <Modal
        isOpen={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Password Reset Complete"
        subtitle="Temporary password generated. Active sessions revoked."
      >
        <div className="space-y-4">
          <div className="p-4 bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)] rounded-xl space-y-2 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Account:</span>
              <p className="font-mono font-semibold text-[var(--text)] select-all">{resetResult?.email}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">New Temporary Password:</span>
              <p className="font-mono font-bold text-sm text-amber-500 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 select-all tracking-wider mt-1">
                {resetResult?.temporaryPassword}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                copyToClipboard(
                  `SmartPrint Password Reset\nEmail: ${resetResult?.email}\nTemporary Password: ${resetResult?.temporaryPassword}`
                )
              }
              className="flex-1 text-xs"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Password'}</span>
            </Button>
            <Button variant="primary" onClick={() => setResetResult(null)} className="text-xs">
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
