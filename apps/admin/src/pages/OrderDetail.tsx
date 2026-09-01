import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admin } from '@repo/api-client';

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      const res = await admin.getOrderDetail(id!);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to fetch order detail');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessOrder = async () => {
    if (!id || !data?.fulfillmentDataComplete) return;
    setProcessing(true);
    try {
      const res = await admin.processOrder(id);
      if (res.success) {
        await fetchOrderDetail();
      } else {
        alert(res.error || 'Failed to process order');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateAwb = async () => {
    if (!id || !data?.fulfillmentDataComplete) return;
    setProcessing(true);
    try {
      const res = await admin.generateAwb(id);
      if (res.success) {
        await fetchOrderDetail();
      } else {
        alert(res.error || 'Failed to generate AWB');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8">Loading order...</div>;
  if (error || !data) return <div className="p-8 text-red-600">{error || 'Order not found'}</div>;

  const { order, fulfillmentDataComplete, missingFields } = data;
  const address = order.shipping_address_snapshot || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/orders')} className="text-gray-500 hover:text-gray-900">
            &larr; Back to Orders
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Order {order.id.slice(0, 8)}</h1>
          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
        
        {order.status === 'CONFIRMED' && (
          <button
            onClick={handleProcessOrder}
            disabled={!fulfillmentDataComplete || processing}
            className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-pressed disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Begin Processing'}
          </button>
        )}
        {order.status === 'PROCESSING' && (
          <button
            onClick={handleGenerateAwb}
            disabled={!fulfillmentDataComplete || processing}
            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Generate AWB'}
          </button>
        )}
      </div>

      {(!fulfillmentDataComplete && (order.status === 'CONFIRMED' || order.status === 'PROCESSING')) && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fulfillment data incomplete</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc space-y-1 pl-5">
                  {missingFields.map((field: string, idx: number) => (
                    <li key={idx}>Missing: {field}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Order Items</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {order.items.map((item: any) => {
                const customization = item.customization_data || {};
                const options = customization.selected_product_options || customization.selected_options || [];
                const upload = item.upload;
                
                return (
                  <li key={item.id} className="p-4 sm:px-6 flex items-start gap-4">
                    {upload && (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        <img
                          src={upload.preview_r2_key ? `https://pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev/${upload.preview_r2_key}` : (upload.r2_key ? `https://pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev/${upload.r2_key}` : '')}
                          alt={upload.original_filename || item.product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-xs text-gray-500">SKU: <span className="font-mono">{item.product.sku || 'N/A'}</span></p>
                      <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                      
                      <div className="mt-2 text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-900 mb-1">Manufacturing & Customization Snapshot</p>
                        
                        {options.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium text-gray-600">Options: </span>
                            {options.map((opt: any, i: number) => (
                              <span key={i} className="inline-block bg-white px-2 py-0.5 rounded border border-gray-200 mr-1 text-[11px]">
                                {opt.option_name}: {opt.value_name}
                              </span>
                            ))}
                          </div>
                        )}

                        {customization.physical_width && customization.physical_height && (
                          <div>
                            <span className="font-medium text-gray-600">Physical Size: </span>
                            <span className="font-semibold">{customization.physical_width} × {customization.physical_height} {customization.physical_dimension_unit || 'in'}</span>
                            {customization.orientation && <span className="ml-2 text-gray-500">({customization.orientation})</span>}
                          </div>
                        )}

                        {customization.effective_dpi && (
                          <div>
                            <span className="font-medium text-gray-600">DPI / Quality: </span>
                            <span>{customization.effective_dpi} DPI ({customization.print_quality_status || 'OK'})</span>
                          </div>
                        )}

                        {customization.crop_width && (
                          <div>
                            <span className="font-medium text-gray-600">Crop: </span>
                            <span className="text-gray-800">
                              ({customization.crop_x?.toFixed(2)}, {customization.crop_y?.toFixed(2)}) w:{customization.crop_width?.toFixed(2)} h:{customization.crop_height?.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {upload?.original_filename && (
                          <div>
                            <span className="font-medium text-gray-600">Original File: </span>
                            <span className="text-gray-800">{upload.original_filename} ({upload.width}×{upload.height} px)</span>
                          </div>
                        )}
                        
                        {customization.master_file_key && (
                          <div className="pt-2 border-t border-gray-200 mt-2">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await admin.downloadMasterAsset(order.id, item.id);
                                  if (res.success && res.data?.url) {
                                    window.location.href = res.data.url;
                                  } else {
                                    alert(res.error || 'Failed to generate download URL');
                                  }
                                } catch (err: any) {
                                  alert(err.message);
                                }
                              }}
                              className="rounded bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center gap-1.5"
                            >
                              <span>Download Master File</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">₹{Number(item.unit_price || item.price_at_time).toFixed(2)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Customer Details</h3>
            </div>
            <div className="px-4 py-5 sm:px-6 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">{address.name || (order.user ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim() : null) || order.customer_email || 'Guest'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{order.customer_email || order.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-sm text-gray-900">{order.customer_phone || order.user?.phone_number || order.user?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Shipping Address</h3>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <p className="text-sm text-gray-900">
                {address.name}<br />
                {address.line1}<br />
                {address.line2 && <>{address.line2}<br /></>}
                {address.city}, {address.state} {address.postal_code}<br />
                {address.country}
              </p>
            </div>
          </div>
          
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Payment Details</h3>
            </div>
            <div className="px-4 py-5 sm:px-6 space-y-2">
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-sm font-medium text-gray-900">{order.payments?.[0]?.status || order.payment?.status || 'N/A'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">Razorpay Payment ID</p>
                <p className="text-sm font-mono text-xs text-gray-900">{order.payments?.[0]?.razorpay_payment_id || order.payment?.razorpay_payment_id || 'N/A'}</p>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-900">Total Amount</p>
                <p className="text-sm font-bold text-gray-900">₹{Number(order.total_amount).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {order.shiprocket_order_id && (
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden mt-6">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-base font-semibold leading-6 text-gray-900">Shiprocket Fulfillment</h3>
              </div>
              <div className="px-4 py-5 sm:px-6 space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="text-sm font-medium text-gray-900">{order.shiprocket_order_id}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-gray-500">Shipment ID</p>
                  <p className="text-sm font-medium text-gray-900">{order.shiprocket_shipment_id || 'N/A'}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-gray-500">AWB</p>
                  <p className="text-sm font-medium text-gray-900">{order.tracking_awb || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
