import { useState, useMemo } from 'react';
import type { ProductImageDto } from '@repo/api-client';
import { ImageIcon, Trash2, Loader2, Star, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  images: ProductImageDto[];
  deletingImageId?: string | null;
  isReordering?: boolean;
  disabled?: boolean;
  onDeleteImage?: (image: ProductImageDto) => void;
  onReorderImages?: (newOrderedIds: string[]) => void;
  onSetPrimaryImage?: (image: ProductImageDto) => void;
}

interface SortableImageCardProps {
  image: ProductImageDto;
  index: number;
  isDeleting: boolean;
  isDisabled: boolean;
  onDeleteImage?: (image: ProductImageDto) => void;
  onSetPrimaryImage?: (image: ProductImageDto) => void;
  onImageError: (imageId: string) => void;
  hasFailed: boolean;
}

function SortableImageCard({
  image,
  index,
  isDeleting,
  isDisabled,
  onDeleteImage,
  onSetPrimaryImage,
  onImageError,
  hasFailed,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled: isDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isPrimary = index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative aspect-square bg-gray-100 rounded-lg border border-gray-200 overflow-hidden group touch-none select-none ${
        isDragging ? 'opacity-30 border-dashed border-[#E8620A]' : 'opacity-100'
      }`}
    >
      {hasFailed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <ImageIcon className="h-6 w-6 text-gray-300" />
        </div>
      ) : (
        <img
          src={image.url}
          alt={image.alt_text || 'Product image'}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => onImageError(image.id)}
        />
      )}

      {/* Primary Badge / Set as Primary Button */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        {isPrimary ? (
          <span className="inline-flex items-center gap-1 bg-[#E8620A] text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
            <Star className="w-3 h-3 fill-white" />
            Primary
          </span>
        ) : (
          onSetPrimaryImage && !isDeleting && (
            <button
              type="button"
              aria-label="Set as primary image"
              disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSetPrimaryImage(image);
              }}
              className="p-1.5 bg-white/90 hover:bg-white text-gray-500 hover:text-[#E8620A] rounded-full shadow-sm border border-gray-200/50 backdrop-blur-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Set as primary image"
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>

      {/* Action Overlay: Drag Handle & Delete */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {/* Grip Handle Indicator */}
        {!isDisabled && !isDeleting && (
          <div 
            className="p-1 bg-black/30 text-white/80 rounded-full backdrop-blur-xs cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Delete Button */}
        {onDeleteImage && !isDeleting && (
          <button
            type="button"
            aria-label="Delete image"
            disabled={isDisabled}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeleteImage(image);
            }}
            className="p-1.5 bg-white/90 hover:bg-white text-gray-600 hover:text-red-600 rounded-full shadow-sm border border-gray-200/50 backdrop-blur-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading Overlay */}
      {isDeleting && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
          <Loader2 className="w-6 h-6 text-[#E8620A] animate-spin" />
        </div>
      )}
    </div>
  );
}

export function ProductImageList({
  images,
  deletingImageId,
  isReordering,
  disabled,
  onDeleteImage,
  onReorderImages,
  onSetPrimaryImage,
}: Props) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const activeImage = useMemo(() => {
    if (!activeId) return null;
    return sortedImages.find((img) => img.id === activeId) || null;
  }, [activeId, sortedImages]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedImages.findIndex((img) => img.id === active.id);
      const newIndex = sortedImages.findIndex((img) => img.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sortedImages, oldIndex, newIndex);
        const newOrderedIds = reordered.map((img) => img.id);
        onReorderImages?.(newOrderedIds);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

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

  const isDisabled = disabled || isReordering || !!deletingImageId;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={sortedImages.map((img) => img.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {sortedImages.map((image, index) => (
            <SortableImageCard
              key={image.id}
              image={image}
              index={index}
              isDeleting={deletingImageId === image.id}
              isDisabled={isDisabled}
              onDeleteImage={onDeleteImage}
              onSetPrimaryImage={onSetPrimaryImage}
              onImageError={handleImageError}
              hasFailed={failedImages.has(image.id)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
        {activeImage ? (
          <div className="relative aspect-square bg-gray-100 rounded-lg border-2 border-[#E8620A] overflow-hidden shadow-2xl scale-105">
            <img
              src={activeImage.url}
              alt={activeImage.alt_text || 'Dragging preview'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

