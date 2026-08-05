import { useState, useEffect } from 'react';
import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from '@repo/api-client';
import { X } from 'lucide-react';

interface Props {
  mode: 'create' | 'edit';
  category?: CategoryDto;
  isSubmitting: boolean;
  error: string;
  onSubmit: (data: CreateCategoryInput | UpdateCategoryInput) => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  description: string;
  sort_order: string;
  is_active: boolean;
}

function validate(state: FormState): string {
  const name = state.name.trim();
  if (!name) return 'Name is required.';
  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (name.length > 100) return 'Name cannot exceed 100 characters.';
  const desc = state.description.trim();
  if (desc.length > 500) return 'Description cannot exceed 500 characters.';
  const order = Number(state.sort_order);
  if (!Number.isInteger(order) || order < 0) return 'Sort order must be a whole number ≥ 0.';
  return '';
}

export function CategoryForm({ mode, category, isSubmitting, error, onSubmit, onClose }: Props) {
  const [form, setForm] = useState<FormState>({
    name: category?.name ?? '',
    description: category?.description ?? '',
    sort_order: String(category?.sort_order ?? 0),
    is_active: category?.is_active ?? true,
  });
  const [localError, setLocalError] = useState('');

  // Reset form when category changes (e.g. switching edit targets)
  useEffect(() => {
    setForm({
      name: category?.name ?? '',
      description: category?.description ?? '',
      sort_order: String(category?.sort_order ?? 0),
      is_active: category?.is_active ?? true,
    });
    setLocalError('');
  }, [category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    };
    onSubmit(payload);
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Add Category' : 'Edit Category'}
          </h2>
          <button
            id="close-category-form"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form id="category-form" onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {displayError && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-md border border-red-100">
              {displayError}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="cat-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              required
              placeholder="e.g. Canvas Prints"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A]"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="cat-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="cat-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={500}
              rows={3}
              placeholder="Brief description of the category…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A] resize-none"
            />
            <p className="text-xs text-gray-400 mt-0.5 text-right">{form.description.length}/500</p>
          </div>

          {/* Sort Order */}
          <div>
            <label htmlFor="cat-sort-order" className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <input
              id="cat-sort-order"
              name="sort_order"
              type="number"
              min={0}
              step={1}
              value={form.sort_order}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E8620A] focus:border-[#E8620A]"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <input
              id="cat-is-active"
              name="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-[#E8620A] border-gray-300 rounded focus:ring-[#E8620A]"
            />
            <label htmlFor="cat-is-active" className="text-sm font-medium text-gray-700">
              Active (visible to customers)
            </label>
          </div>

          {/* Slug note for edit mode */}
          {mode === 'edit' && category && (
            <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-md">
              Slug: <span className="font-mono text-gray-600">{category.slug}</span> — slugs are immutable.
            </p>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            id="submit-category-form"
            type="submit"
            form="category-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#E8620A] rounded-md hover:bg-[#d05809] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : mode === 'create' ? (
              'Create Category'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
