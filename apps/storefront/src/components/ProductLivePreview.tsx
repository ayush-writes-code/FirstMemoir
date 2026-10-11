'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { ProductImageDto } from '@/lib/api-client';
import { useProductPreview } from '../store/ProductPreviewContext';
import { getMockupCoordinates, getPremiumMockup } from '../config/mockupCoordinates';
import { canonicalCropToVisualCrop } from '../utils/cropMath';

const DEFAULT_PREVIEW_FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200';

interface Props {
  baseImage: ProductImageDto;
  productSlug: string;
  productName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockupMetadata?: any;
}

export function ProductLivePreview({ baseImage, productSlug, productName, mockupMetadata }: Props) {
  const { previewUrl, cropData, printOrientation, rotation = 0 } = useProductPreview();
  const [baseImgSrc, setBaseImgSrc] = useState(baseImage.url || DEFAULT_PREVIEW_FALLBACK);

  useEffect(() => {
    setBaseImgSrc(baseImage.url || DEFAULT_PREVIEW_FALLBACK);
  }, [baseImage.url]);
  
  // Data-driven fallback checking mockupMetadata directly
  let premiumMockup = null;
  if (mockupMetadata?.mockups && mockupMetadata.mockups[printOrientation]) {
    premiumMockup = mockupMetadata.mockups[printOrientation];
  } else if (mockupMetadata?.mockups?.default) {
    premiumMockup = mockupMetadata.mockups.default;
  } else {
    // Legacy hardcoded fallback
    premiumMockup = getPremiumMockup(productSlug, printOrientation);
  }

  // Same for coords
  let coords = premiumMockup ? premiumMockup.printArea : null;
  if (!coords && mockupMetadata?.coordinates && mockupMetadata.coordinates[baseImage.sort_order]) {
    coords = mockupMetadata.coordinates[baseImage.sort_order];
  }
  if (!coords) {
    coords = getMockupCoordinates(productSlug, baseImage.sort_order);
  }

  // Convert canonical unrotated crop back to visual crop on the rotated image
  const vCrop = canonicalCropToVisualCrop(cropData, rotation);
  const vW = vCrop.width / 100;
  const vH = vCrop.height / 100;
  const vX = vCrop.x / 100;
  const vY = vCrop.y / 100;

  // The rotated wrapper spans the visual crop region
  const wrapperWidth = vW > 0 ? (100 / vW) : 100;
  const wrapperHeight = vH > 0 ? (100 / vH) : 100;
  const wrapperLeft = vW > 0 ? -(vX / vW * 100) : 0;
  const wrapperTop = vH > 0 ? -(vY / vH * 100) : 0;
  
  const isSideways = rotation % 180 === 90;

  if (premiumMockup) {
    return (
      <div className="relative w-full h-full">
        {/* Layer 1: Base Background */}
        <Image 
          src={premiumMockup.baseAsset} 
          alt={`Mockup for ${productName}`} 
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover"
        />

        {/* Layer 2: Customer Overlay Layer */}
        {previewUrl && (
          <div 
            className="absolute overflow-hidden"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              height: coords.height,
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: `${wrapperWidth}%`,
                height: `${wrapperHeight}%`,
                left: `${wrapperLeft}%`,
                top: `${wrapperTop}%`,
                containerType: 'size',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <img 
                src={previewUrl} 
                alt="Your custom print"
                className="max-w-none pointer-events-none"
                style={{
                  width: isSideways ? '100cqh' : '100cqw',
                  height: isSideways ? '100cqw' : '100cqh',
                  transform: `rotate(${rotation}deg)`,
                  objectFit: 'fill'
                }}
              />
            </div>
          </div>
        )}

        {/* Layer 3: Overlay (Glass, Frame, Shadow) */}
        {previewUrl && (
          <Image 
            src={premiumMockup.overlayAsset} 
            alt="Frame Overlay" 
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover pointer-events-none"
          />
        )}
      </div>
    );
  }

  // Fallback to legacy 2-layer approach
  return (
    <div className="relative w-full h-full">
      {/* Base Mockup Layer */}
      <Image
        src={baseImgSrc}
        alt={`Mockup for ${productName}`}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        priority
        className="object-cover"
        onError={() => {
          if (baseImgSrc !== DEFAULT_PREVIEW_FALLBACK) {
            setBaseImgSrc(DEFAULT_PREVIEW_FALLBACK);
          }
        }}
      />

      {/* Customer Overlay Layer */}
      {previewUrl && (
        <div 
          className="absolute overflow-hidden"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            height: coords.height,
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.4)', // Fake physical frame lip shadow
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: `${wrapperWidth}%`,
              height: `${wrapperHeight}%`,
              left: `${wrapperLeft}%`,
              top: `${wrapperTop}%`,
              containerType: 'size',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <img 
              src={previewUrl} 
              alt="Your custom print"
              className="max-w-none pointer-events-none"
              style={{
                width: isSideways ? '100cqh' : '100cqw',
                height: isSideways ? '100cqw' : '100cqh',
                transform: `rotate(${rotation}deg)`,
                objectFit: 'fill'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
