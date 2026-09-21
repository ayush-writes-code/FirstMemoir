import { useState } from 'react';
import type { ProductWithOptionsDto, ProductOptionValueDto } from '@repo/api-client';
import { products as productsApi } from '@repo/api-client';
import { Plus, Trash2, AlertCircle, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  product: ProductWithOptionsDto;
  onRefresh: () => void;
}

interface ValueFormState {
  value: string;
  price_modifier: number;
  modifier_type: 'FLAT' | 'PERCENTAGE';
  showMetadata: boolean;
  width: string;
  height: string;
  unit: string;
  pkgLength: string;
  pkgWidth: string;
  pkgHeight: string;
  pkgWeight: string;
  customJson: string;
  isCustomJsonMode: boolean;
}

const initialValueFormState: ValueFormState = {
  value: '',
  price_modifier: 0,
  modifier_type: 'FLAT',
  showMetadata: false,
  width: '',
  height: '',
  unit: 'in',
  pkgLength: '',
  pkgWidth: '',
  pkgHeight: '',
  pkgWeight: '',
  customJson: '',
  isCustomJsonMode: false,
};

export function ProductOptionsEditor({ product, onRefresh }: Props) {
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOption, setNewOption] = useState({ name: '', input_type: 'SELECT', is_required: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [valueForm, setValueForm] = useState<ValueFormState>(initialValueFormState);

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

  const startEditValue = (val: ProductOptionValueDto) => {
    const meta = val.metadata as any;
    setValueForm({
      value: val.value,
      price_modifier: Number(val.price_modifier) || 0,
      modifier_type: (val.modifier_type as 'FLAT' | 'PERCENTAGE') || 'FLAT',
      showMetadata: Boolean(meta),
      width: meta?.width !== undefined ? String(meta.width) : '',
      height: meta?.height !== undefined ? String(meta.height) : '',
      unit: meta?.unit || 'in',
      pkgLength: meta?.packaging?.length !== undefined ? String(meta.packaging.length) : '',
      pkgWidth: meta?.packaging?.width !== undefined ? String(meta.packaging.width) : '',
      pkgHeight: meta?.packaging?.height !== undefined ? String(meta.packaging.height) : '',
      pkgWeight: meta?.packaging?.weight !== undefined ? String(meta.packaging.weight) : '',
      customJson: meta ? JSON.stringify(meta, null, 2) : '',
      isCustomJsonMode: false,
    });
    setEditingValueId(val.id);
    setActiveOptionId(val.option_id);
    setError('');
  };

  const handleSaveValue = async (e: React.FormEvent, optionId: string) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      let metadata: any = null;
      if (valueForm.isCustomJsonMode && valueForm.customJson.trim()) {
        try {
          metadata = JSON.parse(valueForm.customJson);
        } catch (err: any) {
          setError('Invalid custom metadata JSON: ' + err.message);
          setLoading(false);
          return;
        }
      } else if (valueForm.showMetadata) {
        const metaObj: any = {};
        if (valueForm.width.trim() || valueForm.height.trim()) {
          const w = Number(valueForm.width);
          const h = Number(valueForm.height);
          if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
            setError('Physical width and height must be positive numbers if specified.');
            setLoading(false);
            return;
          }
          metaObj.width = w;
          metaObj.height = h;
          metaObj.unit = valueForm.unit.trim() || 'in';
        }
        if (valueForm.pkgLength.trim() || valueForm.pkgWidth.trim() || valueForm.pkgHeight.trim() || valueForm.pkgWeight.trim()) {
          const l = Number(valueForm.pkgLength);
          const w = Number(valueForm.pkgWidth);
          const h = Number(valueForm.pkgHeight);
          const wt = Number(valueForm.pkgWeight);
          if (isNaN(l) || l <= 0 || isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(wt) || wt <= 0) {
            setError('All packaging fields (length, width, height, weight) must be positive numbers if specified.');
            setLoading(false);
            return;
          }
          metaObj.packaging = { length: l, width: w, height: h, weight: wt };
        }
        if (Object.keys(metaObj).length > 0) {
          metadata = metaObj;
        }
      }

      const payload = {
        value: valueForm.value.trim(),
        price_modifier: valueForm.price_modifier,
        modifier_type: valueForm.modifier_type,
        metadata,
      };

      if (editingValueId) {
        await (productsApi as any).updateProductOptionValue(product.id, optionId, editingValueId, payload);
      } else {
        await productsApi.createProductOptionValue(product.id, optionId, payload);
      }

      setValueForm(initialValueFormState);
      setActiveOptionId(null);
      setEditingValueId(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save option value');
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
          <h3 className="text-sm font-medium text-gray-900">Product Options</h3>
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
                  placeholder="e.g. Size, Frame, Glass"
                  required
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#E8620A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Input Type</label>
                <select
                  value={newOption.input_type}
                  onChange={e => setNewOption({ ...newOption, input_type: e.target.value as any })}
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
                      {option.values.map(val => {
                        const meta = val.metadata as any;
                        const hasDims = meta?.width && meta?.height;
                        const hasPkg = meta?.packaging?.length && meta?.packaging?.weight;
                        const hasCustom = meta && !hasDims && !hasPkg;

                        return (
                          <div key={val.id} className="px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">{val.value}</span>
                              {Number(val.price_modifier) !== 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                  Number(val.price_modifier) > 0 
                                    ? 'bg-green-50 text-green-700 border-green-100' 
                                    : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                  {Number(val.price_modifier) > 0 ? '+' : ''}₹{val.price_modifier} {val.modifier_type === 'PERCENTAGE' ? '%' : ''}
                                </span>
                              )}
                              {hasDims && (
                                <span className="text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100" title="Physical dimensions">
                                  📐 {meta.width}×{meta.height} {meta.unit || 'in'}
                                </span>
                              )}
                              {hasPkg && (
                                <span className="text-[11px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100" title="Packaging dimensions & weight">
                                  📦 {meta.packaging.length}×{meta.packaging.width}×{meta.packaging.height} cm • {meta.packaging.weight}kg
                                </span>
                              )}
                              {hasCustom && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono" title={JSON.stringify(meta)}>
                                  {'{...}'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditValue(val)}
                                className="text-gray-400 hover:text-[#E8620A] p-1"
                                title="Edit Value & Metadata"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteValue(option.id, val.id)}
                                className="text-gray-400 hover:text-red-500 p-1"
                                title="Delete Value"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No values added yet.</p>
                  )}

                  {activeOptionId === option.id ? (
                    <form onSubmit={(e) => handleSaveValue(e, option.id)} className="bg-gray-50 p-3.5 rounded border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">
                          {editingValueId ? 'Edit Option Value' : 'Add Option Value'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setValueForm(prev => ({ ...prev, showMetadata: !prev.showMetadata }));
                          }}
                          className="text-xs text-[#E8620A] hover:underline flex items-center gap-1"
                        >
                          {valueForm.showMetadata ? (
                            <>Hide Metadata <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>Configure Metadata & Packaging <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Value Name</label>
                          <input
                            type="text"
                            value={valueForm.value}
                            onChange={e => setValueForm({ ...valueForm, value: e.target.value })}
                            placeholder="e.g. 12x18, Walnut"
                            required
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Price Modifier</label>
                          <input
                            type="number"
                            value={valueForm.price_modifier}
                            onChange={e => setValueForm({ ...valueForm, price_modifier: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Type</label>
                          <select
                            value={valueForm.modifier_type}
                            onChange={e => setValueForm({ ...valueForm, modifier_type: e.target.value as any })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="FLAT">Flat (₹)</option>
                            <option value="PERCENTAGE">Percentage (%)</option>
                          </select>
                        </div>
                      </div>

                      {/* Metadata Sub-form */}
                      {valueForm.showMetadata && (
                        <div className="pt-2 border-t border-gray-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                              Metadata & Shipping Specs
                            </span>
                            <button
                              type="button"
                              onClick={() => setValueForm(prev => ({ ...prev, isCustomJsonMode: !prev.isCustomJsonMode }))}
                              className="text-[11px] text-gray-500 hover:text-gray-700 underline"
                            >
                              {valueForm.isCustomJsonMode ? 'Switch to structured fields' : 'Switch to raw JSON mode'}
                            </button>
                          </div>

                          {valueForm.isCustomJsonMode ? (
                            <div>
                              <label className="block text-[11px] text-gray-600 mb-1">Raw Metadata JSON</label>
                              <textarea
                                value={valueForm.customJson}
                                onChange={e => setValueForm({ ...valueForm, customJson: e.target.value })}
                                rows={4}
                                placeholder='{ "width": 12, "height": 18, "unit": "in", "packaging": { ... } }'
                                className="w-full font-mono text-xs px-2 py-1.5 border border-gray-300 rounded"
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Physical dimensions */}
                              <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                  Physical Dimensions (Print/Frame Size)
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <input
                                      type="number"
                                      placeholder="Width"
                                      value={valueForm.width}
                                      onChange={e => setValueForm({ ...valueForm, width: e.target.value })}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      placeholder="Height"
                                      value={valueForm.height}
                                      onChange={e => setValueForm({ ...valueForm, height: e.target.value })}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <select
                                      value={valueForm.unit}
                                      onChange={e => setValueForm({ ...valueForm, unit: e.target.value })}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    >
                                      <option value="in">Inches (in)</option>
                                      <option value="cm">Centimeters (cm)</option>
                                      <option value="mm">Millimeters (mm)</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Packaging specs */}
                              <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                  Packaging Courier Specs (Shiprocket)
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <input
                                      type="number"
                                      placeholder="L (cm)"
                                      value={valueForm.pkgLength}
                                      onChange={e => setValueForm({ ...valueForm, pkgLength: e.target.value })}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      placeholder="W (cm)"
                                      value={valueForm.pkgWidth}
                                      onChange={e => setValueForm({ ...valueForm, pkgWidth: e.target.value })}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      placeholder="H (cm)"
                                      value={valueForm.pkgHeight}
                                      onChange={e => setValueForm({ ...valueForm, pkgHeight: e.target.value })}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      step="0.1"
                                      placeholder="Wt (kg)"
                                      value={valueForm.pkgWeight}
                                      onChange={e => setValueForm({ ...valueForm, pkgWeight: e.target.value })}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveOptionId(null);
                            setEditingValueId(null);
                            setValueForm(initialValueFormState);
                            setError('');
                          }}
                          className="text-xs px-2.5 py-1 text-gray-600 hover:bg-gray-200 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading || !valueForm.value.trim()}
                          className="text-xs px-3 py-1 bg-[#E8620A] text-white rounded hover:bg-[#d05809] disabled:opacity-50"
                        >
                          {editingValueId ? 'Update Value' : 'Add Value'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveOptionId(option.id);
                        setEditingValueId(null);
                        setValueForm(initialValueFormState);
                        setError('');
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
