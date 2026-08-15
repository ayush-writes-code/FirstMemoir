import { Product, ProductImage, Category, ProductCategory, ProductOption, ProductOptionValue, OptionExclusion } from '@repo/database';
import type { ProductDto, ProductImageDto, CategoryDto, ProductWithOptionsDto, ProductOptionDto, ProductOptionValueDto, OptionExclusionDto } from '@repo/api-client';

export function toProductImageDto(image: ProductImage & { url?: string }): ProductImageDto {
  return {
    id: image.id,
    file_key: image.file_key,
    url: image.url || '', // URL is typically added dynamically by the controller
    alt_text: image.alt_text,
    sort_order: image.sort_order,
  };
}

export function toProductDto(
  product: Product & { 
    images: (ProductImage & { url?: string })[]; 
    categories: (ProductCategory & { category: Category })[] 
  }
): ProductDto {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description,
    base_price: product.base_price.toString(),
    is_active: product.is_active,
    created_at: product.created_at.toISOString(),
    updated_at: product.updated_at.toISOString(),
    images: product.images.map(toProductImageDto),
    categories: product.categories.map(c => ({
      category: {
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
        description: c.category.description,
        is_active: c.category.is_active,
        sort_order: c.category.sort_order,
        created_at: c.category.created_at.toISOString(),
      }
    })),
  };
}

export function toProductOptionValueDto(value: ProductOptionValue): ProductOptionValueDto {
  return {
    id: value.id,
    option_id: value.option_id,
    value: value.value,
    metadata: value.metadata,
    modifier_type: value.modifier_type,
    price_modifier: value.price_modifier.toString(),
    global_material_id: value.global_material_id,
    track_inventory: value.track_inventory,
    stock_count: value.stock_count,
    is_active: value.is_active,
    sort_order: value.sort_order,
  };
}

export function toProductOptionDto(option: ProductOption & { values: ProductOptionValue[] }): ProductOptionDto {
  return {
    id: option.id,
    product_id: option.product_id,
    name: option.name,
    input_type: option.input_type,
    is_required: option.is_required,
    sort_order: option.sort_order,
    values: option.values.map(toProductOptionValueDto),
  };
}

export function toOptionExclusionDto(exclusion: OptionExclusion): OptionExclusionDto {
  return {
    id: exclusion.id,
    product_id: exclusion.product_id,
    option_value_1_id: exclusion.option_value_1_id,
    option_value_2_id: exclusion.option_value_2_id,
  };
}

export function toProductWithOptionsDto(
  product: Product & { 
    images: (ProductImage & { url?: string })[]; 
    categories: (ProductCategory & { category: Category })[];
    options: (ProductOption & { values: ProductOptionValue[] })[];
    exclusions: OptionExclusion[];
  }
): ProductWithOptionsDto {
  return {
    ...toProductDto(product),
    options: product.options.map(toProductOptionDto),
    exclusions: product.exclusions.map(toOptionExclusionDto),
  };
}
