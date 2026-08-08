'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import { visualCropToCanonicalCrop, CropRect } from '../utils/cropMath';
import { DEFAULT_MANUFACTURING_PROFILE } from '../config/manufacturing';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import type { PrintOrientation } from '@repo/api-client';

interface PhotoCropperProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  printWidth: number; // in inches
  printHeight: number; // in inches
  orientation: PrintOrientation;
  onCropChange: (canonicalCrop: CropRect, zoom: number, rotation: number, orientation: PrintOrientation) => void;
  onOrientationChange: (orientation: PrintOrientation) => void;
}

export function PhotoCropper({
  imageUrl,
  imageWidth,
  imageHeight,
  printWidth,
  printHeight,
  orientation,
  onCropChange,
  onOrientationChange
}: PhotoCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  // Allow switching orientation if product supports it (i.e. not square)
  const isSquare = printWidth === printHeight;

  // Calculate aspect ratio including bleed
  const profile = DEFAULT_MANUFACTURING_PROFILE;
  const targetWidth = printWidth + 2 * profile.bleedInches;
  const targetHeight = printHeight + 2 * profile.bleedInches;
  const aspect = targetWidth / targetHeight;

  // Percentage of the crop area that is bleed and safe zone
  const bleedPctX = (profile.bleedInches / targetWidth) * 100;
  const bleedPctY = (profile.bleedInches / targetHeight) * 100;
  const safeZonePctX = ((profile.bleedInches + profile.safeZoneInches) / targetWidth) * 100;
  const safeZonePctY = ((profile.bleedInches + profile.safeZoneInches) / targetHeight) * 100;

  const handleRotation = () => {
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    // react-easy-crop returns croppedArea in percentages 0-100 of the VISUAL ROTATED image.
    const visualCrop = {
      x: croppedArea.x,
      y: croppedArea.y,
      width: croppedArea.width,
      height: croppedArea.height
    };
    const canonicalCrop = visualCropToCanonicalCrop(visualCrop, rotation);
    onCropChange(canonicalCrop, zoom, rotation, orientation);
  }, [rotation, zoom, orientation, onCropChange]);

  return (
    <div className="flex flex-col gap-4">
      {/* Cropper Container */}
      <div className="relative w-full h-[400px] bg-canvas rounded-lg overflow-hidden">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          onRotationChange={(r) => setRotation(r as 0 | 90 | 180 | 270)}
          showGrid={false}
          classes={{
            containerClassName: 'w-full h-full',
            cropAreaClassName: 'crop-area-container'
          }}
        />

        {/* Manufacturing Overlays */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           {/* We inject custom CSS into the global space or use a trick.
               react-easy-crop sets width/height on its crop area.
               We can't easily put an overlay inside the dynamic crop box without styling hooks,
               but we can draw a crosshair or static overlay if we override the CSS.
               Actually, a better way is to style .crop-area-container globally.
            */}
           <style dangerouslySetInnerHTML={{__html: `
             .crop-area-container::after {
               content: '';
               position: absolute;
               top: ${bleedPctY}%;
               left: ${bleedPctX}%;
               right: ${bleedPctX}%;
               bottom: ${bleedPctY}%;
               border: 1px dashed rgba(255, 0, 0, 0.7);
             }
             .crop-area-container::before {
               content: '';
               position: absolute;
               top: ${safeZonePctY}%;
               left: ${safeZonePctX}%;
               right: ${safeZonePctX}%;
               bottom: ${safeZonePctY}%;
               border: 1px dashed rgba(0, 255, 0, 0.7);
             }
           `}} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-lg border border-hairline">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(1, z - 0.1))}
            className="p-2 hover:bg-neutral-100 rounded text-ink"
            aria-label="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24"
          />
          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            className="p-2 hover:bg-neutral-100 rounded text-ink"
            aria-label="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleRotation}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded hover:bg-neutral-50 text-sm font-medium"
          >
            <RotateCw size={16} />
            Rotate
          </button>

          {!isSquare && (
            <div className="flex bg-neutral-100 rounded p-1">
              <button
                onClick={() => onOrientationChange('PORTRAIT')}
                className={`px-3 py-1 text-sm font-medium rounded ${orientation === 'PORTRAIT' ? 'bg-white shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                Portrait
              </button>
              <button
                onClick={() => onOrientationChange('LANDSCAPE')}
                className={`px-3 py-1 text-sm font-medium rounded ${orientation === 'LANDSCAPE' ? 'bg-white shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                Landscape
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted flex gap-4 justify-center">
        <span className="flex items-center gap-1"><span className="w-3 h-0 border-t border-dashed border-red-500 inline-block"></span> Bleed Line</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0 border-t border-dashed border-green-500 inline-block"></span> Safe Zone</span>
      </div>
    </div>
  );
}
