import { useState, useMemo } from 'react';
import type { ProductImage } from '@repo/api-client';
import { ImageIcon } from 'lucide-react';

interface Props {
  images: ProductImage[];
}

export function ProductImageList({ images }: Props) {
  // We keep a small local state just to track image load errors 
  // to show a fallback, but this is still considered "pure" from a business logic standpoint.
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (imageId: string) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  const sortedImages = useMemo(() => {
    if (!images || !Array.isArray(images)) return [];
    return [...images].sort((a, b) => a.sort_order - b.sort_order);
  }, [images]);

  if (!images || !Array.isArray(images) || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
        <ImageIcon className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-700">No images uploaded</p>
        <p className="text-xs text-gray-500 mt-1 text-center">
          Images added to this product will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
      {sortedImages.map((image) => (
        <div 
          key={image.id} 
          className="relative aspect-square bg-gray-100 rounded-lg border border-gray-200 overflow-hidden"
        >
          {failedImages.has(image.id) ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <ImageIcon className="h-6 w-6 text-gray-300" />
            </div>
          ) : (
            <img
              src={image.url}
              alt={image.alt_text || 'Product image'}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => handleImageError(image.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
