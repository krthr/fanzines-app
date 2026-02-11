import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { Layer as KonvaLayer } from 'konva/lib/Layer';

// A4 landscape at 300 DPI
const DPI = 300;
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;
const A4_WIDTH_PX = Math.round((A4_WIDTH_MM / 25.4) * DPI); // 3508

const COLS = 4;
const ROWS = 2;

/** Guide line styling constants (in mm) */
const GUIDE_LINE_WIDTH = 0.3;
const CUT_LINE_WIDTH = 0.4;
const CROP_MARK_LENGTH = 5;
const CROP_MARK_OFFSET = 2;
const LABEL_FONT_SIZE = 6;

// ---------------------------------------------------------------------------
// PDF Guide Helpers (ported from useExportPdf.ts, all coordinates in mm)
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

function cropMarkLines(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): [number, number, number, number][] {
  const offset = CROP_MARK_OFFSET;
  const len = CROP_MARK_LENGTH;
  return [
    [cx + offset * dx, cy, cx + (offset + len) * dx, cy],
    [cx, cy + offset * dy, cx, cy + (offset + len) * dy],
  ];
}

function drawPrintGuides(pdf: JsPdfLike, gap: number): void {
  const gapMm = (gap / 900) * A4_WIDTH_MM;
  const cellW = (A4_WIDTH_MM - gapMm * (COLS - 1)) / COLS;
  const cellH = (A4_HEIGHT_MM - gapMm * (ROWS - 1)) / ROWS;

  // --- Fold lines (dashed, light gray) ---
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(GUIDE_LINE_WIDTH);
  pdf.setLineDashPattern([2, 2], 0);

  const yCenter = cellH + gapMm / 2;
  pdf.line(0, yCenter, A4_WIDTH_MM, yCenter);

  for (const fraction of [0.25, 0.5, 0.75]) {
    const xFold = A4_WIDTH_MM * fraction;
    pdf.line(xFold, 0, xFold, A4_HEIGHT_MM);
  }

  // --- Cut line (solid red, center horizontal, middle half only) ---
  pdf.setDrawColor(220, 80, 80);
  pdf.setLineWidth(CUT_LINE_WIDTH);
  pdf.setLineDashPattern([], 0);

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
    ...cropMarkLines(0, 0, 1, 1),
    ...cropMarkLines(A4_WIDTH_MM, 0, -1, 1),
    ...cropMarkLines(0, A4_HEIGHT_MM, 1, -1),
    ...cropMarkLines(A4_WIDTH_MM, A4_HEIGHT_MM, -1, -1),
  ];

  for (const [x1, y1, x2, y2] of corners) {
    pdf.line(x1, y1, x2, y2);
  }

  // --- Page labels (tiny text near each cell) ---
  pdf.setFontSize(LABEL_FONT_SIZE);
  pdf.setTextColor(160, 160, 160);

  const { LAYOUT } = useFanzineLayout();

  for (const slot of LAYOUT) {
    const cx = slot.col * (cellW + gapMm) + cellW / 2;
    const cy = slot.row * (cellH + gapMm);
    const labelY = cy + 3;
    const label = slot.role === 'frontCover' ? 'FRONT'
      : slot.role === 'backCover' ? 'BACK'
        : slot.role.replace('page', 'P');

    pdf.text(label, cx, labelY, { align: 'center' });

    if (slot.rotated) {
      pdf.setFontSize(5);
      pdf.text('(180\u00B0)', cx, labelY + 3, { align: 'center' });
      pdf.setFontSize(LABEL_FONT_SIZE);
    }
  }
}

// ---------------------------------------------------------------------------
// Export Composable
// ---------------------------------------------------------------------------

export function useCanvasExport() {
  const isExporting = ref(false);

  /**
   * Export the Konva stage as a high-resolution A4 landscape PDF.
   *
   * Before calling, the caller should hide non-print elements (labels, selection,
   * cell numbers, etc.) from the stage. Guide lines can remain if desired.
   */
  async function exportToPdf(
    stageNode: KonvaStage,
    gap: number,
    options: { showGuides?: boolean; filename?: string } = {},
  ): Promise<void> {
    const { showGuides = true, filename = 'fanzine.pdf' } = options;

    isExporting.value = true;

    try {
      // Ensure all fonts are loaded before rendering
      await document.fonts.ready;

      // Calculate pixelRatio to achieve 300 DPI output
      const pixelRatio = A4_WIDTH_PX / stageNode.width();

      // Export the stage as a high-resolution JPEG
      const dataURL = stageNode.toDataURL({
        pixelRatio,
        mimeType: 'image/jpeg',
        quality: 0.95,
      });

      // Generate PDF with jsPDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Add the raster image as a full-page background
      pdf.addImage(dataURL, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

      // Draw vector print guides on top
      if (showGuides) {
        drawPrintGuides(pdf, gap);
      }

      pdf.save(filename);
    } finally {
      isExporting.value = false;
    }
  }

  return {
    exportToPdf,
    isExporting,
  };
}
