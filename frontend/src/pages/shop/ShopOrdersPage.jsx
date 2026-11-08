import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User } from 'lucide-react';
import api from '../../lib/api';
import ShopNavTabs from '../../components/shop/ShopNavTabs';
import { subscribeToShopEvents } from '../../lib/socket';

const ALL_STATUSES = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'PAYMENT_PENDING',
  'ACCEPTED',
  'PRINTING',
  'PRINTED',
  'READY',
  'COLLECTED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED'
];

export default function ShopOrdersPage() {
  const { shopId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 15,
        search: searchQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: activeTab !== 'ALL' ? activeTab : undefined
      };

      const res = await api.get(`/shops/${shopId}/orders`, { params });
      if (res.data.success) {
        setOrders(res.data.data.orders);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalCount(res.data.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [shopId, page, activeTab, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const unsubscribe = subscribeToShopEvents(shopId, {
      onNewOrder: (newOrder) => {
        // Prepend new order if it matches active filter
        setOrders((prev) => {
          if (prev.some((o) => o.id === newOrder.id)) return prev;
          if (activeTab === 'ALL' || activeTab === newOrder.status) {
            return [newOrder, ...prev];
          }
          return prev;
        });
        setTotalCount((c) => c + 1);
      },
      onStatusChanged: ({ orderId, status }) => {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      }
    });

    return () => unsubscribe();
  }, [shopId, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setActiveTab('ALL');
    setPage(1);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ACCEPTED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'PRINTING':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'PRINTED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'READY':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'COLLECTED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PAYMENT_PENDING':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'EXPIRED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getPaymentBadge = (status, method) => {
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
    if (status === 'COUNTER_PAYMENT_COLLECTED') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
    if (status === 'COUNTER_PAYMENT_DUE' || method === 'COUNTER') {
      return 'bg-amber-50 text-amber-800 border-amber-300';
    }
    if (status === 'PAYMENT_PENDING' || status === 'PENDING') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (status === 'FAILED') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time feed of print orders, live status updates, and production tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <ShopNavTabs shopId={shopId} />

      {/* Filter Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto scrollbar-thin">
        <nav className="flex space-x-1 py-1" aria-label="Order Status Tabs">
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => {
                setActiveTab(status);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === status
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Search Order Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. SP-2026-..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-700"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-700"
            />
          </div>

          <div className="md:col-span-1 flex gap-2">
            <button
              type="submit"
              className="w-full px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
              title="Apply Filters"
            >
              Filter
            </button>
            {(searchQuery || startDate || endDate || activeTab !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                title="Reset Filters"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Orders List <span className="text-slate-400 font-normal">({totalCount} found)</span>
          </h2>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-slate-500 font-medium">Socket.IO Live</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-8 h-8 animate-spin mb-3 text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-sm">Fetching orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-700">No orders found</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              There are no orders matching your current filter criteria or status tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Order</th>
                  <th className="px-6 py-3.5">Time</th>
                  <th className="px-6 py-3.5">Files & Pages</th>
                  <th className="px-6 py-3.5">Total</th>
                  <th className="px-6 py-3.5">Payment</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Expiry</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const isExpired = o.status === 'EXPIRED' || (o.expiresAt && new Date(o.expiresAt) < new Date() && !['COLLECTED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(o.status));
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/shops/${shopId}/orders/${o.id}`}
                          className="font-mono font-bold text-brand-600 hover:text-brand-700 hover:underline block"
                        >
                          {o.orderNumber}
                        </Link>
                        <div className="text-xs text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                          <User size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px] font-semibold text-slate-800">
                            {o.session?.customerName || o.customerName || 'Anonymous'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        <div>{new Date(o.createdAt).toLocaleDateString()}</div>
                        <div className="text-slate-400">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">
                          {o.fileCount || o.files?.length || 1} file(s)
                        </div>
                        <div className="text-xs text-slate-400">
                          {o.totalPages || 0} page(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        ₹ {Number(o.totalAmount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${getPaymentBadge(o.paymentStatus, o.paymentMethod)}`}>
                          {o.paymentStatus === 'SUCCESS' || o.paymentStatus === 'COMPLETED' ? (
                            <>💳 Paid Online</>
                          ) : o.paymentStatus === 'COUNTER_PAYMENT_COLLECTED' ? (
                            <>✅ Counter Paid</>
                          ) : o.paymentStatus === 'COUNTER_PAYMENT_DUE' || o.paymentMethod === 'COUNTER' ? (
                            <>🏪 Pay at Counter</>
                          ) : o.paymentStatus === 'PAYMENT_PENDING' ? (
                            <>⏳ Online Pending</>
                          ) : (
                            <>{o.paymentStatus || 'Pending'}</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {isExpired ? (
                          <span className="text-rose-600 font-semibold">Expired</span>
                        ) : o.expiresAt ? (
                          <span className="text-slate-500 font-mono">
                            {new Date(o.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          to={`/shops/${shopId}/orders/${o.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                        >
                          <span>Manage</span>
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
