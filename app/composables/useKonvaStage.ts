import type { PageSlot } from '~/composables/useFanzineLayout';
import type { PhotoItem, PageText, TextSize, TextColor, TextFont } from '~/composables/usePhotoStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLS = 4;
const ROWS = 2;

/** A4 landscape at 300 DPI (used for PDF export). */
export const A4_WIDTH_PX = 3508;
export const A4_HEIGHT_PX = 2480;

/** Reference preview width used by the gap slider (CSS pixels). */
const PREVIEW_REF_WIDTH = 900;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-cell crop transform (pan + zoom within cell). */
export interface CropTransform {
  /** Horizontal offset in % of image natural width (-100 to 100). */
  offsetX: number;
  /** Vertical offset in % of image natural height (-100 to 100). */
  offsetY: number;
  /** Zoom factor (1 = fit-cover, >1 = zoomed in). */
  scale: number;
}

/** Cached cell geometry. */
export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Font / text helpers
// ---------------------------------------------------------------------------

/** Map TextSize to font size in pixels relative to cell height. */
export function getTextFontSizePx(size: TextSize, cellH: number): number {
  const ratio: Record<TextSize, number> = {
    sm: 0.020,
    md: 0.030,
    lg: 0.040,
    xl: 0.053,
  };
  return Math.round(cellH * ratio[size]);
}

export function getTextFillColor(color: TextColor): string {
  switch (color) {
    case 'white': return '#ffffff';
    case 'black': return '#18181b';
    case 'rose': return '#d946ef';
  }
}

export function getKonvaFontFamily(font: TextFont): string {
  switch (font) {
    case 'sans': return 'Special Elite, sans-serif';
    case 'serif': return 'Libre Baskerville, serif';
    case 'mono': return 'Courier Prime, monospace';
    case 'handwritten': return 'Caveat, cursive';
  }
}

export function getTextFontStyle(size: TextSize): string {
  switch (size) {
    case 'sm': return 'normal';
    case 'md': return '600';
    case 'lg': return 'bold';
    case 'xl': return 'bold';
  }
}

/** Default crop transform (centered, no zoom). */
export function defaultCropTransform(): CropTransform {
  return { offsetX: 0, offsetY: 0, scale: 1 };
}

// ---------------------------------------------------------------------------
// Grid geometry calculation
// ---------------------------------------------------------------------------

/** Calculate cell rects for the given stage size and gap. */
export function calcCellRects(
  stageW: number,
  stageH: number,
  gap: number,
  refWidth: number = PREVIEW_REF_WIDTH,
): CellRect[] {
  const gapPx = Math.round((gap / refWidth) * stageW);
  const totalGapX = gapPx * (COLS - 1);
  const totalGapY = gapPx * (ROWS - 1);
  const cellW = (stageW - totalGapX) / COLS;
  const cellH = (stageH - totalGapY) / ROWS;

  const cells: CellRect[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    cells.push({
      x: col * (cellW + gapPx),
      y: row * (cellH + gapPx),
      w: cellW,
      h: cellH,
    });
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Image cover-crop calculation
// ---------------------------------------------------------------------------

/**
 * Compute the image source rect and draw dimensions for "object-fit: cover"
 * with crop transform (pan + zoom). Returns the v-image config for Konva.
 */
export function computeImageCoverConfig(
  img: HTMLImageElement,
  cellW: number,
  cellH: number,
  crop: CropTransform = defaultCropTransform(),
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number; width: number; height: number } {
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;

  // Guard against zero-dimension images (broken/corrupt files)
  if (natW === 0 || natH === 0) {
    return { cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, width: cellW, height: cellH };
  }

  const imgRatio = natW / natH;
  const cellRatio = cellW / cellH;

  // Base cover crop: determine source rect that fills the cell
  let sw: number;
  let sh: number;
  if (imgRatio > cellRatio) {
    sh = natH;
    sw = sh * cellRatio;
  } else {
    sw = natW;
    sh = sw / cellRatio;
  }

  // Apply zoom: shrink the source rect (zoom into the image)
  const scale = Math.max(1, crop.scale);
  sw /= scale;
  sh /= scale;

  // Center + pan offset
  let sx = (natW - sw) / 2 - (crop.offsetX / 100) * natW;
  let sy = (natH - sh) / 2 - (crop.offsetY / 100) * natH;

  // Clamp to image bounds
  sx = Math.max(0, Math.min(natW - sw, sx));
  sy = Math.max(0, Math.min(natH - sh, sy));

  return {
    cropX: sx,
    cropY: sy,
    cropWidth: sw,
    cropHeight: sh,
    width: cellW,
    height: cellH,
  };
}

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

/** Load an image from a URL (typically a blob URL). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Load all photos in parallel, returning images in the same order. */
export async function loadAllImages(photos: PhotoItem[]): Promise<HTMLImageElement[]> {
  return Promise.all(photos.map(p => loadImage(p.url)));
}

// ---------------------------------------------------------------------------
// Font preloading
// ---------------------------------------------------------------------------

/** Ensure a specific font family is loaded before drawing on the canvas. */
async function ensureFontLoaded(font: TextFont, size: number): Promise<void> {
  const family = getKonvaFontFamily(font);
  try {
    await document.fonts.load(`${size}px ${family}`);
  } catch {
    // Silently fall back
  }
}

/** Pre-load all fonts used by the given text overlays. */
export async function preloadFonts(pageTexts: PageText[][], sampleCellH: number): Promise<void> {
  const usedFonts = new Set(
    pageTexts.flat().filter(pt => pt.content).map(pt => pt.font),
  );
  await Promise.all(
    [...usedFonts].map(font =>
      ensureFontLoaded(font, getTextFontSizePx('lg', sampleCellH)),
    ),
  );
}
