import { useState, useEffect } from 'react';
import { admin } from '@repo/api-client';

export function ManufacturingQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'PROCESSING'>('ALL');
  const [processingState, setProcessingState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await admin.getManufacturingQueue();
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        setError(res.error || 'Failed to fetch queue');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMaster = async (orderId: string, itemId: string) => {
    try {
      setProcessingState(prev => ({ ...prev, [`${orderId}-${itemId}`]: true }));
      const res = await admin.downloadMasterAsset(orderId, itemId);
      if (res.success && res.data?.url) {
        window.location.href = res.data.url; // Trigger download via presigned URL with Content-Disposition
      } else {
        alert(res.error || 'Failed to generate download URL');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingState(prev => ({ ...prev, [`${orderId}-${itemId}`]: false }));
    }
  };

  const handleProcessOrder = async (orderId: string) => {
    try {
      setProcessingState(prev => ({ ...prev, [orderId]: true }));
      const res = await admin.processOrder(orderId);
      if (res.success) {
        await fetchQueue();
      } else {
        alert(res.error || 'Failed to mark order as processing');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingState(prev => ({ ...prev, [orderId]: false }));
    }
  };

  if (loading) return <div className="p-8">Loading manufacturing queue...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  const filteredItems = items.filter(item => 
    filter === 'ALL' ? true : item.order.status === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Manufacturing Queue</h1>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${filter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All Items
          </button>
          <button 
            onClick={() => setFilter('CONFIRMED')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${filter === 'CONFIRMED' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Confirmed
          </button>
          <button 
            onClick={() => setFilter('PROCESSING')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${filter === 'PROCESSING' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Processing
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5">
          <p className="text-gray-500">No items found in the queue.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5 flex flex-col md:flex-row gap-6">
              
              {/* Image Preview */}
              <div className="w-full md:w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                {item.preview_url ? (
                  <img
                    src={item.preview_url}
                    alt={item.product_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No Preview</div>
                )}
              </div>

              {/* Item Info */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.product_name}</h3>
                      <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500">Order #{item.order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-400">{new Date(item.order.created_at).toLocaleString()}</p>
                      <span className={`mt-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        item.order.status === 'CONFIRMED' ? 'bg-brand/10 text-brand ring-brand/20' : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                      }`}>
                        {item.order.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Specifications</p>
                      {item.snapshot.physical_width && (
                        <p>Size: {item.snapshot.physical_width} × {item.snapshot.physical_height} {item.snapshot.physical_dimension_unit}</p>
                      )}
                      {item.snapshot.orientation && <p>Orientation: {item.snapshot.orientation}</p>}
                      {item.snapshot.effective_dpi && (
                        <p>Quality: {item.snapshot.effective_dpi} DPI ({item.snapshot.print_quality_status || 'OK'})</p>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Options & Crop</p>
                      {item.snapshot.options?.length > 0 && (
                        <ul className="list-disc pl-4">
                          {item.snapshot.options.map((opt: any, i: number) => (
                            <li key={i} className="text-xs">{opt.option_name}: {opt.value_name}</li>
                          ))}
                        </ul>
                      )}
                      {item.snapshot.crop_width && (
                        <p className="mt-2 text-xs text-gray-500">
                          Crop: ({item.snapshot.crop_x?.toFixed(2)}, {item.snapshot.crop_y?.toFixed(2)}) w:{item.snapshot.crop_width?.toFixed(2)} h:{item.snapshot.crop_height?.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => handleDownloadMaster(item.order.id, item.id)}
                    disabled={!item.snapshot.has_master_file || processingState[`${item.order.id}-${item.id}`]}
                    className="flex-1 md:flex-none rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {processingState[`${item.order.id}-${item.id}`] ? 'Generating URL...' : 'Download Master'}
                  </button>
                  
                  {item.order.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleProcessOrder(item.order.id)}
                      disabled={processingState[item.order.id]}
                      className="flex-1 md:flex-none rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-pressed disabled:opacity-50"
                    >
                      {processingState[item.order.id] ? 'Processing...' : 'Mark Order as Processing'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
