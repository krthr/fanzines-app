import Konva from 'konva';
import type { PhotoItem } from '~/composables/usePhotoStore';
import type { PageText } from '~/composables/usePhotoStore';
import type { PageSlot } from '~/composables/useFanzineLayout';
import type { CropTransform } from '~/composables/useKonvaStage';
import {
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  calcCellRects,
  computeImageCoverConfig,
  defaultCropTransform,
  loadAllImages,
  preloadFonts,
  getTextFontSizePx,
  getTextFillColor,
  getKonvaFontFamily,
  getTextFontStyle,
} from '~/composables/useKonvaStage';

// A4 landscape dimensions in mm (for jsPDF)
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;

const COLS = 4;
const ROWS = 2;

/** Guide line styling constants (in mm) */
const GUIDE_LINE_WIDTH = 0.3;
const CUT_LINE_WIDTH = 0.4;
const CROP_MARK_LENGTH = 5;
const CROP_MARK_OFFSET = 2;
const LABEL_FONT_SIZE = 6;

export function useExportPdf() {
  const isExporting = ref(false);
  const { LAYOUT } = useFanzineLayout();

  async function exportToPdf(
    photos: PhotoItem[],
    gap: number,
    options: {
      showGuides?: boolean;
      filename?: string;
      pageTexts?: PageText[][];
      cropTransforms?: CropTransform[];
    } = {},
  ): Promise<void> {
    const { showGuides = true, filename = 'fanzine.pdf', pageTexts, cropTransforms } = options;
    if (photos.length === 0) return;

    isExporting.value = true;

    try {
      // Load all images in parallel
      const images = await loadAllImages(photos);

      // Pre-load fonts for text overlays
      if (pageTexts && pageTexts.flat().some(pt => pt.content)) {
        const tempCells = calcCellRects(A4_WIDTH_PX, A4_HEIGHT_PX, gap);
        const sampleH = tempCells[0]?.h ?? 1200;
        await preloadFonts(pageTexts, sampleH);
      }

      // Build crop transforms
      const crops: CropTransform[] = [];
      for (let i = 0; i < 8; i++) {
        crops.push(cropTransforms?.[i] ?? defaultCropTransform());
      }

      // Create an offscreen Konva stage at print resolution
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      const stage = new Konva.Stage({
        container,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
      });

      const layer = new Konva.Layer();
      stage.add(layer);

      // Background
      layer.add(new Konva.Rect({
        x: 0,
        y: 0,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        fill: '#000000',
      }));

      // Calculate cell geometry
      const cells = calcCellRects(A4_WIDTH_PX, A4_HEIGHT_PX, gap);

      // Draw each photo into its cell
      for (let i = 0; i < images.length && i < cells.length; i++) {
        const cell = cells[i]!;
        const slot = LAYOUT[i];
        const rotated = slot?.rotated ?? false;
        const crop = crops[i] ?? defaultCropTransform();
        const img = images[i]!;

        const coverConfig = computeImageCoverConfig(img, cell.w, cell.h, crop);

        const group = new Konva.Group({
          clipX: cell.x,
          clipY: cell.y,
          clipWidth: cell.w,
          clipHeight: cell.h,
        });

        if (rotated) {
          group.rotation(180);
          group.offsetX(cell.x + cell.w / 2);
          group.offsetY(cell.y + cell.h / 2);
          group.x(cell.x + cell.w / 2);
          group.y(cell.y + cell.h / 2);
        }

        group.add(new Konva.Image({
          image: img,
          x: cell.x,
          y: cell.y,
          width: coverConfig.width,
          height: coverConfig.height,
          crop: {
            x: coverConfig.cropX,
            y: coverConfig.cropY,
            width: coverConfig.cropWidth,
            height: coverConfig.cropHeight,
          },
        }));

        // Draw text overlays for this cell
        const cellTexts = pageTexts?.[i] ?? [];
        for (const txt of cellTexts) {
          if (!txt.content) continue;

          const fontSize = getTextFontSizePx(txt.size, cell.h);
          const padding = fontSize * 0.6;
          const maxTextWidth = cell.w - padding * 2;
          const textCenterX = cell.x + (txt.x / 100) * cell.w;
          const textCenterY = cell.y + (txt.y / 100) * cell.h;
          const isLightText = txt.color !== 'black';

          // Background pill
          if (txt.showBg) {
            const barHeight = fontSize + padding * 2;
            const bgWidth = maxTextWidth + padding * 2;
            group.add(new Konva.Rect({
              x: textCenterX - bgWidth / 2,
              y: textCenterY - barHeight / 2,
              width: bgWidth,
              height: barHeight,
              fill: isLightText ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.55)',
            }));
          }

          // Text node
          group.add(new Konva.Text({
            x: textCenterX,
            y: textCenterY,
            offsetX: maxTextWidth / 2,
            offsetY: fontSize / 2,
            text: txt.content,
            fontSize,
            fontFamily: getKonvaFontFamily(txt.font),
            fontStyle: getTextFontStyle(txt.size),
            fill: getTextFillColor(txt.color),
            width: maxTextWidth,
            align: 'center',
            verticalAlign: 'middle',
            shadowColor: isLightText ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.6)',
            shadowBlur: Math.max(2, fontSize * 0.1),
            shadowOffsetX: 0,
            shadowOffsetY: Math.max(1, fontSize * 0.03),
            shadowEnabled: true,
          }));
        }

        layer.add(group);
      }

      layer.draw();

      // Export the Konva stage as a data URL
      const imgData = stage.toDataURL({
        mimeType: 'image/jpeg',
        quality: 0.95,
      });

      // Clean up the offscreen stage
      stage.destroy();
      document.body.removeChild(container);

      // Generate PDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Add the photo grid as a full-page image
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

      // Draw print guides on top of the image (vector, crisp at any zoom)
      if (showGuides) {
        drawPrintGuides(pdf, gap, LAYOUT);
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

function drawPrintGuides(pdf: JsPdfLike, gap: number, layoutSlots: PageSlot[]): void {
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

  for (const slot of layoutSlots) {
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
