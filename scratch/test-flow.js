const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function createTestImage(filePath) {
  // Create a 1x1 png image base64
  const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const testImagePath = path.join(__dirname, 'test.png');
    await createTestImage(testImagePath);

    console.log("Navigating to HOME...");
    await page.goto('http://localhost:3000/');
    
    // Go to first product
    console.log("Navigating to PRODUCT...");
    await page.click('a[href^="/products/"]');
    await page.waitForLoadState('networkidle');

    console.log("Opening CONFIGURE/WORKSPACE...");
    await page.click('button:has-text("Upload Photo")');

    console.log("UPLOADING...");
    // Find file input and upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    // Assuming FileUploader has something clickable or dropzone
    await page.locator('input[type="file"]').setInputFiles(testImagePath);
    
    console.log("Waiting for upload to complete...");
    // wait for cropper or live preview to appear
    await page.waitForSelector('text=Done', { timeout: 10000 });
    
    console.log("Saving CROP/PREVIEW...");
    await page.click('button:has-text("Done")');

    console.log("Checking if state persisted...");
    await page.waitForSelector('text=Edit Crop');
    const hasEditCrop = await page.isVisible('text=Edit Crop');
    if (!hasEditCrop) throw new Error("Upload state did not persist. 'Edit Crop' button missing.");

    console.log("Adding to CART...");
    await page.click('button:has-text("Add to Cart")');
    await page.waitForSelector('text=Checkout');

    console.log("Navigating to CHECKOUT...");
    await page.click('a[href="/checkout"]');
    await page.waitForLoadState('networkidle');

    console.log("Verifying checkout has item...");
    const cartItems = await page.locator('.cart-item, [class*="item"], text=Total').count();
    if (cartItems === 0) throw new Error("Cart is empty on checkout page.");
    
    console.log("SUCCESS! Flow verified end-to-end.");
  } catch (err) {
    console.error("FLOW FAILED:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
