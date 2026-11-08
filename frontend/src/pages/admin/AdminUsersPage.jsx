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
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-primary-600" size={24} />
            Platform User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage user accounts, assign roles (Super Admin, Owner, Staff), and enforce access controls.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-surface-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-surface-50 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={(e) => { e.preventDefault(); loadUsers(); }} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'OWNER', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                roleFilter === r
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-surface-50 text-slate-600 hover:bg-surface-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 text-slate-500 border-b border-surface-100 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Affiliated Shops</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700 font-medium">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No users match criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.name || 'Unnamed'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="px-2 py-1 bg-surface-50 border border-surface-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="STAFF">STAFF</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {u.shopUsers && u.shopUsers.length > 0 ? (
                        u.shopUsers.map((su) => su.shop?.name).join(', ')
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={actionLoading}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? <UserX size={13} /> : <UserCheck size={13} />}
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
