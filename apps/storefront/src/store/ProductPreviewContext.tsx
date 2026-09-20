'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { PrintOrientation } from '@/lib/api-client';
import type { CropRect } from '../utils/cropMath';

interface ProductPreviewState {
  uploadId: string | null;
  previewUrl: string | null;
  cropData: CropRect;
  printOrientation: PrintOrientation;
  selectedFrameName: string | null;
  rotation: number;
  zoom: number;
  cropTranslation: { x: number; y: number };
}

interface ProductPreviewActions {
  setUploadData: (uploadId: string | null, previewUrl: string | null) => void;
  setCropData: (crop: CropRect) => void;
  setPrintOrientation: (orientation: PrintOrientation) => void;
  setSelectedFrameName: (frameName: string | null) => void;
  setRotation: (rotation: number) => void;
  setZoom: (zoom: number) => void;
  setCropTranslation: (crop: { x: number; y: number }) => void;
}

export type ProductPreviewContextType = ProductPreviewState & ProductPreviewActions;

const ProductPreviewContext = createContext<ProductPreviewContextType | null>(null);

export function ProductPreviewProvider({ children }: { children: React.ReactNode }) {
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropData, setCropData] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const [printOrientation, setPrintOrientation] = useState<PrintOrientation>('PORTRAIT');
  const [selectedFrameName, setSelectedFrameName] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [cropTranslation, setCropTranslation] = useState<{x: number, y: number}>({ x: 0, y: 0 });

  const setUploadData = useCallback((newUploadId: string | null, newPreviewUrl: string | null) => {
    setUploadId(newUploadId);
    setPreviewUrl(newPreviewUrl);
  }, []);

  return (
    <ProductPreviewContext.Provider
      value={{
        uploadId,
        previewUrl,
        cropData,
        printOrientation,
        selectedFrameName,
        setUploadData,
        setCropData,
        setPrintOrientation,
        setSelectedFrameName,
        rotation,
        setRotation,
        zoom,
        setZoom,
        cropTranslation,
        setCropTranslation,
      }}
    >
      {children}
    </ProductPreviewContext.Provider>
  );
}

export function useProductPreview() {
  const context = useContext(ProductPreviewContext);
  if (!context) {
    throw new Error('useProductPreview must be used within a ProductPreviewProvider');
  }
  return context;
}
