import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, FileText, Filter, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/audit-logs');
      setLogs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase())) ||
      (log.user?.email && log.user.email.toLowerCase().includes(search.toLowerCase())) ||
      (log.shop?.name && log.shop.name.toLowerCase().includes(search.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.includes(search));

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = ['ALL', ...new Set(logs.map((l) => l.action).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-[#0E7490]" size={18} strokeWidth={1.75} />
            Security & System Audit Logs
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Immutable system event logs, administrative actions, and security audit records.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150 self-start sm:self-auto"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search action, user, shop, IP, or payload details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 sm:w-64">
          <Filter className="text-[var(--text-muted)] shrink-0" size={14} strokeWidth={1.75} />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input h-9 text-xs font-medium"
          >
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act === 'ALL' ? 'All Actions' : act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">
            <FileText size={32} strokeWidth={1.5} className="text-[var(--border)] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--text)]">No audit logs found</p>
            <p className="text-xs mt-1 text-[var(--text-muted)]">Audit events will appear here as administrative actions occur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Target Shop</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-11">
                    <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-[var(--accent-tint)] text-[#0E7490] border border-[#0E7490]/20 font-semibold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      {log.user ? (
                        <div>
                          <div className="font-semibold text-[var(--text)]">{log.user.name || log.user.email}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{log.user.role}</div>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] italic">System</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[var(--text)]">
                      {log.shop ? log.shop.name : log.shopId ? String(log.shopId).slice(0, 8) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono text-[var(--text-muted)]">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] max-w-xs truncate font-mono">
                      {log.details ? (
                        typeof log.details === 'string' ? log.details : JSON.stringify(log.details)
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
