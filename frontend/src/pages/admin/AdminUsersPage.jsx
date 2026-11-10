import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
} from 'lucide-react'
import api from '../../lib/api'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState(false)

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  const handleUpdateRole = async (userId, role) => {
    try {
      setActionLoading(true)
      await api.patch(`/admin/users/${userId}`, { role })
      await loadUsers()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    if (!window.confirm(`Are you sure you want to change user status to ${newStatus}?`)) return

    try {
      setActionLoading(true)
      await api.patch(`/admin/users/${user.id}`, { status: newStatus })
      await loadUsers()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Users className="text-[#0E7490]" size={18} strokeWidth={1.75} />
            Platform User Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Manage user accounts, assign roles (Super Admin, Owner, Staff), and enforce access controls.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
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
                <th className="py-2.5 px-4">Affiliated Shops</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                    No users match criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-11">
                    <td className="py-2.5 px-4 font-semibold text-xs text-[var(--text)]">{u.name || 'Unnamed'}</td>
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
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={actionLoading}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? <UserX size={12} strokeWidth={1.75} /> : <UserCheck size={12} strokeWidth={1.75} />}
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
