import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admin, type OrderDetailResponse } from '@repo/api-client';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  CreditCard,
  Download,
  ShieldCheck,
  Layers,
  Loader2,
  Info,
  Calendar,
  User as UserIcon,
  MapPin,
  Sparkles
} from 'lucide-react';

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

function getPaymentBadge(status?: string | null) {
  switch (status) {
    case 'CAPTURED':
      return {
        bg: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
        label: 'Captured (Verified)'
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
        label: 'Pending Capture'
      };
    case 'FAILED':
      return {
        bg: 'bg-red-50 text-red-700 ring-red-600/20',
        label: 'Payment Failed'
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

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return;
    try {
      const res = await admin.getOrderDetail(id);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to fetch order details');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  // Operational action: CONFIRMED -> PROCESSING
  const handleProcessOrder = async () => {
    if (!id || !data?.fulfillmentDataComplete || processingAction) return;
    setProcessingAction('process');
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await admin.processOrder(id);
      if (res.success) {
        setActionSuccess('Order successfully marked as In Production.');
        await fetchOrderDetail();
      } else {
        setActionError(res.error || 'Failed to transition order to PROCESSING');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error occurred while updating order status');
    } finally {
      setProcessingAction(null);
    }
  };

  // Operational action: PROCESSING -> READY_FOR_PICKUP (Manual workshop production complete)
  const handleCompleteProduction = async () => {
    if (!id || processingAction) return;
    setProcessingAction('complete');
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await admin.completeProduction(id);
      if (res.success) {
        setActionSuccess('Production completed. Order marked as Ready for Pickup.');
        await fetchOrderDetail();
      } else {
        setActionError(res.error || 'Failed to mark production as complete');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error occurred while updating production status');
    } finally {
      setProcessingAction(null);
    }
  };

  // Operational action: Shiprocket AWB Generation
  const handleGenerateAwb = async () => {
    if (!id || !data?.fulfillmentDataComplete || processingAction) return;
    setProcessingAction('awb');
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await admin.generateAwb(id);
      if (res.success) {
        setActionSuccess('Shiprocket AWB successfully generated and order transitioned to Ready for Pickup.');
        await fetchOrderDetail();
      } else {
        setActionError(res.error || 'Failed to generate Shiprocket AWB');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error occurred during Shiprocket fulfillment');
    } finally {
      setProcessingAction(null);
    }
  };

  // Master asset download
  const handleDownloadMasterAsset = async (itemId: string) => {
    if (!id) return;
    setDownloadingItemId(itemId);
    try {
      const res = await admin.downloadMasterAsset(id, itemId);
      if (res.success && res.data?.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
      } else {
        alert(res.error || 'Failed to generate download URL for master asset');
      }
    } catch (err: any) {
      alert(err.message || 'Error fetching master asset URL');
    } finally {
      setDownloadingItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#E8620A]" />
        <p className="text-sm text-gray-500">Loading order operational details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <h2 className="text-lg font-semibold mb-1">Order Not Accessible</h2>
          <p className="text-sm">{error || 'The requested order could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  const { order, fulfillmentDataComplete, missingFields, shiprocketStatus } = data;
  const address = order.shipping_address_snapshot || {};
  const primaryPayment = order.payments?.[0];
  const orderBadge = getOrderStatusBadge(order.status);
  const paymentBadge = getPaymentBadge(primaryPayment?.status);
  const statusHistory = order.status_history || [];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumbs */}
      <div>
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-3 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-mono">
                Order #{order.id.slice(0, 8)}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${orderBadge.bg}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${orderBadge.dot}`} />
                {orderBadge.label}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${paymentBadge.bg}`}>
                {paymentBadge.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at{' '}
              {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              <span className="text-gray-300">|</span>
              <span className="font-mono text-gray-400">ID: {order.id}</span>
            </p>
          </div>

          {/* Operational Status Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {order.status === 'CONFIRMED' && (
              <button
                onClick={handleProcessOrder}
                disabled={!fulfillmentDataComplete || processingAction !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E8620A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#c45107] focus:outline-none focus:ring-2 focus:ring-[#E8620A] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {processingAction === 'process' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating Status…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Begin Production
                  </>
                )}
              </button>
            )}

            {order.status === 'PROCESSING' && (
              <>
                <button
                  onClick={handleCompleteProduction}
                  disabled={processingAction !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {processingAction === 'complete' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Marking Complete…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Complete Production
                    </>
                  )}
                </button>

                <button
                  onClick={handleGenerateAwb}
                  disabled={!fulfillmentDataComplete || processingAction !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {processingAction === 'awb' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calling Shiprocket…
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4" />
                      Generate Shiprocket AWB
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Banners */}
      {actionError && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-800">
            <span className="font-semibold">Operation failed: </span>
            {actionError}
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-emerald-800">
            <span className="font-semibold">Success: </span>
            {actionSuccess}
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Incomplete Fulfillment Notice */}
      {!fulfillmentDataComplete && (order.status === 'CONFIRMED' || order.status === 'PROCESSING') && (
        <div className="rounded-xl bg-amber-50 p-5 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Manufacturing & Fulfillment Data Incomplete
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                This order is missing required physical or manufacturing specifications. Status advancement is restricted until all mandatory fields are resolved.
              </p>
              <ul className="mt-2 list-disc list-inside text-xs text-amber-800 space-y-0.5">
                {missingFields.map((field: string, idx: number) => (
                  <li key={idx} className="font-mono">{field}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Items & Audit Timeline */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">Customized Line Items</h2>
              </div>
              <span className="text-xs text-gray-500">
                {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'items'}
              </span>
            </div>

            <ul className="divide-y divide-gray-100">
              {order.items?.map((item: any) => {
                const customization = item.customization_data || {};
                const options = customization.selected_product_options || customization.selected_options || [];
                const upload = item.upload;
                const hasMasterFile = !!customization.master_file_key;
                const previewSrc = upload?.preview_r2_key
                  ? `https://pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev/${upload.preview_r2_key}`
                  : upload?.r2_key
                  ? `https://pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev/${upload.r2_key}`
                  : null;

                return (
                  <li key={item.id} className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Image Thumbnail */}
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center">
                        {previewSrc ? (
                          <img
                            src={previewSrc}
                            alt={upload?.original_filename || item.product?.name || 'Item photo'}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Layers className="h-8 w-8 text-gray-300" />
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">
                              {item.product?.name || 'Custom Print'}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                              <span>SKU: <span className="font-mono text-gray-700">{item.product?.sku || 'N/A'}</span></span>
                              <span>•</span>
                              <span>Qty: <span className="font-semibold text-gray-700">{item.quantity}</span></span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-semibold text-gray-900">
                              ₹{Number(item.unit_price || item.price_at_time || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-gray-400">per unit</div>
                          </div>
                        </div>

                        {/* Selected Options Pills */}
                        {options.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {options.map((opt: any, optIdx: number) => (
                              <span
                                key={optIdx}
                                className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                              >
                                <span className="text-gray-500">{opt.option_name}:</span>
                                <span>{opt.value_name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manufacturing Specs Card */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-xs space-y-3">
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-gray-500" />
                        Manufacturing & Print Specifications
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <span className="text-gray-500 block">Physical Dimensions:</span>
                          <span className="font-medium text-gray-900">
                            {customization.physical_width && customization.physical_height
                              ? `${customization.physical_width} × ${customization.physical_height} ${customization.physical_dimension_unit || 'in'}`
                              : 'Not specified'}
                          </span>
                          {customization.orientation && (
                            <span className="ml-1 text-gray-500">({customization.orientation})</span>
                          )}
                        </div>

                        <div>
                          <span className="text-gray-500 block">DPI & Print Quality:</span>
                          <span className="font-medium text-gray-900">
                            {customization.effective_dpi ? `${customization.effective_dpi} DPI` : 'Standard'}
                            {customization.print_quality_status && (
                              <span className="ml-1 text-gray-600">({customization.print_quality_status})</span>
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-500 block">Uploaded File:</span>
                          <span className="font-medium text-gray-900 truncate block">
                            {upload?.original_filename || 'Uploaded Image'}
                            {upload?.width && upload?.height && ` (${upload.width}×${upload.height}px)`}
                          </span>
                        </div>

                        {customization.crop_width && (
                          <div className="sm:col-span-2">
                            <span className="text-gray-500 block">Crop Box:</span>
                            <span className="font-mono text-gray-800">
                              x:{customization.crop_x?.toFixed(1)} y:{customization.crop_y?.toFixed(1)} w:{customization.crop_width?.toFixed(1)} h:{customization.crop_height?.toFixed(1)}
                              {customization.rotation ? ` | Rot: ${customization.rotation}°` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Master Asset Download Action */}
                      <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-gray-500 text-[11px]">
                          {hasMasterFile
                            ? 'High-res master production file available in Cloudflare R2.'
                            : 'No dedicated master file key stored on item.'}
                        </span>

                        {hasMasterFile && (
                          <button
                            onClick={() => handleDownloadMasterAsset(item.id)}
                            disabled={downloadingItemId === item.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 transition"
                          >
                            {downloadingItemId === item.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Generating URL…
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5 text-gray-600" />
                                Download Master File
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Audit / Status History Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900">Audit & Status History</h2>
            </div>

            <div className="p-6">
              {statusHistory.length === 0 ? (
                <div className="text-xs text-gray-500 py-3">
                  Initial state recorded upon order creation. No subsequent status transitions logged yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {statusHistory.map((entry: any, idx: number) => (
                    <div key={entry.id || idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2 border-white bg-[#E8620A] shadow-sm" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900">
                            {entry.new_status ? entry.new_status.replace(/_/g, ' ') : 'Status Updated'}
                          </span>
                          {entry.previous_status && (
                            <span className="text-[11px] text-gray-400">
                              (from {entry.previous_status.replace(/_/g, ' ')})
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400">
                            • {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at{' '}
                            {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-xs text-gray-600">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Payment, Shipping, Fulfillment Integration */}
        <div className="space-y-6">

          {/* Payment Snapshot */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">Payment Summary</h2>
              </div>
              <span title="Verified Webhook">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </span>
            </div>

            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Payment Status</span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${paymentBadge.bg}`}>
                  {primaryPayment?.status || 'UNPAID'}
                </span>
              </div>

              {primaryPayment?.razorpay_payment_id && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Razorpay ID</span>
                  <span className="font-mono text-gray-900">{primaryPayment.razorpay_payment_id}</span>
                </div>
              )}

              {primaryPayment?.method && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-900 uppercase">{primaryPayment.method}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs">
                {order.subtotal_amount && (
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>₹{Number(order.subtotal_amount).toFixed(2)}</span>
                  </div>
                )}
                {order.shipping_fee !== undefined && order.shipping_fee !== null && (
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span>{Number(order.shipping_fee) === 0 ? 'Free' : `₹${Number(order.shipping_fee).toFixed(2)}`}</span>
                  </div>
                )}
                {order.tax_amount !== undefined && order.tax_amount !== null && (
                  <div className="flex justify-between text-gray-500">
                    <span>GST (Estimated)</span>
                    <span>₹{Number(order.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                {order.discount_amount && Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total Paid</span>
                  <span>₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mt-3 bg-gray-50 rounded-lg p-2.5 text-[11px] text-gray-500 border border-gray-100">
                Authoritative confirmation: Razorpay HMAC-SHA256 signature verified on webhook ingestion.
              </div>
            </div>
          </div>

          {/* Fulfillment & Courier Status (Shiprocket) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">Courier / Shipping</h2>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Integration Status Callout */}
              <div className={`p-3 rounded-lg border ${
                shiprocketStatus?.isDryRun 
                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                  : shiprocketStatus?.isConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <div className="font-semibold mb-0.5">Shiprocket Integration Status</div>
                {shiprocketStatus?.isDryRun ? (
                  <div>Sandbox / Dry Run mode is active. Dispatches and AWB codes are mocked locally.</div>
                ) : shiprocketStatus?.isConfigured ? (
                  <div>Live Shiprocket API credentials configured.</div>
                ) : (
                  <div>Credentials not configured in environment. Manual dispatch or configure SHIPROCKET_EMAIL/PASSWORD.</div>
                )}
              </div>

              {/* AWB and Shiprocket identifiers */}
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Tracking AWB</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {order.tracking_awb || 'Not Dispatched'}
                  </span>
                </div>

                {order.shiprocket_order_id && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Shiprocket Order ID</span>
                    <span className="font-mono text-gray-900">{order.shiprocket_order_id}</span>
                  </div>
                )}

                {order.shiprocket_shipment_id && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Shipment ID</span>
                    <span className="font-mono text-gray-900">{order.shiprocket_shipment_id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Shipping Address */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900">Customer & Delivery</h2>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-gray-500 block mb-1 font-medium">Customer Contact</span>
                <p className="font-semibold text-gray-900">
                  {address.name || (order.user ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim() : null) || 'Guest Customer'}
                </p>
                <p className="text-gray-600">{order.customer_email || order.user?.email || 'No email provided'}</p>
                <p className="text-gray-600">{order.customer_phone || order.user?.phone_number || 'No phone provided'}</p>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <span className="text-gray-500 block mb-1 font-medium flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Shipping Address Snapshot
                </span>
                {address.line1 ? (
                  <div className="text-gray-800 leading-relaxed">
                    <p className="font-medium">{address.name}</p>
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>{address.city}, {address.state} {address.postal_code}</p>
                    <p>{address.country || 'India'}</p>
                  </div>
                ) : (
                  <p className="text-amber-700 italic">No shipping address recorded</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
