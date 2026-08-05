import { Category } from '@repo/database';
import type { CategoryDto, CategoryTreeDto } from '@repo/api-client';

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    is_active: category.is_active,
    sort_order: category.sort_order,
    created_at: category.created_at.toISOString(),
  };
}

export function buildCategoryTree(categories: Category[]): CategoryTreeDto[] {
  const map = new Map<string, CategoryTreeDto>();
  const roots: CategoryTreeDto[] = [];

  // Initialize the map with DTOs
  for (const cat of categories) {
    map.set(cat.id, {
      ...toCategoryDto(cat),
      children: [],
    });
  }

  // Link children to parents
  for (const cat of categories) {
    const dto = map.get(cat.id)!;
    if (cat.parent_id) {
      const parentDto = map.get(cat.parent_id);
      if (parentDto) {
        parentDto.children.push(dto);
      } else {
        // Parent not found (e.g. filtered out), treat as root or handle accordingly
        // For now, we will add it to roots if parent is missing
        roots.push(dto);
      }
    } else {
      roots.push(dto);
    }
  }

  // Sort roots and children by sort_order
  const sortTree = (nodes: CategoryTreeDto[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortTree(node.children);
      }
    }
  };

  sortTree(roots);

  return roots;
}
