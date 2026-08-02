import { useState, useEffect } from 'react';
import { products as productsApi } from '@repo/api-client';
import type { Product, Category, CreateProductInput, UpdateProductInput, ProductImage } from '@repo/api-client';
import { X } from 'lucide-react';
import { ProductImageList } from './ProductImageList';
import { ProductImageUpload } from './ProductImageUpload';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  mode: 'create' | 'edit';
  product?: Product;
  categories: Category[];
  isSubmitting: boolean;
  error: string;
  onSubmit: (data: CreateProductInput | UpdateProductInput) => void;
  onClose: () => void;
  onRefresh?: () => void;
}

interface FormState {
  name: string;
  description: string;
  base_price: string;
  category_ids: string[];
  is_active: boolean;
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
  
  return '';
}

export function ProductForm({ mode, product, categories, isSubmitting, error, onSubmit, onClose, onRefresh }: Props) {
  const [form, setForm] = useState<FormState>({
    name: product?.name ?? '',
    description: product?.description ?? '',
    base_price: product?.base_price ?? '',
    category_ids: product?.categories.map(c => c.category.id) ?? [],
    is_active: product?.is_active ?? true,
  });
  const [localError, setLocalError] = useState('');
  
  // Image deletion state
  const [imageToDelete, setImageToDelete] = useState<ProductImage | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Reset form only when the selected product ID changes.
  // This prevents form wipeout when the product is refreshed with new images after an upload.
  useEffect(() => {
    setForm({
      name: product?.name ?? '',
      description: product?.description ?? '',
      base_price: product?.base_price ?? '',
      category_ids: product?.categories.map(c => c.category.id) ?? [],
      is_active: product?.is_active ?? true,
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
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      base_price: form.base_price.trim(),
      category_ids: form.category_ids,
      is_active: form.is_active,
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

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-0">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
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

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1">
          <form id="product-form" onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
            {displayError && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-md border border-red-100">
                {displayError}
              </div>
            )}

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
          </form>

          {/* Product Images (Only in Edit Mode) */}
          {mode === 'edit' && product && (
            <div className="px-6 pb-5">
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Product Images</h3>
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
                  disabled={isSubmitting}
                  onDeleteImage={(image) => setImageToDelete(image)}
                />
              </div>
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
