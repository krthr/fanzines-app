import type { PhotoItem } from '~/composables/usePhotoStore';
import type { PageText, TextSize, TextColor, TextFont } from '~/composables/usePhotoStore';
import type { PageSlot } from '~/composables/useFanzineLayout';

// A4 landscape at 300 DPI
const DPI = 300;
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;
const A4_WIDTH_PX = Math.round((A4_WIDTH_MM / 25.4) * DPI); // 3508
const A4_HEIGHT_PX = Math.round((A4_HEIGHT_MM / 25.4) * DPI); // 2480

const COLS = 4;
const ROWS = 2;

/** Guide line styling constants (in mm) */
const GUIDE_LINE_WIDTH = 0.3;
const CUT_LINE_WIDTH = 0.4;
const CROP_MARK_LENGTH = 5;
const CROP_MARK_OFFSET = 2;
const LABEL_FONT_SIZE = 6;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const cellRatio = dw / dh;

  let sx: number, sy: number, sw: number, sh: number;

  if (imgRatio > cellRatio) {
    sh = img.naturalHeight;
    sw = sh * cellRatio;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  }
  else {
    sw = img.naturalWidth;
    sh = sw / cellRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Draw a single image into a grid cell, rotating 180° if needed.
 */
function drawCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  rotated: boolean,
): void {
  if (rotated) {
    ctx.save();
    // Translate to the center of the cell, rotate 180°, then draw offset
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI);
    drawImageCover(ctx, img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  else {
    drawImageCover(ctx, img, x, y, w, h);
  }
}

/** Map TextSize to font size in print pixels (at 300 DPI) */
function getTextFontSize(size: TextSize): number {
  switch (size) {
    case 'sm': return 24;
    case 'md': return 36;
    case 'lg': return 48;
  }
}

/** Map TextColor to CSS-style color string */
function getTextFillColor(color: TextColor): string {
  switch (color) {
    case 'white': return '#ffffff';
    case 'black': return '#18181b';
    case 'rose': return '#f43f5e';
  }
}

/** Map TextFont to the CSS font-family string used on the canvas */
function getCanvasFontFamily(font: TextFont): string {
  switch (font) {
    case 'sans': return "'Space Grotesk', sans-serif";
    case 'serif': return "'Playfair Display', serif";
    case 'mono': return "'JetBrains Mono', monospace";
    case 'handwritten': return "'Caveat', cursive";
  }
}

/**
 * Ensure a specific font family is loaded before drawing on the canvas.
 * Uses the Font Loading API (`document.fonts.load`).
 */
async function ensureFontLoaded(font: TextFont, size: number): Promise<void> {
  const family = getCanvasFontFamily(font);
  try {
    await document.fonts.load(`${size}px ${family}`);
  } catch {
    // Silently fall back -- the canvas will use the next available family
  }
}

/**
 * Draw a text overlay on a cell in the canvas.
 * Handles optional gradient background, font family, centering, and rotation
 * for top-row cells.
 */
function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  pageText: PageText,
  x: number,
  y: number,
  w: number,
  h: number,
  rotated: boolean,
): void {
  if (!pageText.content) return;

  const fontSize = getTextFontSize(pageText.size);
  const padding = fontSize * 0.6;
  const barHeight = fontSize + padding * 2;

  ctx.save();

  if (rotated) {
    // For rotated cells, we need to rotate the entire overlay 180 degrees
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }

  // Determine bar position based on text position
  let barY: number;
  if (pageText.position === 'top') {
    barY = y;
  } else if (pageText.position === 'center') {
    barY = y + (h - barHeight) / 2;
  } else {
    barY = y + h - barHeight;
  }

  // Draw background (only if showBg is true)
  if (pageText.showBg) {
    const isLightText = pageText.color !== 'black';
    if (pageText.position === 'center') {
      // Center: uniform semi-transparent bar
      ctx.fillStyle = isLightText ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(x, barY, w, barHeight);
    } else if (pageText.position === 'top') {
      const gradient = ctx.createLinearGradient(x, barY, x, barY + barHeight * 1.5);
      if (isLightText) {
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      else {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(x, barY, w, barHeight * 1.5);
    }
    else {
      const gradient = ctx.createLinearGradient(x, barY + barHeight, x, barY - barHeight * 0.5);
      if (isLightText) {
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      else {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(x, barY - barHeight * 0.5, w, barHeight * 1.5);
    }
  }

  // Draw text with the selected font
  const fontFamily = getCanvasFontFamily(pageText.font);
  const weight = fontSize >= 48 ? 'bold' : fontSize >= 36 ? '600' : 'normal';
  ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = getTextFillColor(pageText.color);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textX = x + w / 2;
  const textY = barY + barHeight / 2;

  ctx.fillText(pageText.content, textX, textY, w - padding * 2);

  ctx.restore();
}

export function useExportPdf() {
  const isExporting = ref(false);
  const { LAYOUT } = useFanzineLayout();

  async function exportToPdf(
    photos: PhotoItem[],
    gap: number,
    options: { showGuides?: boolean; filename?: string; pageTexts?: PageText[] } = {},
  ): Promise<void> {
    const { showGuides = true, filename = 'fanzine.pdf', pageTexts } = options;
    if (photos.length === 0) return;

    isExporting.value = true;

    try {
      // Scale gap from CSS pixels to print pixels (gap is relative to a ~900px wide preview)
      const gapPx = Math.round((gap / 900) * A4_WIDTH_PX);

      const totalGapX = gapPx * (COLS - 1);
      const totalGapY = gapPx * (ROWS - 1);
      const cellW = Math.floor((A4_WIDTH_PX - totalGapX) / COLS);
      const cellH = Math.floor((A4_HEIGHT_PX - totalGapY) / ROWS);

      // Create offscreen canvas at exact print dimensions
      const canvas = document.createElement('canvas');
      canvas.width = A4_WIDTH_PX;
      canvas.height = A4_HEIGHT_PX;
      const ctx = canvas.getContext('2d')!;

      // Fill background black (visible in gaps)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

      // Load all images in parallel
      const images = await Promise.all(
        photos.map(photo => loadImage(photo.url)),
      );

      // Draw each image into its grid cell, rotating top-row cells 180°
      for (let i = 0; i < images.length; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = col * (cellW + gapPx);
        const y = row * (cellH + gapPx);
        const slot = LAYOUT[i] as PageSlot | undefined;
        const rotated = slot?.rotated ?? false;

        drawCell(ctx, images[i]!, x, y, cellW, cellH, rotated);
      }

      // Draw text overlays on the canvas (before converting to PDF image)
      if (pageTexts) {
        // Pre-load all fonts used by text overlays so they render on the canvas
        const usedFonts = new Set(
          pageTexts.filter(pt => pt.content).map(pt => pt.font),
        );
        await Promise.all(
          [...usedFonts].map(font => ensureFontLoaded(font, getTextFontSize('lg'))),
        );

        for (let i = 0; i < Math.min(pageTexts.length, images.length); i++) {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x = col * (cellW + gapPx);
          const y = row * (cellH + gapPx);
          const slot = LAYOUT[i] as PageSlot | undefined;
          const rotated = slot?.rotated ?? false;

          drawTextOverlay(ctx, pageTexts[i]!, x, y, cellW, cellH, rotated);
        }
      }

      // Generate PDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Add the photo grid as a full-page image
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

      // Draw print guides on top of the image (vector, crisp at any zoom)
      if (showGuides) {
        drawPrintGuides(pdf, gap);
      }

      pdf.save(filename);
    }
    finally {
      isExporting.value = false;
    }
  }

  return {
    exportToPdf,
    isExporting,
  };
}

// ---------------------------------------------------------------------------
// PDF print guide helpers (all coordinates in mm)
// ---------------------------------------------------------------------------

interface JsPdfLike {
  setDrawColor(r: number, g: number, b: number): void;
  setLineWidth(width: number): void;
  setLineDashPattern(dash: number[], phase: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  setFontSize(size: number): void;
  setTextColor(r: number, g: number, b: number): void;
  text(text: string, x: number, y: number, options?: Record<string, unknown>): void;
}

function drawPrintGuides(pdf: JsPdfLike, gap: number): void {
  const gapMm = (gap / 900) * A4_WIDTH_MM;
  const cellW = (A4_WIDTH_MM - gapMm * (COLS - 1)) / COLS;
  const cellH = (A4_HEIGHT_MM - gapMm * (ROWS - 1)) / ROWS;

  // --- Fold lines (dashed, light gray) ---
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(GUIDE_LINE_WIDTH);
  pdf.setLineDashPattern([2, 2], 0);

  // Horizontal center fold
  const yCenter = cellH + gapMm / 2;
  pdf.line(0, yCenter, A4_WIDTH_MM, yCenter);

  // Vertical fold lines at 1/4, 1/2, 3/4
  for (const fraction of [0.25, 0.5, 0.75]) {
    const xFold = A4_WIDTH_MM * fraction;
    pdf.line(xFold, 0, xFold, A4_HEIGHT_MM);
  }

  // --- Cut line (solid red, center horizontal, middle half only) ---
  pdf.setDrawColor(220, 80, 80);
  pdf.setLineWidth(CUT_LINE_WIDTH);
  pdf.setLineDashPattern([], 0); // solid

  const cutX1 = A4_WIDTH_MM * 0.25;
  const cutX2 = A4_WIDTH_MM * 0.75;
  pdf.line(cutX1, yCenter, cutX2, yCenter);

  // Scissors symbol: small "X" at the start of the cut line
  pdf.setDrawColor(220, 80, 80);
  pdf.setLineWidth(0.25);
  const sSize = 1.5;
  pdf.line(cutX1 - sSize, yCenter - sSize, cutX1 + sSize, yCenter + sSize);
  pdf.line(cutX1 - sSize, yCenter + sSize, cutX1 + sSize, yCenter - sSize);

  // --- Crop marks (dark gray, solid, at the four corners) ---
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([], 0);

  const corners: [number, number, number, number][] = [
    // [hLineX1, hLineX2, vLineY1, vLineY2] relative to corner point
    // Top-left
    ...cropMarkLines(0, 0, 1, 1),
    // Top-right
    ...cropMarkLines(A4_WIDTH_MM, 0, -1, 1),
    // Bottom-left
    ...cropMarkLines(0, A4_HEIGHT_MM, 1, -1),
    // Bottom-right
    ...cropMarkLines(A4_WIDTH_MM, A4_HEIGHT_MM, -1, -1),
  ];

  for (const [x1, y1, x2, y2] of corners) {
    pdf.line(x1, y1, x2, y2);
  }

  // --- Page labels (tiny text near each cell) ---
  pdf.setFontSize(LABEL_FONT_SIZE);
  pdf.setTextColor(160, 160, 160);

  for (const slot of useFanzineLayout().LAYOUT) {
    const cx = slot.col * (cellW + gapMm) + cellW / 2;
    const cy = slot.row * (cellH + gapMm);

    // Place label just inside the top of each cell
    const labelY = cy + 3;
    const label = slot.role === 'frontCover' ? 'FRONT'
      : slot.role === 'backCover' ? 'BACK'
      : slot.role.replace('page', 'P');

    pdf.text(label, cx, labelY, { align: 'center' });

    // Add rotation indicator for top-row cells
    if (slot.rotated) {
      pdf.setFontSize(5);
      pdf.text('(180\u00B0)', cx, labelY + 3, { align: 'center' });
      pdf.setFontSize(LABEL_FONT_SIZE);
    }
  }
}

/**
 * Generate two crop-mark line segments for a corner point.
 * `dx` and `dy` indicate the direction pointing inward (+1 or -1).
 */
function cropMarkLines(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): [number, number, number, number][] {
  const offset = CROP_MARK_OFFSET;
  const len = CROP_MARK_LENGTH;
  return [
    // Horizontal mark
    [cx + offset * dx, cy, cx + (offset + len) * dx, cy],
    // Vertical mark
    [cx, cy + offset * dy, cx, cy + (offset + len) * dy],
  ];
}
