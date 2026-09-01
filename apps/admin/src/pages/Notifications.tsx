import { useEffect, useState } from 'react';
import * as api from '@repo/api-client';
import type { AdminNotificationLogDto } from '@repo/api-client';
import { Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export function Notifications() {
  const [notifications, setNotifications] = useState<AdminNotificationLogDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = async (targetPage: number) => {
    try {
      setIsLoading(true);
      const response = await api.admin.getNotifications({ page: targetPage, limit: 20 });
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setTotalPages(response.data.pagination.totalPages);
        setPage(response.data.pagination.page);
      } else {
        throw new Error(response.error || 'Failed to load notifications');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'FAILED': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'SENT': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notification Operations</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-24 text-center text-gray-500">
            No notifications found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {notifications.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 flex items-center">
                        <StatusIcon status={log.status} />
                        <span className="ml-2 text-sm font-medium text-gray-900">{log.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{log.event_type}</div>
                        <div className="text-xs text-gray-500">{log.channel} • {log.provider}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{log.recipient}</div>
                        {log.order_id && <div className="text-xs text-gray-500">Order ID: {log.order_id.slice(0, 8)}...</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Intl.DateTimeFormat('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(new Date(log.created_at))}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => fetchNotifications(page - 1)}
                  disabled={page <= 1 || isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => fetchNotifications(page + 1)}
                  disabled={page >= totalPages || isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
