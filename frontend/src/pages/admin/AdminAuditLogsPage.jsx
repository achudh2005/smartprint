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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-indigo-600" />
            Security & System Audit Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Immutable system event logs, administrative actions, and security audit records.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search action, user, shop, IP, or payload details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 sm:w-64">
          <Filter className="w-5 h-5 text-gray-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-700">No audit logs found</p>
            <p className="text-sm mt-1">Audit events will appear here as administrative actions occur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Shop</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-gray-900">{log.user.name || log.user.email}</div>
                          <div className="text-gray-400">{log.user.role}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-700">
                      {log.shop ? log.shop.name : log.shopId ? String(log.shopId).slice(0, 8) : '-'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-500">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate font-mono">
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
