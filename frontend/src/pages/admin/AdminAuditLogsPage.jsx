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
      const payload = res.data?.data;
      setLogs(Array.isArray(payload) ? payload : (payload?.logs || []));
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
    const payloadStr = JSON.stringify(log.newData || log.details || log.oldData || '');
    const matchesSearch =
      !search ||
      (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
      payloadStr.toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.email && log.user.email.toLowerCase().includes(search.toLowerCase())) ||
      (log.user?.name && log.user.name.toLowerCase().includes(search.toLowerCase())) ||
      (log.shop?.name && log.shop.name.toLowerCase().includes(search.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.includes(search));

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const standardActions = [
    'ALL',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'CREATE_SHOP_OWNER',
    'RESET_PASSWORD',
    'PASSWORD_CHANGED',
    'USER_UPDATED',
    'REVOKE_SESSION',
    'REVOKE_ALL_SESSIONS',
    'SHOP_ACTIVE',
    'SHOP_SUSPENDED',
  ];
  const dynamicActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));
  const allActionOptions = Array.from(new Set([...standardActions, ...dynamicActions]));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-[#0E7490]" size={18} strokeWidth={1.75} />
            Security & System Audit Logs
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Immutable platform events, authentication audits, administrative operations, and security logs.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150 self-start sm:self-auto"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh Logs
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
            placeholder="Filter by actor email, user name, target shop, IP, or payload..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 sm:w-72">
          <Filter className="text-[var(--text-muted)] shrink-0" size={14} strokeWidth={1.75} />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input h-9 text-xs font-medium"
          >
            {allActionOptions.map((act) => (
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
            <p className="text-xs mt-1 text-[var(--text-muted)]">Audit events will appear here as administrative and authentication events occur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Target Shop / Resource</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
                {filteredLogs.map((log) => {
                  const isFailedLogin = log.action === 'LOGIN_FAILED';
                  const isSuccessLogin = log.action === 'LOGIN_SUCCESS';
                  const isSecurityAction = ['RESET_PASSWORD', 'REVOKE_SESSION', 'REVOKE_ALL_SESSIONS', 'USER_UPDATED'].includes(log.action);

                  return (
                    <tr key={log.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-11">
                      <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border font-semibold text-[11px] ${
                            isFailedLogin
                              ? 'bg-red-500/10 text-red-600 border-red-500/20'
                              : isSuccessLogin
                              ? 'bg-green-500/10 text-green-600 border-green-500/20'
                              : isSecurityAction
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-[var(--accent-tint)] text-[#0E7490] border-[#0E7490]/20'
                          }`}
                        >
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
                          <span className="text-[var(--text-muted)] italic">System / Anonymous</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[var(--text)]">
                        {log.shop ? (
                          <span className="font-medium">{log.shop.name}</span>
                        ) : log.resource ? (
                          <span className="font-mono text-[var(--text-muted)]">{log.resource}:{log.resourceId || '-'}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono text-[var(--text-muted)]">
                        {log.ipAddress || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] max-w-sm truncate font-mono">
                        {log.newData || log.details ? (
                          JSON.stringify(log.newData || log.details)
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
