import { useState, useEffect, useCallback } from 'react';
import { products as productsApi, categories as categoriesApi } from '@repo/api-client';
import type { Product, Category, CreateProductInput, UpdateProductInput } from '@repo/api-client';
import { ProductTable } from '../components/products/ProductTable';
import { ProductForm } from '../components/products/ProductForm';
import { DeleteProductDialog } from '../components/products/DeleteProductDialog';
import { Plus, RefreshCw } from 'lucide-react';

type Modal =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; product: Product }
  | { type: 'delete'; product: Product };

export function Products() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modal, setModal] = useState<Modal>({ type: 'none' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const fetchProductsAndCategories = useCallback(async () => {
    setIsFetching(true);
    setFetchError('');
    
    // Fetch both in parallel
    const [prodRes, catRes] = await Promise.all([
      productsApi.getProducts(),
      categoriesApi.getCategories()
    ]);
    
    if (prodRes.success && prodRes.data && catRes.success && catRes.data) {
      setProductList(prodRes.data);
      setCategoryList(catRes.data);
    } else {
      setFetchError(prodRes.error ?? catRes.error ?? 'Failed to load data.');
    }
    
    setIsFetching(false);
  }, []);

  useEffect(() => {
    fetchProductsAndCategories();
  }, [fetchProductsAndCategories]);

  const closeModal = () => {
    setModal({ type: 'none' });
    setMutationError('');
  };

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const handleCreate = async (data: CreateProductInput | UpdateProductInput) => {
    setIsSubmitting(true);
    setMutationError('');
    const res = await productsApi.createProduct(data as CreateProductInput);
    if (res.success) {
      closeModal();
      await fetchProductsAndCategories();
    } else {
      setMutationError(res.error ?? 'Failed to create product.');
    }
    setIsSubmitting(false);
  };

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  const handleUpdate = async (data: CreateProductInput | UpdateProductInput) => {
    if (modal.type !== 'edit') return;
    setIsSubmitting(true);
    setMutationError('');
    const res = await productsApi.updateProduct(modal.product.id, data as UpdateProductInput);
    if (res.success) {
      closeModal();
      await fetchProductsAndCategories();
    } else {
      setMutationError(res.error ?? 'Failed to update product.');
    }
    setIsSubmitting(false);
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (modal.type !== 'delete') return;
    setIsSubmitting(true);
    setMutationError('');
    const res = await productsApi.deleteProduct(modal.product.id);
    if (res.success) {
      closeModal();
      await fetchProductsAndCategories();
    } else {
      setMutationError(res.error ?? 'Failed to delete product.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 sm:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage products and pricing</p>
        </div>
        <button
          id="add-product-button"
          onClick={() => setModal({ type: 'create' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8620A] text-white text-sm font-medium rounded-md hover:bg-[#d05809] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">
            {isFetching ? 'Loading…' : `${productList.length} product${productList.length === 1 ? '' : 's'}`}
          </span>
          <button
            id="refresh-products-button"
            onClick={fetchProductsAndCategories}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Loading State */}
        {isFetching && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading products…</span>
          </div>
        )}

        {/* Fetch Error */}
        {!isFetching && fetchError && (
          <div className="m-6 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md border border-red-100">
            {fetchError}
            <button
              onClick={fetchProductsAndCategories}
              className="ml-3 underline font-medium hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {!isFetching && !fetchError && (
          <ProductTable
            products={productList}
            onEdit={(prod) => { setMutationError(''); setModal({ type: 'edit', product: prod }); }}
            onDelete={(prod) => { setMutationError(''); setModal({ type: 'delete', product: prod }); }}
          />
        )}
      </div>

      {/* Modals */}
      {modal.type === 'create' && (
        <ProductForm
          mode="create"
          categories={categoryList}
          isSubmitting={isSubmitting}
          error={mutationError}
          onSubmit={handleCreate}
          onClose={closeModal}
        />
      )}

      {modal.type === 'edit' && (
        <ProductForm
          mode="edit"
          product={modal.product}
          categories={categoryList}
          isSubmitting={isSubmitting}
          error={mutationError}
          onSubmit={handleUpdate}
          onClose={closeModal}
        />
      )}

      {modal.type === 'delete' && (
        <DeleteProductDialog
          product={modal.product}
          isSubmitting={isSubmitting}
          error={mutationError}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
