import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin } from '@repo/api-client';

export function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await admin.listOrders();
      if (res.success && res.data) {
        setOrders(res.data.orders);
      } else {
        setError(res.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading orders...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Order ID</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Customer</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Payment</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                  {order.id.slice(0, 8)}...
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {order.user?.name || 'Guest'}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset
                    ${order.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : ''}
                    ${order.status === 'PROCESSING' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' : ''}
                    ${order.status === 'READY_FOR_PICKUP' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' : ''}
                    ${order.status === 'PENDING' ? 'bg-gray-50 text-gray-600 ring-gray-500/10' : ''}
                  `}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {order.payment?.status || 'N/A'}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  ₹{Number(order.total_amount).toFixed(2)}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="text-brand hover:text-brand-pressed"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
