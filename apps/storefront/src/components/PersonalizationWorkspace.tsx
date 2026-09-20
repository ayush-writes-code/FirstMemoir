"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Check } from "lucide-react";
import type { ProductDto, PrintOrientation } from "@repo/api-client";
import { useProductPreview } from "../store/ProductPreviewContext";
import { FileUploader } from "./FileUploader";
import { PhotoCropper } from "./PhotoCropper";
import { ProductLivePreview } from "./ProductLivePreview";
import type { CropRect } from "../utils/cropMath";

interface Props {
  product: ProductDto;
  physicalWidth: number;
  physicalHeight: number;
  onClose: () => void;
  onSave: () => void;
  initialImageWidth: number;
  initialImageHeight: number;
  onImageSizeChange: (w: number, h: number) => void;
}

export function PersonalizationWorkspace({
  product,
  physicalWidth,
  physicalHeight,
  onClose,
  onSave,
  initialImageWidth,
  initialImageHeight,
  onImageSizeChange,
}: Props) {
  const previewContext = useProductPreview();
  const {
    uploadId,
    previewUrl,
    cropData,
    rotation,
    printOrientation,
    setUploadData,
    setCropData,
    setRotation,
    setPrintOrientation,
    zoom,
    setZoom,
    cropTranslation,
    setCropTranslation,
  } = previewContext;

  // Snapshot for cancel
  const snapshot = useRef({
    uploadId,
    previewUrl,
    cropData,
    rotation,
    printOrientation,
    zoom,
    cropTranslation,
    imageWidth: initialImageWidth,
    imageHeight: initialImageHeight,
  });

  const handleCancel = () => {
    const snap = snapshot.current;
    setUploadData(snap.uploadId, snap.previewUrl);
    setCropData(snap.cropData);
    setRotation(snap.rotation);
    setPrintOrientation(snap.printOrientation);
    setZoom(snap.zoom);
    setCropTranslation(snap.cropTranslation);
    onImageSizeChange(snap.imageWidth, snap.imageHeight);
    onClose();
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = () => {
    onSave();
  };

  const handleUploadSuccess = (
    id: string,
    url: string,
    w: number,
    h: number,
  ) => {
    setUploadData(id, url);
    onImageSizeChange(w, h);
  };

  const handleUploadReset = () => {
    setUploadData(null, null);
    onImageSizeChange(0, 0);
    setCropData({ x: 0, y: 0, width: 1, height: 1 });
    setRotation(0);
    setZoom(1);
    setCropTranslation({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-8">
      <div className="w-full h-full md:max-h-[85vh] md:max-w-6xl bg-canvas md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-hairline bg-surface flex-shrink-0">
          <h2 className="text-lg md:text-xl font-semibold text-ink">
            Personalize Print
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!uploadId}
              className="px-5 py-2 text-sm font-medium bg-brand text-white rounded-full hover:bg-brand-pressed disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Check size={16} />
              Done
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Live Preview Pane (Top on Mobile, Left on Desktop) */}
          <div className="w-full md:w-1/2 p-2 md:p-8 bg-surface-soft border-b md:border-b-0 md:border-r border-hairline flex flex-col items-center justify-center h-[35%] md:h-auto min-h-0">
            {product.images[0] ? (
              <div className="h-full aspect-square max-h-full max-w-full md:max-w-[400px] rounded-card overflow-hidden shadow-lg relative bg-white mx-auto">
                <ProductLivePreview
                  baseImage={product.images[0]}
                  productSlug={product.slug}
                  productName={product.name}
                  mockupMetadata={product.mockup_metadata}
                />
              </div>
            ) : null}
          </div>

          {/* Editor Pane */}
          <div className="flex-1 md:w-1/2 p-3 md:p-8 bg-canvas flex flex-col min-h-0">
            {!uploadId ? (
              <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                <h3 className="text-xl font-medium text-ink mb-2 text-center">
                  Upload your photo
                </h3>
                <p className="text-muted text-center mb-6">
                  Choose a high-quality image for the best print result.
                </p>
                <FileUploader
                  onUploadSuccess={handleUploadSuccess}
                  onUploadReset={handleUploadReset}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col max-w-xl mx-auto w-full">
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <h3 className="text-lg font-medium text-ink">
                    Adjust Crop & Rotation
                  </h3>
                  <button
                    onClick={handleUploadReset}
                    className="text-sm text-brand hover:text-brand-pressed font-medium"
                  >
                    Change Photo
                  </button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                  <PhotoCropper
                    imageUrl={previewUrl!}
                    imageWidth={initialImageWidth}
                    imageHeight={initialImageHeight}
                    printWidth={physicalWidth}
                    printHeight={physicalHeight}
                    orientation={printOrientation}
                    onOrientationChange={setPrintOrientation}
                    initialZoom={zoom}
                    initialRotation={rotation}
                    initialCropTranslation={cropTranslation}
                    onCropChange={(crop, z, r, o, translation) => {
                      setCropData(crop);
                      setZoom(z);
                      setRotation(r);
                      setPrintOrientation(o);
                      setCropTranslation(translation);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
