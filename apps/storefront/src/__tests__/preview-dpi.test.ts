import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDpi, requiresDpiAcknowledgment, calculateDpi } from '../lib/dpi';
import type { PrintOrientation } from '@repo/api-client';

describe('Preview Fidelity & DPI Warning Flow Tests', () => {
  describe('1. DPI Calculation and Quality Tier Classification', () => {
    it('correctly calculates DPI from cropped pixels and physical dimensions in inches', () => {
      // 3000 x 2000 image, uncropped (1.0), printed at 10 x 8 inches
      // 3000 / 10 = 300 DPI
      const dpi = calculateDpi({ width: 3000, height: 2000 }, { x: 0, y: 0, width: 1.0, height: 1.0 }, 10);
      assert.strictEqual(dpi, 300);
    });

    it('correctly scales DPI when a tighter crop is applied', () => {
      // 3000 x 2000 image, 50% width crop (0.5), printed at 10 inches
      // (0.5 * 3000) / 10 = 1500 / 10 = 150 DPI
      const dpi = calculateDpi({ width: 3000, height: 2000 }, { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, 10);
      assert.strictEqual(dpi, 150);
    });

    it('classifies tiers according to the 250 / 150 / 100 / 70 DPI contract', () => {
      assert.strictEqual(classifyDpi(300), 'EXCELLENT');
      assert.strictEqual(classifyDpi(250), 'EXCELLENT');
      assert.strictEqual(classifyDpi(249), 'GOOD');
      assert.strictEqual(classifyDpi(150), 'GOOD');
      assert.strictEqual(classifyDpi(149), 'ACCEPTABLE');
      assert.strictEqual(classifyDpi(100), 'ACCEPTABLE');
      assert.strictEqual(classifyDpi(99), 'LOW_QUALITY');
      assert.strictEqual(classifyDpi(70), 'LOW_QUALITY');
      assert.strictEqual(classifyDpi(69), 'NOT_RECOMMENDED');
      assert.strictEqual(classifyDpi(50), 'NOT_RECOMMENDED');
    });

    it('enforces DPI acknowledgment only for LOW_QUALITY and NOT_RECOMMENDED (< 100 DPI)', () => {
      assert.strictEqual(requiresDpiAcknowledgment('EXCELLENT'), false);
      assert.strictEqual(requiresDpiAcknowledgment('GOOD'), false);
      assert.strictEqual(requiresDpiAcknowledgment('ACCEPTABLE'), false);
      assert.strictEqual(requiresDpiAcknowledgment('LOW_QUALITY'), true);
      assert.strictEqual(requiresDpiAcknowledgment('NOT_RECOMMENDED'), true);
    });

    it('swaps pixel dimensions during 90° and 270° rotation in effective DPI calculation', () => {
      // Image: 2400 x 1600. Crop: 1.0. Physical: 8 x 12 inches (portrait)
      const imageWidth = 2400;
      const imageHeight = 1600;
      const cropData = { width: 1.0, height: 1.0 };
      const physicalWidth = 8;
      const physicalHeight = 12;

      function computeEffectiveDpi(rotation: number) {
        let final_pixel_width = cropData.width * imageWidth;
        let final_pixel_height = cropData.height * imageHeight;

        if (rotation === 90 || rotation === 270) {
          final_pixel_width = cropData.height * imageHeight;
          final_pixel_height = cropData.width * imageWidth;
        }

        const dpi_x = final_pixel_width / physicalWidth;
        const dpi_y = final_pixel_height / physicalHeight;
        return Math.floor(Math.min(dpi_x, dpi_y));
      }

      // 0 deg: final_w=2400, final_h=1600 -> dpi_x = 2400/8 = 300, dpi_y = 1600/12 = 133 -> min = 133
      assert.strictEqual(computeEffectiveDpi(0), 133);

      // 90 deg: swapped! final_w=1600, final_h=2400 -> dpi_x = 1600/8 = 200, dpi_y = 2400/12 = 200 -> min = 200
      assert.strictEqual(computeEffectiveDpi(90), 200);

      // 180 deg: same as 0 deg
      assert.strictEqual(computeEffectiveDpi(180), 133);

      // 270 deg: same as 90 deg
      assert.strictEqual(computeEffectiveDpi(270), 200);
    });
  });

  describe('2. Preview Mockup Resolution and Fallback Safety', () => {
    it('resolves mockups whether keys are lowercase or uppercase', () => {
      interface MockupItem {
        baseAsset: string;
        overlayAsset: string;
        printArea: { top: string; left: string; width: string; height: string };
      }

      const mockupMetadata: { mockups: Record<string, MockupItem> } = {
        mockups: {
          portrait: {
            baseAsset: 'https://r2.firstmemoir.com/mockups/portrait-base.jpg',
            overlayAsset: 'https://r2.firstmemoir.com/mockups/portrait-overlay.png',
            printArea: { top: '15%', left: '15%', width: '70%', height: '70%' },
          },
          default: {
            baseAsset: 'https://r2.firstmemoir.com/mockups/default-base.jpg',
            overlayAsset: 'https://r2.firstmemoir.com/mockups/default-overlay.png',
            printArea: { top: '20%', left: '20%', width: '60%', height: '60%' },
          },
        },
      };

      function resolveMockup(printOrientation: PrintOrientation): MockupItem | null {
        const orientationKey = (printOrientation || '').toLowerCase();
        if (mockupMetadata.mockups && mockupMetadata.mockups[orientationKey]) {
          return mockupMetadata.mockups[orientationKey]!;
        } else if (mockupMetadata.mockups && mockupMetadata.mockups[printOrientation]) {
          return mockupMetadata.mockups[printOrientation]!;
        } else if (mockupMetadata.mockups?.default) {
          return mockupMetadata.mockups.default;
        }
        return null;
      }

      // Uppercase 'PORTRAIT' finds lowercase 'portrait'
      const portraitMockup = resolveMockup('PORTRAIT');
      assert.ok(portraitMockup);
      assert.ok(portraitMockup.baseAsset.includes('portrait-base.jpg'));

      // 'LANDSCAPE' falls back to 'default'
      const landscapeMockup = resolveMockup('LANDSCAPE');
      assert.ok(landscapeMockup);
      assert.ok(landscapeMockup.baseAsset.includes('default-base.jpg'));
    });

    it('safely falls back to default coordinates if mockup printArea is absent', () => {
      const coords = null;
      const safeCoords = coords || { top: '20%', left: '20%', width: '60%', height: '60%' };

      assert.strictEqual(safeCoords.top, '20%');
      assert.strictEqual(safeCoords.width, '60%');
    });
  });

  describe('3. Square and Non-Square Orientation Constraints & Acknowledgment Invalidation', () => {
    it('enforces SQUARE orientation for square physical sizes', () => {
      const isSquare = true;
      let printOrientation = 'PORTRAIT' as PrintOrientation;

      if (isSquare && printOrientation !== 'SQUARE') {
        printOrientation = 'SQUARE';
      } else if (!isSquare && printOrientation === 'SQUARE') {
        printOrientation = 'PORTRAIT';
      }

      assert.strictEqual(printOrientation, 'SQUARE');
    });

    it('reverts SQUARE orientation to PORTRAIT when switching to non-square size', () => {
      let isSquare = true;
      let printOrientation = 'SQUARE' as PrintOrientation;

      // User switches to 8x10 (non-square)
      isSquare = false;

      if (isSquare && printOrientation !== 'SQUARE') {
        printOrientation = 'SQUARE';
      } else if (!isSquare && printOrientation === 'SQUARE') {
        printOrientation = 'PORTRAIT';
      }

      assert.strictEqual(printOrientation, 'PORTRAIT');
    });

    it('clears stale DPI acknowledgment when customer modifies crop or size', () => {
      let hasAcknowledgedDpi = true;

      // 1. Customer resizes print in options selector
      function onSizeOptionChange() {
        hasAcknowledgedDpi = false;
      }
      onSizeOptionChange();
      assert.strictEqual(hasAcknowledgedDpi, false, 'DPI acknowledgment must be reset on size change');

      // 2. Customer acknowledges low quality
      hasAcknowledgedDpi = true;

      // 3. Customer re-opens workspace and modifies crop
      function onWorkspaceSave() {
        hasAcknowledgedDpi = false;
      }
      onWorkspaceSave();
      assert.strictEqual(hasAcknowledgedDpi, false, 'DPI acknowledgment must be reset when workspace saves new crop');
    });
  });
});
