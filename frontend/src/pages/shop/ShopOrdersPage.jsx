import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, ArrowUpDown, ArrowDown, ArrowUp, Clock, Filter, Sparkles, RefreshCw, ShoppingBag } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Latest First

  // Client-side sort helper to keep list sorted at all times
  const sortOrdersList = useCallback((list, field, direction) => {
    return [...list].sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (field === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (field === 'totalAmount') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else if (typeof valA === 'string') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, []);

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
        status: activeTab !== 'ALL' ? activeTab : undefined,
        sortBy,
        sortOrder,
      };

      const res = await api.get(`/shops/${shopId}/orders`, { params });
      if (res.data.success) {
        const fetchedOrders = res.data.data.orders || [];
        const sorted = sortOrdersList(fetchedOrders, sortBy, sortOrder);
        setOrders(sorted);
        const tot = res.data.data.pagination?.total ?? res.data.data.total ?? fetchedOrders.length;
        const tPages = res.data.data.pagination?.totalPages ?? Math.max(1, Math.ceil(tot / 15));
        setTotalPages(tPages);
        setTotalCount(tot);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [shopId, page, activeTab, searchQuery, startDate, endDate, sortBy, sortOrder, sortOrdersList]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const unsubscribe = subscribeToShopEvents(shopId, {
      onNewOrder: (newOrder) => {
        setOrders((prev) => {
          if (prev.some((o) => o.id === newOrder.id)) return prev;
          if (activeTab === 'ALL' || activeTab === newOrder.status) {
            const updated = [newOrder, ...prev];
            return sortOrdersList(updated, sortBy, sortOrder);
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
  }, [shopId, activeTab, sortBy, sortOrder, sortOrdersList]);

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
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const handleSortColumn = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'orderNumber' || field === 'status' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return { cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' };
      case 'CONFIRMED':
        return { cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500' };
      case 'ACCEPTED':
        return { cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500' };
      case 'PRINTING':
      case 'PROCESSING':
        return { cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800', dot: 'bg-purple-500' };
      case 'PRINTED':
      case 'READY':
        return { cls: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800', dot: 'bg-cyan-500' };
      case 'COLLECTED':
      case 'COMPLETED':
        return { cls: 'bg-green-50 text-[#15803D] border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800', dot: 'bg-green-500' };
      case 'PAYMENT_PENDING':
        return { cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800', dot: 'bg-orange-500' };
      case 'REJECTED':
      case 'CANCELLED':
        return { cls: 'bg-red-50 text-[#B91C1C] border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500' };
      case 'EXPIRED':
        return { cls: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700', dot: 'bg-zinc-400' };
      default:
        return { cls: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700', dot: 'bg-zinc-400' };
    }
  };

  const getPaymentBadge = (status, method) => {
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      return 'bg-green-50 text-[#15803D] border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    }
    if (status === 'COUNTER_PAYMENT_COLLECTED') {
      return 'bg-green-50 text-[#15803D] border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    }
    if (status === 'COUNTER_PAYMENT_DUE' || method === 'COUNTER') {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
    }
    if (status === 'PAYMENT_PENDING' || status === 'PENDING') {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
    }
    if (status === 'FAILED') {
      return 'bg-red-50 text-[#B91C1C] border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    }
    return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight">Order Management</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time feed of print orders, live status updates, and production tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors duration-150"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <ShopNavTabs shopId={shopId} />

      {/* Filter Tabs */}
      <div className="border-b border-[var(--border)] overflow-x-auto">
        <nav className="flex" aria-label="Order Status Tabs">
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => {
                setActiveTab(status);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                activeTab === status
                  ? 'text-[#0E7490] border-b-2 border-[#0E7490]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* Search, Sort & Date Filter Bar */}
      <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Search Order / Customer
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. ORD-... or customer name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[#22D3EE]/30 focus:border-[#0E7490]"
              />
              <svg className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1 flex items-center justify-between">
              <span>Sort Orders</span>
              {sortBy === 'createdAt' && sortOrder === 'desc' && (
                <span className="text-[10px] text-[#0E7490] font-semibold bg-[var(--accent-tint)] px-1.5 py-0.5 rounded">Latest Wise Active</span>
              )}
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(dir);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[#22D3EE]/30 focus:border-[#0E7490] text-[var(--text)] bg-[var(--surface)] font-medium"
            >
              <option value="createdAt-desc">Latest First (Newest)</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="totalAmount-desc">Total Amount (Highest)</option>
              <option value="totalAmount-asc">Total Amount (Lowest)</option>
              <option value="status-asc">Status (A-Z)</option>
              <option value="orderNumber-desc">Order Number (Z-A)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[#22D3EE]/30 focus:border-[#0E7490] text-[var(--text)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[#22D3EE]/30 focus:border-[#0E7490] text-[var(--text)]"
            />
          </div>

          <div className="md:col-span-1 flex gap-2">
            <button
              type="submit"
              className="w-full px-3 py-2 text-sm font-medium text-white bg-[#0E7490] rounded-lg hover:bg-[#155E75] transition-colors duration-150"
              title="Apply Filters"
            >
              Filter
            </button>
            {(searchQuery || startDate || endDate || activeTab !== 'ALL' || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 text-sm text-[var(--text-muted)] bg-[var(--surface-hover)] rounded-lg hover:bg-[var(--border)] transition-colors duration-150"
                title="Reset Filters & Sorting to Latest First"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Orders List <span className="text-[var(--text-muted)] font-normal">({totalCount} found)</span>
            </h2>
            {sortBy === 'createdAt' && sortOrder === 'desc' && (
              <span className="inline-flex items-center gap-0.5 text-[#0E7490] font-semibold normal-case text-[11px] bg-[var(--accent-tint)] px-1.5 py-0.5 rounded">
                <Sparkles size={11} /> Sorted: Latest First
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Live</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[#0E7490] rounded-full animate-spin" />
            <p className="text-sm">Fetching orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <ShoppingBag size={32} strokeWidth={1.5} className="text-[var(--border)] mx-auto mb-3" />
            <p className="text-base font-semibold text-[var(--text)]">No orders found</p>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
              There are no orders matching your current filter criteria or status tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text)]">
              <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider border-b border-[var(--border)] select-none sticky top-0 z-10">
                <tr>
                  <th
                    onClick={() => handleSortColumn('orderNumber')}
                    className="px-4 py-3 cursor-pointer hover:bg-[var(--border)]/30 transition-colors duration-150"
                    title="Click to sort by Order Number"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Order</span>
                      {sortBy === 'orderNumber' ? (
                        sortOrder === 'asc' ? <ArrowUp size={13} className="text-[#0E7490]" /> : <ArrowDown size={13} className="text-[#0E7490]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-[var(--border)] hover:text-[var(--text-muted)]" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortColumn('createdAt')}
                    className="px-4 py-3 cursor-pointer hover:bg-[var(--border)]/30 transition-colors duration-150"
                    title="Click to sort by Time (Latest/Oldest)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Time</span>
                      {sortBy === 'createdAt' ? (
                        sortOrder === 'desc' ? (
                          <span className="inline-flex items-center gap-0.5 text-[#0E7490] font-semibold normal-case text-[11px] bg-[var(--accent-tint)] px-1.5 py-0.5 rounded">
                            <ArrowDown size={12} /> Latest First
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[#0E7490] font-semibold normal-case text-[11px] bg-[var(--accent-tint)] px-1.5 py-0.5 rounded">
                            <ArrowUp size={12} /> Oldest First
                          </span>
                        )
                      ) : (
                        <ArrowUpDown size={12} className="text-[var(--border)] hover:text-[var(--text-muted)]" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3">Files &amp; Pages</th>
                  <th
                    onClick={() => handleSortColumn('totalAmount')}
                    className="px-4 py-3 cursor-pointer hover:bg-[var(--border)]/30 transition-colors duration-150"
                    title="Click to sort by Total Amount"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Total</span>
                      {sortBy === 'totalAmount' ? (
                        sortOrder === 'desc' ? <ArrowDown size={13} className="text-[#0E7490]" /> : <ArrowUp size={13} className="text-[#0E7490]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-[var(--border)] hover:text-[var(--text-muted)]" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3">Payment</th>
                  <th
                    onClick={() => handleSortColumn('status')}
                    className="px-4 py-3 cursor-pointer hover:bg-[var(--border)]/30 transition-colors duration-150"
                    title="Click to sort by Status"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {sortBy === 'status' ? (
                        sortOrder === 'asc' ? <ArrowUp size={13} className="text-[#0E7490]" /> : <ArrowDown size={13} className="text-[#0E7490]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-[var(--border)] hover:text-[var(--text-muted)]" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((o, idx) => {
                  const isExpired = o.status === 'EXPIRED' || (o.expiresAt && new Date(o.expiresAt) < new Date() && !['COLLECTED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(o.status));
                  const isLatestRow = idx === 0 && sortBy === 'createdAt' && sortOrder === 'desc';
                  const badge = getStatusBadge(o.status);
                  return (
                    <tr key={o.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-11">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/shops/${shopId}/orders/${o.id}`}
                            className="font-mono font-semibold text-[#0E7490] hover:text-[#155E75] block"
                          >
                            {o.orderNumber}
                          </Link>
                          {isLatestRow && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--accent-tint)] text-[#0E7490] border border-[#0E7490]/20">
                              <Sparkles size={9} /> Latest
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1 mt-0.5">
                          <User size={12} className="text-[var(--text-muted)] shrink-0" />
                          <span className="truncate max-w-[140px] font-semibold text-[var(--text)]">
                            {o.session?.customerName || o.customerName || 'Anonymous'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-[var(--text-muted)]">
                        <div className="font-medium text-[var(--text)]">
                          {new Date(o.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[var(--text-muted)] font-mono text-[11px] flex items-center gap-1 mt-0.5">
                          <Clock size={11} className="text-[var(--text-muted)] shrink-0" />
                          <span>{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="text-[var(--text)] font-medium">
                          {o.fileCount || o.files?.length || 1} file(s)
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {o.totalPages || 0} page(s)
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-[var(--text)] whitespace-nowrap tabular-nums">
                        ₹ {Number(o.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${getPaymentBadge(o.paymentStatus, o.paymentMethod)}`}>
                          {o.paymentStatus === 'SUCCESS' || o.paymentStatus === 'COMPLETED' ? (
                            <>Paid Online</>
                          ) : o.paymentStatus === 'COUNTER_PAYMENT_COLLECTED' ? (
                            <>Counter Paid</>
                          ) : o.paymentStatus === 'COUNTER_PAYMENT_DUE' || o.paymentMethod === 'COUNTER' ? (
                            <>Pay at Counter</>
                          ) : o.paymentStatus === 'PAYMENT_PENDING' ? (
                            <>Online Pending</>
                          ) : (
                            <>{o.paymentStatus || 'Pending'}</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} shrink-0`} />
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                        {isExpired ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">Expired</span>
                        ) : o.expiresAt ? (
                          <span className="text-[var(--text-muted)] font-mono">
                            {new Date(o.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Link
                          to={`/shops/${shopId}/orders/${o.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors duration-150"
                        >
                          <span>Manage</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between text-sm bg-[var(--surface)]">
            <span className="text-[var(--text-muted)]">
              Page <span className="font-semibold text-[var(--text)]">{page}</span> of <span className="font-semibold text-[var(--text)]">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] text-sm font-medium disabled:opacity-40 hover:bg-[var(--surface-hover)] transition-colors duration-150"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] text-sm font-medium disabled:opacity-40 hover:bg-[var(--surface-hover)] transition-colors duration-150"
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
