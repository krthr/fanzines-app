const DEFAULT_MAX_DIMENSION = 2048;
const DEFAULT_QUALITY = 0.82;

/**
 * Compresses an image file on the client by resizing it to fit within
 * `maxDimension` and re-encoding as JPEG at the given quality.
 *
 * Returns a new `File` with the compressed data. The original file is
 * not mutated.
 */
export async function compressImage(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY,
): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const { width, height } = bitmap;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Failed to get canvas 2d context');
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });

  const name = file.name.replace(/\.[^.]+$/, '.jpg');
  return new File([blob], name, { type: 'image/jpeg' });
}
