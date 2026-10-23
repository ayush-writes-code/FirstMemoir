import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCropDimensions,
  visualCropToCanonicalCrop,
  canonicalCropToVisualCrop,
  type CropRect,
} from '../utils/cropMath';
import { DEFAULT_MANUFACTURING_PROFILE } from '../config/manufacturing';

describe('Photo Cropper Correctness & Aspect Ratio Tests', () => {
  describe('1. computeCropDimensions & Orientation Constraints', () => {
    it('calculates portrait aspect ratio correctly with manufacturing bleed (8x12 inches)', () => {
      const result = computeCropDimensions(8, 12, 'PORTRAIT');
      const expectedTargetW = 8 + 2 * DEFAULT_MANUFACTURING_PROFILE.bleedInches; // 8.5
      const expectedTargetH = 12 + 2 * DEFAULT_MANUFACTURING_PROFILE.bleedInches; // 12.5
      const expectedAspect = expectedTargetW / expectedTargetH; // 0.68

      assert.strictEqual(result.orientedWidth, 8, 'Oriented width should be smaller dimension for portrait');
      assert.strictEqual(result.orientedHeight, 12, 'Oriented height should be larger dimension for portrait');
      assert.strictEqual(result.targetWidth, 8.5, 'Target width includes 2x 0.25" bleed');
      assert.strictEqual(result.targetHeight, 12.5, 'Target height includes 2x 0.25" bleed');
      assert.strictEqual(result.aspect, expectedAspect, 'Aspect ratio must match 8.5/12.5');
    });

    it('calculates landscape aspect ratio correctly when orientation switches (8x12 inches)', () => {
      // Even if dimensions are provided as 8 and 12, landscape must orient as 12x8
      const result = computeCropDimensions(8, 12, 'LANDSCAPE');
      const expectedTargetW = 12 + 2 * DEFAULT_MANUFACTURING_PROFILE.bleedInches; // 12.5
      const expectedTargetH = 8 + 2 * DEFAULT_MANUFACTURING_PROFILE.bleedInches; // 8.5
      const expectedAspect = expectedTargetW / expectedTargetH; // 1.470588...

      assert.strictEqual(result.orientedWidth, 12, 'Oriented width must be larger dimension for landscape');
      assert.strictEqual(result.orientedHeight, 8, 'Oriented height must be smaller dimension for landscape');
      assert.strictEqual(result.targetWidth, 12.5, 'Target width includes 2x 0.25" bleed');
      assert.strictEqual(result.targetHeight, 8.5, 'Target height includes 2x 0.25" bleed');
      assert.strictEqual(result.aspect, expectedAspect, 'Aspect ratio must flip to 12.5/8.5');
      assert.ok(result.aspect > 1, 'Landscape aspect ratio must be greater than 1');
    });

    it('handles inverted input dimensions gracefully (12x8 passed with PORTRAIT orientation)', () => {
      // Regardless of how the product options ordered dimensions (e.g. 12x8 vs 8x12), portrait must enforce vertical
      const result = computeCropDimensions(12, 8, 'PORTRAIT');
      assert.strictEqual(result.orientedWidth, 8);
      assert.strictEqual(result.orientedHeight, 12);
      assert.strictEqual(result.aspect, 8.5 / 12.5);
    });

    it('handles square print dimensions correctly (10x10 inches)', () => {
      const result = computeCropDimensions(10, 10, 'SQUARE');
      assert.strictEqual(result.orientedWidth, 10);
      assert.strictEqual(result.orientedHeight, 10);
      assert.strictEqual(result.aspect, 1.0, 'Square aspect ratio must be 1.0');
    });

    it('derives accurate bleed and safe-zone percentages', () => {
      const result = computeCropDimensions(8, 12, 'PORTRAIT');
      // Bleed is 0.25 on 8.5 = 2.9411%
      const expectedBleedX = (0.25 / 8.5) * 100;
      // Bleed is 0.25 on 12.5 = 2.0%
      const expectedBleedY = (0.25 / 12.5) * 100;

      assert.ok(Math.abs(result.bleedPctX - expectedBleedX) < 0.001);
      assert.ok(Math.abs(result.bleedPctY - expectedBleedY) < 0.001);

      // Safe zone is 0.25 bleed + 0.5 safe = 0.75 on 8.5
      const expectedSafeX = (0.75 / 8.5) * 100;
      const expectedSafeY = (0.75 / 12.5) * 100;

      assert.ok(Math.abs(result.safeZonePctX - expectedSafeX) < 0.001);
      assert.ok(Math.abs(result.safeZonePctY - expectedSafeY) < 0.001);
    });
  });

  describe('2. visualCropToCanonicalCrop Inverse Transformation', () => {
    it('returns exact normalized coordinates for 0 degree rotation', () => {
      const visualCrop: CropRect = { x: 10, y: 20, width: 60, height: 50 };
      const canonical = visualCropToCanonicalCrop(visualCrop, 0);

      assert.strictEqual(canonical.x, 0.1);
      assert.strictEqual(canonical.y, 0.2);
      assert.strictEqual(canonical.width, 0.6);
      assert.strictEqual(canonical.height, 0.5);
    });

    it('inverts 90 degree clockwise rotation correctly', () => {
      // In a 90 deg visual crop, visual top-left (0,0) corresponds to canonical bottom-left (0,1)
      const visualFull: CropRect = { x: 0, y: 0, width: 100, height: 100 };
      const canonical = visualCropToCanonicalCrop(visualFull, 90);

      assert.strictEqual(canonical.x, 0);
      assert.strictEqual(canonical.y, 0);
      assert.strictEqual(canonical.width, 1);
      assert.strictEqual(canonical.height, 1);
    });

    it('inverts 180 degree rotation correctly', () => {
      const visualCrop: CropRect = { x: 10, y: 20, width: 60, height: 50 };
      const canonical = visualCropToCanonicalCrop(visualCrop, 180);

      // vX = 0.1, vY = 0.2, vW = 0.6, vH = 0.5
      // 180 deg maps (vx, vy) -> (1-vx, 1-vy)
      // corners: (0.9, 0.8), (0.3, 0.8), (0.9, 0.3), (0.3, 0.3)
      // minX = 0.3, minY = 0.3, maxX = 0.9, maxY = 0.8
      assert.strictEqual(canonical.x, 0.3);
      assert.strictEqual(canonical.y, 0.3);
      assert.strictEqual(canonical.width, 0.6);
      assert.strictEqual(canonical.height, 0.5);
    });

    it('clamps canonical crop coordinates strictly to [0, 1] range', () => {
      // Even with slight floating point or visual overshoot
      const visualOverflow: CropRect = { x: 0, y: 0, width: 100.0001, height: 100 };
      const canonical = visualCropToCanonicalCrop(visualOverflow, 0);

      assert.ok(canonical.x >= 0 && canonical.x <= 1, 'x must be in [0, 1]');
      assert.ok(canonical.y >= 0 && canonical.y <= 1, 'y must be in [0, 1]');
      assert.ok(canonical.width <= 1, 'width must not exceed 1');
      assert.ok(canonical.height <= 1, 'height must not exceed 1');
      assert.ok(canonical.x + canonical.width <= 1.000001, 'crop bounding box must not exceed 1');
    });

    it('round-trips between canonicalCropToVisualCrop and visualCropToCanonicalCrop', () => {
      const initialCanonical: CropRect = { x: 0.15, y: 0.25, width: 0.5, height: 0.4 };
      const visual = canonicalCropToVisualCrop(initialCanonical, 0);
      const restored = visualCropToCanonicalCrop(visual, 0);

      assert.ok(Math.abs(restored.x - initialCanonical.x) < 0.001);
      assert.ok(Math.abs(restored.y - initialCanonical.y) < 0.001);
      assert.ok(Math.abs(restored.width - initialCanonical.width) < 0.001);
      assert.ok(Math.abs(restored.height - initialCanonical.height) < 0.001);
    });
  });
});
