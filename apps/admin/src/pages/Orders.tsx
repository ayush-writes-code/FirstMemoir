import { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin, type ListOrdersParams } from '@repo/api-client';
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Eye, 
  AlertCircle,
  PackageCheck,
  CreditCard
} from 'lucide-react';

const STATUS_TABS = [
  { label: 'All Orders', value: 'ALL' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'In Production', value: 'PROCESSING' },
  { label: 'Ready for Pickup', value: 'READY_FOR_PICKUP' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const;

const PAYMENT_FILTERS = [
  { label: 'All Payments', value: 'ALL' },
  { label: 'Captured', value: 'CAPTURED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
] as const;

function getOrderStatusBadge(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return {
        bg: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        dot: 'bg-blue-500',
        label: 'Confirmed'
      };
    case 'PROCESSING':
      return {
        bg: 'bg-amber-50 text-amber-800 ring-amber-600/20',
        dot: 'bg-amber-500',
        label: 'In Production'
      };
    case 'READY_FOR_PICKUP':
      return {
        bg: 'bg-purple-50 text-purple-700 ring-purple-600/20',
        dot: 'bg-purple-500',
        label: 'Ready for Pickup'
      };
    case 'SHIPPED':
      return {
        bg: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
        dot: 'bg-indigo-500',
        label: 'Shipped'
      };
    case 'DELIVERED':
      return {
        bg: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        dot: 'bg-emerald-500',
        label: 'Delivered'
      };
    case 'CANCELLED':
    case 'EXPIRED':
      return {
        bg: 'bg-rose-50 text-rose-700 ring-rose-600/20',
        dot: 'bg-rose-500',
        label: status.replace(/_/g, ' ')
      };
    case 'PENDING':
    default:
      return {
        bg: 'bg-gray-50 text-gray-700 ring-gray-500/20',
        dot: 'bg-gray-400',
        label: status.replace(/_/g, ' ')
      };
  }
}

function getPaymentStatusBadge(status?: string | null) {
  switch (status) {
    case 'CAPTURED':
      return {
        bg: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
        label: 'Captured'
      };
    case 'AUTHORIZED':
      return {
        bg: 'bg-sky-50 text-sky-800 ring-sky-600/20',
        label: 'Authorized'
      };
    case 'PENDING':
    case 'CREATED':
      return {
        bg: 'bg-amber-50 text-amber-800 ring-amber-600/20',
        label: 'Pending'
      };
    case 'FAILED':
      return {
        bg: 'bg-red-50 text-red-700 ring-red-600/20',
        label: 'Failed'
      };
    case 'REFUNDED':
      return {
        bg: 'bg-purple-50 text-purple-800 ring-purple-600/20',
        label: 'Refunded'
      };
    default:
      return {
        bg: 'bg-gray-50 text-gray-600 ring-gray-400/20',
        label: status || 'Unpaid'
      };
  }
}

export function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1
  });
  const [, startTransition] = useTransition();
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ListOrdersParams = {
        page,
        limit: 25,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (paymentFilter !== 'ALL') {
        params.payment_status = paymentFilter;
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await admin.listOrders(params);
      if (res.success && res.data) {
        setOrders(res.data.orders);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      } else {
        setError(res.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentFilter, debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTabChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setPage(1);
    });
  };

  const handlePaymentFilterChange = (payment: string) => {
    startTransition(() => {
      setPaymentFilter(payment);
      setPage(1);
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setPage(1);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders & Fulfillment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor incoming customer purchases, review manufacturing specs, and manage dispatch status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#E8620A] disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Order ID, customer email, phone, or AWB..."
              className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E8620A] focus:outline-none focus:ring-1 focus:ring-[#E8620A]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Payment Status Dropdown */}
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400 hidden sm:inline" />
            <select
              value={paymentFilter}
              onChange={(e) => handlePaymentFilterChange(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-[#E8620A] focus:outline-none focus:ring-1 focus:ring-[#E8620A]"
            >
              {PAYMENT_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-gray-100 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#E8620A] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800">Error loading orders</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="text-xs font-semibold text-red-800 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders Table Container */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/75">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Order ID
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Items
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Order Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Payment
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                // Skeletons
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-4 pl-6 pr-3"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                    <td className="px-3 py-4"><div className="h-5 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-3 py-4"><div className="h-5 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-3 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                    <td className="py-4 pl-3 pr-6 text-right"><div className="h-6 bg-gray-200 rounded w-14 ml-auto"></div></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-sm mx-auto text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <PackageCheck className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">No matching orders</h3>
                      <p className="text-sm text-gray-500">
                        {debouncedSearch || statusFilter !== 'ALL' || paymentFilter !== 'ALL'
                          ? 'No orders match your current filter and search criteria.'
                          : 'No customer orders have been recorded in the system yet.'}
                      </p>
                      {(debouncedSearch || statusFilter !== 'ALL' || paymentFilter !== 'ALL') && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8620A] hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const statusBadge = getOrderStatusBadge(order.status);
                  const payment = order.payments?.[0];
                  const paymentBadge = getPaymentStatusBadge(payment?.status);
                  const customerName = order.shipping_address_snapshot?.name 
                    || (order.user ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim() : null) 
                    || order.customer_email 
                    || 'Guest Customer';
                  const customerContact = order.customer_phone || order.user?.phone_number || order.customer_email || '';
                  const itemCount = order._count?.items ?? order.items?.length ?? 1;

                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50/75 transition-colors cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      {/* Order ID */}
                      <td className="whitespace-nowrap py-4 pl-6 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {order.id.slice(0, 8)}…
                          </span>
                          {order.tracking_awb && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200">
                              AWB
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-3 py-4 text-sm">
                        <div className="font-medium text-gray-900 truncate max-w-[180px]">
                          {customerName}
                        </div>
                        {customerContact && (
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">
                            {customerContact}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* Order Status */}
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusBadge.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${paymentBadge.bg}`}>
                          {paymentBadge.label}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-gray-900 text-right">
                        ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/orders/${order.id}`);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#E8620A] hover:text-[#c45107] bg-[#FFF3EC] hover:bg-[#FFE8DC] px-2.5 py-1.5 rounded-md transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && orders.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="text-xs text-gray-500">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> orders
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="text-xs text-gray-600 px-2">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
