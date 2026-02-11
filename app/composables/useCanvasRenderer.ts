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

/** Visual state for interactive overlays (selection highlights, etc.). */
export interface InteractionState {
  /** Currently selected cell index for reorder mode, or null. */
  selectedIndex: number | null;
  /** Cell index being hovered as a swap target, or null. */
  hoverIndex: number | null;
  /** Currently selected text id for drag, or null. */
  selectedTextId: string | null;
  /** Cell index that has an open text editor, or null. */
  editingIndex: number | null;
  /** Active interaction mode. */
  mode: 'reorder' | 'text';
}

/** Options passed to the render function. */
export interface RenderOptions {
  /** Photos to render (index = grid position). */
  photos: PhotoItem[];
  /** Loaded HTMLImageElement or ImageBitmap objects (index = grid position). */
  images: (HTMLImageElement | ImageBitmap)[];
  /** Layout definition from useFanzineLayout. */
  layout: PageSlot[];
  /** Gap in CSS pixels (relative to PREVIEW_REF_WIDTH). */
  gap: number;
  /** Text overlays per cell. */
  pageTexts: PageText[][];
  /** Per-cell crop transforms (index = grid position). */
  cropTransforms: CropTransform[];
  /** Whether to draw fold guide overlays. */
  showGuides: boolean;
  /** Whether to draw page label overlays. */
  showLabels: boolean;
  /** Whether the grid is in readonly mode (no interaction highlights). */
  readonly: boolean;
  /** Interactive state for selection/hover highlights. */
  interaction: InteractionState | null;
  /** i18n translate function for labels. */
  t: (key: string) => string;
}

/** Result of a hit test on the canvas. */
export interface HitTestResult {
  /** Type of element hit. */
  type: 'cell' | 'text' | 'empty';
  /** Grid index of the cell (0-7), or -1 for empty. */
  cellIndex: number;
  /** Text id if a text overlay was hit, or null. */
  textId: string | null;
  /** Position within the cell (0-100 %) accounting for rotation. */
  cellX: number;
  /** Position within the cell (0-100 %) accounting for rotation. */
  cellY: number;
}

/** Cached cell geometry for hit testing and interaction. */
export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Font / text helpers (shared between display and export)
// ---------------------------------------------------------------------------

/** Map TextSize to font size in pixels at the given canvas resolution. */
function getTextFontSizePx(size: TextSize, cellH: number): number {
  // Scale text relative to cell height for resolution independence.
  // These ratios produce sizes equivalent to the old hardcoded DPI values
  // at 300 DPI (cellH ≈ 1220 px): sm≈24, md≈36, lg≈48, xl≈64.
  const ratio = {
    sm: 0.020,
    md: 0.030,
    lg: 0.040,
    xl: 0.053,
  };
  return Math.round(cellH * ratio[size]);
}

function getTextFillColor(color: TextColor): string {
  switch (color) {
    case 'white': return '#ffffff';
    case 'black': return '#18181b';
    case 'rose': return '#d946ef'; // fuchsia-500 to match UI swatch
  }
}

function getCanvasFontFamily(font: TextFont): string {
  switch (font) {
    case 'sans': return "'Special Elite', sans-serif";
    case 'serif': return "'Libre Baskerville', serif";
    case 'mono': return "'Courier Prime', monospace";
    case 'handwritten': return "'Caveat', cursive";
  }
}

/** Ensure a specific font family is loaded before drawing on the canvas. */
async function ensureFontLoaded(font: TextFont, size: number): Promise<void> {
  const family = getCanvasFontFamily(font);
  try {
    await document.fonts.load(`${size}px ${family}`);
  } catch {
    // Silently fall back -- the canvas will use the next available family
  }
}

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

/** Default crop transform (centered, no zoom). */
export function defaultCropTransform(): CropTransform {
  return { offsetX: 0, offsetY: 0, scale: 1 };
}

/**
 * Draw an image into a destination rect using "object-fit: cover" logic,
 * with optional crop transform (pan + zoom).
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  crop: CropTransform = defaultCropTransform(),
): void {
  const natW = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const natH = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const imgRatio = natW / natH;
  const cellRatio = dw / dh;

  // Base cover crop: determine source rect that fills the cell
  let sw: number, sh: number;
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

  ctx.drawImage(
    img as HTMLImageElement, // TS cast -- drawImage accepts both
    sx, sy, sw, sh,
    dx, dy, dw, dh,
  );
}

/**
 * Draw a single image into a grid cell, rotating 180° if needed.
 */
function drawCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number,
  rotated: boolean,
  crop: CropTransform = defaultCropTransform(),
): void {
  if (rotated) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI);
    drawImageCover(ctx, img, -w / 2, -h / 2, w, h, crop);
    ctx.restore();
  } else {
    drawImageCover(ctx, img, x, y, w, h, crop);
  }
}

/** Map TextSize to font weight (resolution-independent). */
function getTextFontWeight(size: TextSize): string {
  switch (size) {
    case 'sm': return 'normal';
    case 'md': return '600';
    case 'lg': return 'bold';
    case 'xl': return 'bold';
  }
}

/**
 * Draw a single text overlay on a cell in the canvas.
 */
function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  pageText: PageText,
  x: number,
  y: number,
  w: number,
  h: number,
  rotated: boolean,
  isSelected: boolean = false,
): void {
  if (!pageText.content) return;

  const fontSize = getTextFontSizePx(pageText.size, h);
  const padding = fontSize * 0.6;

  ctx.save();

  if (rotated) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }

  // Calculate text center position from percentages
  const textCenterX = x + (pageText.x / 100) * w;
  const textCenterY = y + (pageText.y / 100) * h;

  // Set font for text measurement
  const fontFamily = getCanvasFontFamily(pageText.font);
  const weight = getTextFontWeight(pageText.size);
  ctx.font = `${weight} ${fontSize}px ${fontFamily}`;

  const maxTextWidth = w - padding * 2;
  const metrics = ctx.measureText(pageText.content);
  const textWidth = Math.min(metrics.width, maxTextWidth);
  const barHeight = fontSize + padding * 2;

  // Draw pill background (only if showBg is true)
  if (pageText.showBg) {
    const isLightText = pageText.color !== 'black';
    const bgWidth = textWidth + padding * 2;
    const bgX = textCenterX - bgWidth / 2;
    const bgY = textCenterY - barHeight / 2;

    ctx.fillStyle = isLightText ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(bgX, bgY, bgWidth, barHeight);
  }

  // Add text shadow
  const isLightText = pageText.color !== 'black';
  ctx.shadowColor = isLightText ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.6)';
  ctx.shadowBlur = Math.max(2, fontSize * 0.1);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(1, fontSize * 0.03);

  // Draw text
  ctx.fillStyle = getTextFillColor(pageText.color);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(pageText.content, textCenterX, textCenterY, maxTextWidth);

  // Reset shadow before drawing selection indicator
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Selected text indicator (dashed border around text)
  if (isSelected) {
    const selW = textWidth + padding * 2;
    const selH = barHeight;
    const selX = textCenterX - selW / 2;
    const selY = textCenterY - selH / 2;

    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = Math.max(1, fontSize * 0.06);
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(selX, selY, selW, selH);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/**
 * Draw fold guide overlays on the canvas.
 */
function drawFoldGuides(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  gapPx: number,
): void {
  const lineWidth = Math.max(1, canvasW * 0.0006);

  // Calculate actual cell dimensions to find the row boundary
  const totalGapY = gapPx * (ROWS - 1);
  const cellH = (canvasH - totalGapY) / ROWS;

  ctx.save();

  // --- Fold lines (dashed, white/semi-transparent) ---
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([canvasW * 0.005, canvasW * 0.005]);

  // Horizontal center fold (between the two rows, accounting for gap)
  const yCenter = cellH + gapPx / 2;
  ctx.beginPath();
  ctx.moveTo(0, yCenter);
  ctx.lineTo(canvasW, yCenter);
  ctx.stroke();

  // Vertical fold lines at 1/4, 1/2, 3/4
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  for (const fraction of [0.25, 0.5, 0.75]) {
    const xFold = canvasW * fraction;
    ctx.beginPath();
    ctx.moveTo(xFold, 0);
    ctx.lineTo(xFold, canvasH);
    ctx.stroke();
  }

  // --- Cut line (solid red, horizontal center, middle half) ---
  ctx.strokeStyle = 'rgba(220, 80, 80, 0.9)';
  ctx.lineWidth = lineWidth * 1.5;
  ctx.setLineDash([]);

  const cutX1 = canvasW * 0.25;
  const cutX2 = canvasW * 0.75;
  ctx.beginPath();
  ctx.moveTo(cutX1, yCenter);
  ctx.lineTo(cutX2, yCenter);
  ctx.stroke();

  // Scissors "X" at the start of the cut line
  ctx.lineWidth = lineWidth;
  const sSize = canvasW * 0.005;
  ctx.beginPath();
  ctx.moveTo(cutX1 - sSize, yCenter - sSize);
  ctx.lineTo(cutX1 + sSize, yCenter + sSize);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cutX1 - sSize, yCenter + sSize);
  ctx.lineTo(cutX1 + sSize, yCenter - sSize);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw page label badges on each cell.
 */
function drawPageLabels(
  ctx: CanvasRenderingContext2D,
  layout: PageSlot[],
  cells: CellRect[],
  t: (key: string) => string,
): void {
  const sampleCell = cells[0];
  if (!sampleCell) return;

  const fontSize = Math.max(8, sampleCell.h * 0.045);

  ctx.save();
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < layout.length && i < cells.length; i++) {
    const slot = layout[i]!;
    const cell = cells[i]!;
    const label = t(slot.labelKey);

    // Measure label for background pill
    const metrics = ctx.measureText(label);
    const padX = fontSize * 0.6;
    const padY = fontSize * 0.4;
    const bgW = metrics.width + padX * 2;
    const bgH = fontSize + padY * 2;
    const cx = cell.x + cell.w / 2;
    const cy = cell.y + cell.h / 2;

    // Background pill
    if (slot.rotated) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.85)'; // amber-500
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    }
    ctx.fillRect(cx - bgW / 2, cy - bgH / 2, bgW, bgH);

    // Label text
    ctx.fillStyle = slot.rotated ? '#ffffff' : '#18181b';
    ctx.fillText(label, cx, cy);

    // Rotation indicator for top-row cells
    if (slot.rotated) {
      const smallFont = Math.max(6, fontSize * 0.65);
      ctx.font = `400 ${smallFont}px sans-serif`;
      ctx.fillStyle = 'rgba(252, 211, 77, 0.9)'; // amber-300
      ctx.fillText('↻ 180°', cx, cy + bgH / 2 + smallFont);
      ctx.font = `600 ${fontSize}px sans-serif`;
    }
  }

  ctx.restore();
}

/**
 * Draw interaction overlays (selection, hover, number badges).
 */
function drawInteractionOverlays(
  ctx: CanvasRenderingContext2D,
  cells: CellRect[],
  interaction: InteractionState,
  t: (key: string) => string,
): void {
  ctx.save();

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;

    if (interaction.mode === 'reorder') {
      // Selected cell highlight
      if (interaction.selectedIndex === i) {
        ctx.strokeStyle = '#e11d48'; // rose-600 (primary)
        ctx.lineWidth = Math.max(2, cell.w * 0.008);
        ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);

        // "Swap" badge
        const badge = t('grid.swap');
        ctx.fillStyle = 'rgba(225, 29, 72, 0.2)'; // primary/20
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
        drawBadge(ctx, badge, cell, '#e11d48', '#ffffff');
      }

      // Hover target highlight (when a cell is selected and hovering another)
      if (interaction.hoverIndex === i && interaction.selectedIndex !== null && interaction.selectedIndex !== i) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
        drawBadge(ctx, t('grid.placeHere'), cell, '#52525b', '#ffffff');
      }

      // Number overlay at bottom (when not selected and no labels shown)
      if (interaction.selectedIndex !== i) {
        drawCellNumber(ctx, i, cell);
      }
    }

    if (interaction.mode === 'text') {
      // Editing cell highlight
      if (interaction.editingIndex === i) {
        ctx.strokeStyle = '#3b82f6'; // blue-500
        ctx.lineWidth = Math.max(2, cell.w * 0.008);
        ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // blue-500/15
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
      }
    }
  }

  ctx.restore();
}

/** Draw a centered badge with text inside a cell. */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  cell: CellRect,
  bgColor: string,
  textColor: string,
): void {
  const fontSize = Math.max(10, cell.h * 0.06);
  ctx.save();
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(text);
  const padX = fontSize * 0.8;
  const padY = fontSize * 0.5;
  const badgeW = metrics.width + padX * 2;
  const badgeH = fontSize + padY * 2;
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = bgColor;
  ctx.fillRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH);

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = textColor;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/** Draw the cell number at the bottom with a gradient fade. */
function drawCellNumber(
  ctx: CanvasRenderingContext2D,
  index: number,
  cell: CellRect,
): void {
  const gradH = cell.h * 0.15;
  const gradY = cell.y + cell.h - gradH;

  ctx.save();

  // Gradient from transparent to black
  const grad = ctx.createLinearGradient(0, gradY, 0, cell.y + cell.h);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(cell.x, gradY, cell.w, gradH);

  // Number text
  const fontSize = Math.max(8, cell.h * 0.04);
  ctx.font = `500 ${fontSize}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(String(index + 1), cell.x + cell.w / 2, cell.y + cell.h - fontSize * 0.3);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Grid geometry calculation
// ---------------------------------------------------------------------------

/** Calculate cell rects for the given canvas size and gap. */
export function calcCellRects(
  canvasW: number,
  canvasH: number,
  gap: number,
  refWidth: number = PREVIEW_REF_WIDTH,
): CellRect[] {
  const gapPx = Math.round((gap / refWidth) * canvasW);
  const totalGapX = gapPx * (COLS - 1);
  const totalGapY = gapPx * (ROWS - 1);
  const cellW = (canvasW - totalGapX) / COLS;
  const cellH = (canvasH - totalGapY) / ROWS;

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
// Hit testing
// ---------------------------------------------------------------------------

/**
 * Determine what element is at the given canvas-space coordinates.
 */
export function hitTest(
  canvasX: number,
  canvasY: number,
  cells: CellRect[],
  layout: PageSlot[],
  pageTexts: PageText[][],
  ctx: CanvasRenderingContext2D,
): HitTestResult {
  // Save context state to avoid mutating font/style during hit testing
  ctx.save();

  // Check texts first (they're on top)
  for (let i = cells.length - 1; i >= 0; i--) {
    const cell = cells[i]!;
    const slot = layout[i];
    const texts = pageTexts[i] ?? [];
    const rotated = slot?.rotated ?? false;

    for (let j = texts.length - 1; j >= 0; j--) {
      const text = texts[j]!;
      if (!text.content) continue;

      const fontSize = getTextFontSizePx(text.size, cell.h);
      const padding = fontSize * 0.6;
      const fontFamily = getCanvasFontFamily(text.font);
      const weight = getTextFontWeight(text.size);
      ctx.font = `${weight} ${fontSize}px ${fontFamily}`;

      const metrics = ctx.measureText(text.content);
      const maxTextWidth = cell.w - padding * 2;
      const textWidth = Math.min(metrics.width, maxTextWidth);
      const barHeight = fontSize + padding * 2;
      const barWidth = textWidth + padding * 2;

      // Text center in canvas space
      let textCX = cell.x + (text.x / 100) * cell.w;
      let textCY = cell.y + (text.y / 100) * cell.h;

      // For rotated cells, the text position is rotated 180° around the cell center
      if (rotated) {
        textCX = cell.x + cell.w - (textCX - cell.x);
        textCY = cell.y + cell.h - (textCY - cell.y);
      }

      const hitX = textCX - barWidth / 2;
      const hitY = textCY - barHeight / 2;

      if (
        canvasX >= hitX && canvasX <= hitX + barWidth
        && canvasY >= hitY && canvasY <= hitY + barHeight
      ) {
        const relX = ((canvasX - cell.x) / cell.w) * 100;
        const relY = ((canvasY - cell.y) / cell.h) * 100;
        ctx.restore();
        return {
          type: 'text',
          cellIndex: i,
          textId: text.id,
          cellX: rotated ? 100 - relX : relX,
          cellY: rotated ? 100 - relY : relY,
        };
      }
    }
  }

  // Check cells
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    if (
      canvasX >= cell.x && canvasX <= cell.x + cell.w
      && canvasY >= cell.y && canvasY <= cell.y + cell.h
    ) {
      const rotated = layout[i]?.rotated ?? false;
      const relX = ((canvasX - cell.x) / cell.w) * 100;
      const relY = ((canvasY - cell.y) / cell.h) * 100;
      ctx.restore();
      return {
        type: 'cell',
        cellIndex: i,
        textId: null,
        cellX: rotated ? 100 - relX : relX,
        cellY: rotated ? 100 - relY : relY,
      };
    }
  }

  ctx.restore();
  return { type: 'empty', cellIndex: -1, textId: null, cellX: 0, cellY: 0 };
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

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

/**
 * Render the complete fanzine grid to a canvas context.
 *
 * This is the single source of truth for rendering -- used by both the
 * on-screen <canvas> display and the offscreen canvas for PDF export.
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  options: RenderOptions,
): CellRect[] {
  const { photos, images, layout, gap, pageTexts, cropTransforms, showGuides, showLabels, interaction, t } = options;

  // Clear and fill background
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Calculate cell geometry
  const cells = calcCellRects(canvasW, canvasH, gap);

  // Draw each photo into its cell
  for (let i = 0; i < images.length && i < cells.length; i++) {
    const cell = cells[i]!;
    const slot = layout[i];
    const rotated = slot?.rotated ?? false;
    const crop = cropTransforms[i] ?? defaultCropTransform();

    drawCell(ctx, images[i]!, cell.x, cell.y, cell.w, cell.h, rotated, crop);
  }

  // Draw text overlays
  for (let i = 0; i < pageTexts.length && i < cells.length; i++) {
    const cell = cells[i]!;
    const slot = layout[i];
    const rotated = slot?.rotated ?? false;
    const texts = pageTexts[i] ?? [];

    for (const text of texts) {
      const isSelected = interaction?.selectedTextId === text.id;
      drawTextOverlay(ctx, text, cell.x, cell.y, cell.w, cell.h, rotated, isSelected);
    }
  }

  // Draw fold guides
  if (showGuides) {
    const gapPx = Math.round((gap / PREVIEW_REF_WIDTH) * canvasW);
    drawFoldGuides(ctx, canvasW, canvasH, gapPx);
  }

  // Draw page labels
  if (showLabels) {
    drawPageLabels(ctx, layout, cells, t);
  }

  // Draw interaction overlays (selection, hover, numbers)
  if (interaction && !options.readonly) {
    drawInteractionOverlays(ctx, cells, interaction, t);
  }

  return cells;
}
