import { useState } from 'react';
import type { ProductWithOptionsDto } from '@repo/api-client';
import { products as productsApi } from '@repo/api-client';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface Props {
  product: ProductWithOptionsDto;
  onRefresh: () => void;
}

export function ProductOptionsEditor({ product, onRefresh }: Props) {
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOption, setNewOption] = useState({ name: '', input_type: 'SELECT', is_required: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState({ value: '', price_modifier: 0, modifier_type: 'FLAT' });

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await productsApi.createProductOption(product.id, newOption);
      setNewOption({ name: '', input_type: 'SELECT', is_required: true });
      setIsAddingOption(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add option');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this option?')) return;
    try {
      setLoading(true);
      await productsApi.deleteProductOption(product.id, optionId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete option');
    } finally {
      setLoading(false);
    }
  };

  const handleAddValue = async (e: React.FormEvent, optionId: string) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await productsApi.createProductOptionValue(product.id, optionId, {
        value: newValue.value,
        price_modifier: newValue.price_modifier,
        modifier_type: newValue.modifier_type,
      });
      setNewValue({ value: '', price_modifier: 0, modifier_type: 'FLAT' });
      setActiveOptionId(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add option value');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteValue = async (optionId: string, valueId: string) => {
    if (!confirm('Are you sure you want to delete this value?')) return;
    try {
      setLoading(true);
      await productsApi.deleteProductOptionValue(product.id, optionId, valueId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete option value');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-md border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Options List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">ProductDto Options</h3>
          {!isAddingOption && (
            <button
              type="button"
              onClick={() => setIsAddingOption(true)}
              className="text-sm text-[#E8620A] hover:text-[#d05809] font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Option
            </button>
          )}
        </div>

        {isAddingOption && (
          <form onSubmit={handleAddOption} className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Option Name</label>
                <input
                  type="text"
                  value={newOption.name}
                  onChange={e => setNewOption({ ...newOption, name: e.target.value })}
                  placeholder="e.g. Size, Frame"
                  required
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#E8620A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Input Type</label>
                <select
                  value={newOption.input_type}
                  onChange={e => setNewOption({ ...newOption, input_type: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#E8620A]"
                >
                  <option value="SELECT">Select Dropdown</option>
                  <option value="RADIO">Radio Buttons</option>
                  <option value="BUTTON">Button Group</option>
                  <option value="SWATCH">Color Swatches</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_required"
                checked={newOption.is_required}
                onChange={e => setNewOption({ ...newOption, is_required: e.target.checked })}
                className="rounded border-gray-300 text-[#E8620A] focus:ring-[#E8620A]"
              />
              <label htmlFor="is_required" className="text-xs text-gray-700">Required option</label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingOption(false)}
                className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !newOption.name}
                className="text-xs px-3 py-1.5 bg-[#E8620A] text-white rounded hover:bg-[#d05809] disabled:opacity-50"
              >
                Save Option
              </button>
            </div>
          </form>
        )}

        {product.options?.length === 0 && !isAddingOption ? (
          <p className="text-sm text-gray-500 italic">No options defined for this product.</p>
        ) : (
          <div className="space-y-4">
            {product.options?.map(option => (
              <div key={option.id} className="border border-gray-200 rounded-md bg-white overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{option.name}</h4>
                    <p className="text-xs text-gray-500">{option.input_type} • {option.is_required ? 'Required' : 'Optional'}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteOption(option.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Delete Option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {option.values?.length > 0 ? (
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                      {option.values.map(val => (
                        <div key={val.id} className="px-3 py-2 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-900">{val.value}</span>
                            {Number(val.price_modifier) > 0 && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                                +₹{val.price_modifier} {val.modifier_type === 'PERCENTAGE' ? '%' : ''}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteValue(option.id, val.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No values added yet.</p>
                  )}

                  {activeOptionId === option.id ? (
                    <form onSubmit={(e) => handleAddValue(e, option.id)} className="bg-gray-50 p-3 rounded border border-gray-200 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Value</label>
                          <input
                            type="text"
                            value={newValue.value}
                            onChange={e => setNewValue({ ...newValue, value: e.target.value })}
                            placeholder="e.g. Small, Red"
                            required
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Price Modifier</label>
                          <input
                            type="number"
                            value={newValue.price_modifier}
                            onChange={e => setNewValue({ ...newValue, price_modifier: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Type</label>
                          <select
                            value={newValue.modifier_type}
                            onChange={e => setNewValue({ ...newValue, modifier_type: e.target.value as any })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="FLAT">Flat (₹)</option>
                            <option value="PERCENTAGE">Percentage (%)</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveOptionId(null)}
                          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-200 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading || !newValue.value}
                          className="text-xs px-2 py-1 bg-[#E8620A] text-white rounded hover:bg-[#d05809] disabled:opacity-50"
                        >
                          Add Value
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveOptionId(option.id);
                        setNewValue({ value: '', price_modifier: 0, modifier_type: 'FLAT' });
                      }}
                      className="text-xs text-gray-500 hover:text-[#E8620A] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Value
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Exclusions Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Option Exclusions</h3>
        <p className="text-xs text-gray-500 mb-4">Define combinations that are not allowed (e.g. Canvas + Glass).</p>
        
        {/* Simple visual indication of exclusions for MVP */}
        {product.exclusions?.length > 0 ? (
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            {product.exclusions.map(ex => (
              <li key={ex.id}>
                Excluded combination: <span className="font-mono text-xs">{ex.option_value_1_id}</span> ❌ <span className="font-mono text-xs">{ex.option_value_2_id}</span>
                <button
                  onClick={() => productsApi.removeOptionExclusion(product.id, ex.id).then(onRefresh)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 inline" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No exclusions defined.</p>
        )}
        
        {/* To fully implement add exclusion UI, we'd need dropdowns of all option values. This is good for MVP. */}
      </div>
    </div>
  );
}
