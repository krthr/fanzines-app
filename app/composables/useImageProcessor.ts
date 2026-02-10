/**
 * Client-side image processor that resizes and compresses photos on upload.
 *
 * Large photos (10–20 MB) from modern cameras are downscaled to a maximum
 * dimension suitable for print (300 DPI in an A4/8-cell grid ≈ 877 px per cell,
 * so 2400 px gives generous headroom). The result is a compressed JPEG blob
 * that typically weighs 300 KB–1 MB instead of 10–20 MB, dramatically reducing
 * memory pressure and speeding up canvas rendering at export time.
 */

/** Maximum pixel dimension (width or height) after resize. */
const MAX_DIMENSION = 2400;

/** JPEG quality for the optimized output (0–1). */
const JPEG_QUALITY = 0.85;

/**
 * Resize and compress a single image `File` into an optimized JPEG `Blob`.
 *
 * Uses `createImageBitmap` (with built-in EXIF orientation support) when
 * available, falling back to `HTMLImageElement` + `<canvas>`.
 */
export async function processImage(file: File): Promise<Blob> {
  // Decode the image -------------------------------------------------------
  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // Calculate target dimensions, preserving aspect ratio -------------------
  let targetW = origW;
  let targetH = origH;

  if (origW > MAX_DIMENSION || origH > MAX_DIMENSION) {
    if (origW >= origH) {
      targetW = MAX_DIMENSION;
      targetH = Math.round((origH / origW) * MAX_DIMENSION);
    } else {
      targetH = MAX_DIMENSION;
      targetW = Math.round((origW / origH) * MAX_DIMENSION);
    }
  }

  // Draw onto a canvas at the target size ----------------------------------
  // Prefer OffscreenCanvas (non-blocking) when available.
  let blob: Blob;

  if (typeof OffscreenCanvas !== 'undefined') {
    const offscreen = new OffscreenCanvas(targetW, targetH);
    const ctx = offscreen.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
    blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  } else {
    // Fallback for older browsers
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });
  }

  return blob;
}

/**
 * Process multiple image files in parallel, returning optimized blobs in the
 * same order as the input array.
 */
export async function processImages(files: File[]): Promise<Blob[]> {
  return Promise.all(files.map(processImage));
}
