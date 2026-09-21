import { useState, useEffect } from 'react';
import { products as productsApi } from '@repo/api-client';
import type { ProductDto, CategoryDto, CreateProductInput, UpdateProductInput, ProductImageDto } from '@repo/api-client';
import { X, RefreshCw } from 'lucide-react';
import { ProductImageList } from './ProductImageList';
import { ProductImageUpload } from './ProductImageUpload';
import { ProductOptionsEditor } from './ProductOptionsEditor';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { ProductWithOptionsDto } from '@repo/api-client';

interface Props {
  mode: 'create' | 'edit';
  product?: ProductWithOptionsDto | ProductDto;
  categories: CategoryDto[];
  isSubmitting: boolean;
  error: string;
  onSubmit: (data: CreateProductInput | UpdateProductInput) => void;
  onClose: () => void;
  onRefresh?: () => void;
  isLoadingFullProduct?: boolean;
}

interface FormState {
  name: string;
  sku: string;
  description: string;
  base_price: string;
  category_ids: string[];
  is_active: boolean;
  mockup_metadata_text: string;
  manufacturing_metadata_text: string;
}

function validate(state: FormState): string {
  const name = state.name.trim();
  if (!name) return 'Name is required.';
  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (name.length > 100) return 'Name cannot exceed 100 characters.';
  
  const desc = state.description.trim();
  if (desc.length > 1000) return 'Description cannot exceed 1000 characters.';
  
  const priceRegex = /^\d+(\.\d{1,2})?$/;
  if (!priceRegex.test(state.base_price)) return 'Base price must be a valid positive number with up to 2 decimal places.';
  if (Number(state.base_price) <= 0) return 'Base price must be strictly greater than 0.';
  
  if (state.category_ids.length === 0) return 'At least one category must be selected.';

  // Mockup metadata validation
  if (state.mockup_metadata_text.trim()) {
    try {
      const parsed = JSON.parse(state.mockup_metadata_text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return 'Mockup metadata must be a JSON object.';
      }
      if (!parsed.coordinates && !parsed.mockups) {
        return "Mockup metadata must contain either 'coordinates' or 'mockups'.";
      }
      const pctRegex = /^\d+(\.\d+)?%$/;
      if (parsed.coordinates) {
        if (typeof parsed.coordinates !== 'object' || Array.isArray(parsed.coordinates)) {
          return "'coordinates' must be an object keyed by image index.";
        }
        for (const [k, v] of Object.entries(parsed.coordinates as Record<string, any>)) {
          if (!v || typeof v !== 'object') return `Coordinate [${k}] must be an object.`;
          for (const dim of ['top', 'left', 'width', 'height']) {
            if (!v[dim] || !pctRegex.test(String(v[dim]))) {
              return `Coordinate [${k}].${dim} must be a percentage string (e.g. '20%').`;
            }
          }
        }
      }
      if (parsed.mockups) {
        if (typeof parsed.mockups !== 'object' || Array.isArray(parsed.mockups)) {
          return "'mockups' must be an object keyed by orientation.";
        }
        const validOrientations = ['portrait', 'landscape', 'square', 'default'];
        for (const [orient, mockup] of Object.entries(parsed.mockups as Record<string, any>)) {
          if (!validOrientations.includes(orient)) {
            return `Mockup orientation '${orient}' is invalid. Allowed: ${validOrientations.join(', ')}.`;
          }
          if (!mockup.baseAsset || typeof mockup.baseAsset !== 'string') {
            return `Mockup [${orient}] missing 'baseAsset' string.`;
          }
          if (!mockup.overlayAsset || typeof mockup.overlayAsset !== 'string') {
            return `Mockup [${orient}] missing 'overlayAsset' string.`;
          }
          if (!mockup.printArea || typeof mockup.printArea !== 'object') {
            return `Mockup [${orient}] missing 'printArea' object.`;
          }
          for (const dim of ['top', 'left', 'width', 'height']) {
            if (!mockup.printArea[dim] || !pctRegex.test(String(mockup.printArea[dim]))) {
              return `Mockup [${orient}].printArea.${dim} must be a percentage string (e.g. '20%').`;
            }
          }
        }
      }
    } catch (e: any) {
      return `Mockup metadata JSON syntax error: ${e.message}`;
    }
  }

  // Manufacturing metadata validation
  if (state.manufacturing_metadata_text.trim()) {
    try {
      const parsed = JSON.parse(state.manufacturing_metadata_text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return 'Manufacturing metadata must be a JSON object.';
      }
    } catch (e: any) {
      return `Manufacturing metadata JSON syntax error: ${e.message}`;
    }
  }
  
  return '';
}

export function ProductForm({ mode, product, categories, isSubmitting, error, onSubmit, onClose, onRefresh, isLoadingFullProduct = false }: Props) {
  const [form, setForm] = useState<FormState>({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    base_price: product?.base_price ?? '',
    category_ids: product?.categories?.map(c => c.category.id) ?? [],
    is_active: product?.is_active ?? true,
    mockup_metadata_text: (product as any)?.mockup_metadata ? JSON.stringify((product as any).mockup_metadata, null, 2) : '',
    manufacturing_metadata_text: (product as any)?.manufacturing_metadata ? JSON.stringify((product as any).manufacturing_metadata, null, 2) : '',
  });
  const [localError, setLocalError] = useState('');
  
  // Image deletion state
  const [imageToDelete, setImageToDelete] = useState<ProductImageDto | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  
  // Image reordering state
  const [isReordering, setIsReordering] = useState(false);
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'variants' | 'metadata'>('basic');
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false);

  // Reset form only when the selected product ID changes.
  useEffect(() => {
    setForm({
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      description: product?.description ?? '',
      base_price: product?.base_price ?? '',
      category_ids: product?.categories?.map(c => c.category.id) ?? [],
      is_active: product?.is_active ?? true,
      mockup_metadata_text: (product as any)?.mockup_metadata ? JSON.stringify((product as any).mockup_metadata, null, 2) : '',
      manufacturing_metadata_text: (product as any)?.manufacturing_metadata ? JSON.stringify((product as any).manufacturing_metadata, null, 2) : '',
    });
    setLocalError('');
  }, [product?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      category_ids: checked 
        ? [...prev.category_ids, categoryId]
        : prev.category_ids.filter(id => id !== categoryId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError('');

    let mockup_metadata: any = undefined;
    if (form.mockup_metadata_text.trim()) {
      try {
        mockup_metadata = JSON.parse(form.mockup_metadata_text);
      } catch (e: any) {
        setLocalError('Mockup metadata is not valid JSON: ' + e.message);
        return;
      }
    } else if (mode === 'edit') {
      mockup_metadata = null;
    }

    let manufacturing_metadata: any = undefined;
    if (form.manufacturing_metadata_text.trim()) {
      try {
        manufacturing_metadata = JSON.parse(form.manufacturing_metadata_text);
      } catch (e: any) {
        setLocalError('Manufacturing metadata is not valid JSON: ' + e.message);
        return;
      }
    } else if (mode === 'edit') {
      manufacturing_metadata = null;
    }

    const payload: any = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      description: form.description.trim() || undefined,
      base_price: form.base_price.trim(),
      category_ids: form.category_ids,
      is_active: form.is_active,
      mockup_metadata,
      manufacturing_metadata,
    };
    onSubmit(payload);
  };

  const handleConfirmDelete = async () => {
    if (!product || !imageToDelete) return;
    
    setDeletingImageId(imageToDelete.id);
    setImageToDelete(null); // Close dialog immediately
    setDeleteError('');

    try {
      await productsApi.deleteProductImage(product.id, imageToDelete.id);
      onRefresh?.();
    } catch (err: any) {
      console.error('Failed to delete image:', err);
      setDeleteError(err.message || 'Failed to delete image. Please try again.');
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleReorderImages = async (newOrderedIds: string[]) => {
    if (!product || isReordering) return;

    const currentOrderedIds = [...product.images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => img.id);

    // No-op check: do not call API if array order is identical
    if (
      newOrderedIds.length === currentOrderedIds.length &&
      newOrderedIds.every((id, idx) => id === currentOrderedIds[idx])
    ) {
      return;
    }

    setIsReordering(true);
    setDeleteError('');

    try {
      await productsApi.reorderProductImages(product.id, newOrderedIds);
      onRefresh?.();
    } catch (err: any) {
      console.error('Failed to reorder images:', err);
      setDeleteError(err.message || 'Failed to reorder images. Please try again.');
    } finally {
      setIsReordering(false);
    }
  };

  const handleSetPrimaryImage = (targetImage: ProductImageDto) => {
    if (!product) return;
    const currentSorted = [...product.images].sort((a, b) => a.sort_order - b.sort_order);
    const otherImages = currentSorted.filter((img) => img.id !== targetImage.id);
    const newOrder = [targetImage.id, ...otherImages.map((img) => img.id)];
    handleReorderImages(newOrder);
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-0">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Add Product' : 'Edit Product'}
          </h2>
          <button
            id="close-product-form"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs for Edit Mode */}
        {mode === 'edit' && (
          <div className="flex px-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'basic' ? 'border-[#E8620A] text-[#E8620A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basic Details
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'images' ? 'border-[#E8620A] text-[#E8620A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setActiveTab('variants')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'variants' ? 'border-[#E8620A] text-[#E8620A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Variants & Options
            </button>
            <button
              onClick={() => setActiveTab('metadata')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'metadata' ? 'border-[#E8620A] text-[#E8620A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mockup & Metadata
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1">
          <form id="product-form" onSubmit={handleSubmit} noValidate className="px-6 py-5">
            {displayError && (
              <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-md border border-red-100">
                {displayError}
              </div>
            )}

            {/* Basic Details Section */}
            <div className={mode === 'edit' && activeTab !== 'basic' ? 'hidden' : 'space-y-4'}>
              {/* Name */}
              <div>
                <label htmlFor="prod-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="prod-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={100}
                  required
                  placeholder="e.g. Classic Poster"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A]"
                />
              </div>
              
              {/* SKU */}
              <div>
                <label htmlFor="prod-sku" className="block text-sm font-medium text-gray-700 mb-1">
                  SKU <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="prod-sku"
                  name="sku"
                  type="text"
                  value={form.sku}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. PST-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A]"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="prod-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="prod-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={1000}
                  rows={3}
                  placeholder="Brief description of the product…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A] resize-none"
                />
                <p className="text-xs text-gray-400 mt-0.5 text-right">{form.description.length}/1000</p>
              </div>

              {/* Base Price */}
              <div>
                <label htmlFor="prod-base-price" className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  id="prod-base-price"
                  name="base_price"
                  type="text"
                  value={form.base_price}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A]"
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories <span className="text-red-500">*</span>
                </label>
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500">No categories found. Create a category first.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2 bg-gray-50">
                    {categories.map(cat => (
                      <label key={cat.id} className="flex items-center gap-3 hover:bg-gray-100 p-1 rounded-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.category_ids.includes(cat.id)}
                          onChange={(e) => handleCategoryChange(cat.id, e.target.checked)}
                          className="h-4 w-4 text-[#E8620A] border-gray-300 rounded focus:ring-[#E8620A]"
                        />
                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  id="prod-is-active"
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-[#E8620A] border-gray-300 rounded focus:ring-[#E8620A]"
                />
                <label htmlFor="prod-is-active" className="text-sm font-medium text-gray-700">
                  Active (visible to customers)
                </label>
              </div>

              {/* Slug note for edit mode */}
              {mode === 'edit' && product && (
                <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-md mt-2">
                  Slug: <span className="font-mono text-gray-600">{product.slug}</span> — slugs are immutable.
                </p>
              )}

              {/* In create mode: collapsible advanced metadata */}
              {mode === 'create' && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCreate(!showAdvancedCreate)}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    {showAdvancedCreate ? '▼ Hide Metadata & Mockup Configuration' : '▶ Advanced: Mockup & Manufacturing Metadata (Optional)'}
                  </button>
                  {showAdvancedCreate && (
                    <div className="mt-4 space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Mockup Configuration (JSON)
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setForm(prev => ({
                                ...prev,
                                mockup_metadata_text: JSON.stringify({
                                  mockups: {
                                    portrait: {
                                      printArea: { top: "20.53%", left: "39.25%", width: "21.30%", height: "41.80%" },
                                      baseAsset: "/mockups/product-slug/portrait/scene.webp",
                                      overlayAsset: "/mockups/product-slug/portrait/frame-overlay.png"
                                    }
                                  }
                                }, null, 2)
                              }))}
                              className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded"
                            >
                              + Template: 3-Layer Scene
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm(prev => ({
                                ...prev,
                                mockup_metadata_text: JSON.stringify({
                                  coordinates: {
                                    "0": { top: "20%", left: "20%", width: "60%", height: "60%" }
                                  }
                                }, null, 2)
                              }))}
                              className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded"
                            >
                              + Template: Coordinates
                            </button>
                          </div>
                        </div>
                        <textarea
                          name="mockup_metadata_text"
                          value={form.mockup_metadata_text}
                          onChange={handleChange}
                          rows={6}
                          placeholder="Paste or click a template..."
                          className="w-full font-mono text-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E8620A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Manufacturing Metadata (JSON)
                        </label>
                        <textarea
                          name="manufacturing_metadata_text"
                          value={form.manufacturing_metadata_text}
                          onChange={handleChange}
                          rows={3}
                          placeholder='e.g. { "printer_code": "CANVAS_PRO_1" }'
                          className="w-full font-mono text-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E8620A]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mockup & Metadata Tab (Edit mode) */}
            {mode === 'edit' && (
              <div className={activeTab !== 'metadata' ? 'hidden' : 'space-y-6'}>
                {/* Mockup Metadata */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Mockup Configuration <span className="text-gray-400 font-normal">(Validated JSON)</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          mockup_metadata_text: JSON.stringify({
                            mockups: {
                              portrait: {
                                printArea: { top: "20.53%", left: "39.25%", width: "21.30%", height: "41.80%" },
                                baseAsset: "/mockups/product-slug/portrait/scene.webp",
                                overlayAsset: "/mockups/product-slug/portrait/frame-overlay.png"
                              }
                            }
                          }, null, 2)
                        }))}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded transition-colors"
                      >
                        + Template: 3-Layer Scene
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          mockup_metadata_text: JSON.stringify({
                            coordinates: {
                              "0": { top: "20%", left: "20%", width: "60%", height: "60%" }
                            }
                          }, null, 2)
                        }))}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded transition-colors"
                      >
                        + Template: Coordinates
                      </button>
                      {form.mockup_metadata_text && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, mockup_metadata_text: '' }))}
                          className="text-xs text-red-600 hover:text-red-700 px-1 py-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Controls the live preview in storefront. Supports multi-layer orientation scenes (`mockups`) or per-image coordinates (`coordinates`). Percentages required (e.g. "20%").
                  </p>
                  <textarea
                    name="mockup_metadata_text"
                    value={form.mockup_metadata_text}
                    onChange={handleChange}
                    rows={8}
                    placeholder="Enter mockup metadata JSON or click a template above..."
                    className="w-full font-mono text-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A]"
                  />
                </div>

                {/* Manufacturing Metadata */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Manufacturing Metadata <span className="text-gray-400 font-normal">(Optional JSON)</span>
                    </label>
                    {form.manufacturing_metadata_text && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, manufacturing_metadata_text: '' }))}
                        className="text-xs text-red-600 hover:text-red-700 px-1 py-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Passive storage for partner manufacturing specifications (e.g. printer code, bleed mm, DPI requirements). Unvalidated storage field.
                  </p>
                  <textarea
                    name="manufacturing_metadata_text"
                    value={form.manufacturing_metadata_text}
                    onChange={handleChange}
                    rows={4}
                    placeholder='e.g. { "printer_code": "CANVAS_PRO_1", "bleed_mm": 5 }'
                    className="w-full font-mono text-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A]"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Product Images (Only in Edit Mode) */}
          {mode === 'edit' && product && activeTab === 'images' && (
            <div className="px-6 py-5">
              <div className="">
                <div className="mb-4">
                  <ProductImageUpload
                    productId={product.id}
                    onUploadComplete={() => onRefresh?.()}
                  />
                </div>
                {deleteError && (
                  <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-md border border-red-100">
                    {deleteError}
                  </div>
                )}
                <ProductImageList 
                  images={product.images} 
                  deletingImageId={deletingImageId}
                  isReordering={isReordering}
                  disabled={isSubmitting}
                  onDeleteImage={(image) => setImageToDelete(image)}
                  onReorderImages={handleReorderImages}
                  onSetPrimaryImage={handleSetPrimaryImage}
                />
              </div>
            </div>
          )}
          
          {/* Variants & Options Tab */}
          {mode === 'edit' && product && activeTab === 'variants' && (
            <div className="px-6 py-5">
              {isLoadingFullProduct ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mb-3 text-[#E8620A]" />
                  <p className="text-sm font-medium text-gray-600">Loading options...</p>
                </div>
              ) : (
                <ProductOptionsEditor
                  product={product as ProductWithOptionsDto}
                  onRefresh={() => onRefresh?.()}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 flex-shrink-0 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            id="submit-product-form"
            type="submit"
            form="product-form"
            disabled={isSubmitting || categories.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-[#E8620A] rounded-md hover:bg-[#d05809] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : mode === 'create' ? (
              'Create Product'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={imageToDelete !== null}
        title="Delete Image"
        description="Are you sure you want to delete this product image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setImageToDelete(null)}
      />
    </div>
  );
}
