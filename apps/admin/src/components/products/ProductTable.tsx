import type { ProductDto } from '@repo/api-client';
import { Pencil, Trash2 } from 'lucide-react';

interface Props {
  products: ProductDto[];
  onEdit: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}

export function ProductTable({ products, onEdit, onDelete }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No products yet.</p>
        <p className="text-sm mt-1">Click "Add Product" to create the first one.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {products.map((prod) => (
            <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{prod.name}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{prod.slug}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                ₹{Number(prod.base_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                {prod.categories.length > 0 
                  ? prod.categories.map(c => c.category.name).join(', ')
                  : '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    prod.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {prod.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button
                  id={`edit-product-${prod.id}`}
                  onClick={() => onEdit(prod)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-gray-600 hover:text-[#E8620A] hover:bg-[#FFF3EC] transition-colors text-xs font-medium"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  id={`delete-product-${prod.id}`}
                  onClick={() => onDelete(prod)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors text-xs font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
