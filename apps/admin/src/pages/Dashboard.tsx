import { useEffect, useState } from 'react';
import * as api from '@repo/api-client';
import type { AdminMetricsResponse } from '@repo/api-client';
import { AlertCircle, Package, Webhook, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const response = await api.admin.getMetrics();
        if (response.success && response.data) {
          setMetrics(response.data);
        } else {
          throw new Error(response.error || 'Failed to load operational metrics');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load operational metrics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Operational Overview</h1>
      
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Actionable Orders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
                <Package className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">Actionable Orders</h2>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-4">{metrics.actionableOrdersCount}</div>
            <p className="text-sm text-gray-500 mb-6 flex-grow">Orders confirmed and awaiting processing or pickup.</p>
            <Link to="/orders" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View Orders &rarr;
            </Link>
          </div>

          {/* Failed Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
            <div className="flex items-center mb-4">
              <div className={`p-3 rounded-full mr-4 ${metrics.failedNotificationsCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">Failed Notifications</h2>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-4">{metrics.failedNotificationsCount}</div>
            <p className="text-sm text-gray-500 mb-6 flex-grow">Transactional emails/SMS that failed to deliver.</p>
            <Link to="/notifications" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View Notifications &rarr;
            </Link>
          </div>

          {/* Failed Webhooks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
            <div className="flex items-center mb-4">
              <div className={`p-3 rounded-full mr-4 ${metrics.failedWebhooksCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                <Webhook className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">Failed Webhooks</h2>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-4">{metrics.failedWebhooksCount}</div>
            <p className="text-sm text-gray-500 mb-6 flex-grow">Unprocessed incoming provider webhooks.</p>
            <span className="text-sm font-medium text-gray-400">Review in logs</span>
          </div>
        </div>
      )}
    </div>
  );
}
