import { useState, useEffect, useCallback } from 'react';
import { categories as categoriesApi } from '@repo/api-client';
import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from '@repo/api-client';
import { CategoryTable } from '../components/categories/CategoryTable';
import { CategoryForm } from '../components/categories/CategoryForm';
import { DeleteCategoryDialog } from '../components/categories/DeleteCategoryDialog';
import { Plus, RefreshCw } from 'lucide-react';

type Modal =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; category: CategoryDto }
  | { type: 'delete'; category: CategoryDto };

export function Categories() {
  const [categoryList, setCategoryList] = useState<CategoryDto[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modal, setModal] = useState<Modal>({ type: 'none' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const fetchCategories = useCallback(async () => {
    setIsFetching(true);
    setFetchError('');
    const res = await categoriesApi.getCategories();
    if (res.success && res.data) {
      setCategoryList(res.data);
    } else {
      setFetchError(res.error ?? 'Failed to load categories.');
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const closeModal = () => {
    setModal({ type: 'none' });
    setMutationError('');
  };

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const handleCreate = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    setIsSubmitting(true);
    setMutationError('');
    const res = await categoriesApi.createCategory(data as CreateCategoryInput);
    if (res.success) {
      closeModal();
      await fetchCategories();
    } else {
      setMutationError(res.error ?? 'Failed to create category.');
    }
    setIsSubmitting(false);
  };

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  const handleUpdate = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    if (modal.type !== 'edit') return;
    setIsSubmitting(true);
    setMutationError('');
    const res = await categoriesApi.updateCategory(modal.category.id, data as UpdateCategoryInput);
    if (res.success) {
      closeModal();
      await fetchCategories();
    } else {
      setMutationError(res.error ?? 'Failed to update category.');
    }
    setIsSubmitting(false);
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (modal.type !== 'delete') return;
    setIsSubmitting(true);
    setMutationError('');
    const res = await categoriesApi.deleteCategory(modal.category.id);
    if (res.success) {
      closeModal();
      await fetchCategories();
    } else {
      setMutationError(res.error ?? 'Failed to delete category.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 sm:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage product categories</p>
        </div>
        <button
          id="add-category-button"
          onClick={() => setModal({ type: 'create' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8620A] text-white text-sm font-medium rounded-md hover:bg-[#d05809] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add CategoryDto
        </button>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">
            {isFetching ? 'Loading…' : `${categoryList.length} categor${categoryList.length === 1 ? 'y' : 'ies'}`}
          </span>
          <button
            id="refresh-categories-button"
            onClick={fetchCategories}
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
            <span className="text-sm">Loading categories…</span>
          </div>
        )}

        {/* Fetch Error */}
        {!isFetching && fetchError && (
          <div className="m-6 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md border border-red-100">
            {fetchError}
            <button
              onClick={fetchCategories}
              className="ml-3 underline font-medium hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {!isFetching && !fetchError && (
          <CategoryTable
            categories={categoryList}
            onEdit={(cat) => { setMutationError(''); setModal({ type: 'edit', category: cat }); }}
            onDelete={(cat) => { setMutationError(''); setModal({ type: 'delete', category: cat }); }}
          />
        )}
      </div>

      {/* Modals */}
      {modal.type === 'create' && (
        <CategoryForm
          mode="create"
          isSubmitting={isSubmitting}
          error={mutationError}
          onSubmit={handleCreate}
          onClose={closeModal}
        />
      )}

      {modal.type === 'edit' && (
        <CategoryForm
          mode="edit"
          category={modal.category}
          isSubmitting={isSubmitting}
          error={mutationError}
          onSubmit={handleUpdate}
          onClose={closeModal}
        />
      )}

      {modal.type === 'delete' && (
        <DeleteCategoryDialog
          category={modal.category}
          isSubmitting={isSubmitting}
          error={mutationError}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
