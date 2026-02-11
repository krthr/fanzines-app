import type { PageRole } from '~/composables/useFanzineLayout';
import type { TextSize, TextFont, TextColor } from '~/composables/usePhotoStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CellRect {
  gridIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isRotated: boolean;
  role: PageRole;
  labelKey: string;
}

export interface GuideLine {
  points: number[]; // [x1, y1, x2, y2]
}

export interface GridGuides {
  foldLines: GuideLine[];
  cutLine: GuideLine;
  scissorsPos: { x: number; y: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLS = 4;
const ROWS = 2;
const A4_RATIO = 297 / 210; // landscape width / height

// Font size as fraction of cell height (matches the original CSS sizes at ~900px stage width)
const TEXT_SIZE_RATIO: Record<TextSize, number> = {
  sm: 0.065,
  md: 0.085,
  lg: 0.11,
  xl: 0.14,
};

const FONT_FAMILY_MAP: Record<TextFont, string> = {
  sans: "'Special Elite', sans-serif",
  serif: "'Libre Baskerville', serif",
  mono: "'Courier Prime', monospace",
  handwritten: "'Caveat', cursive",
};

const TEXT_COLOR_MAP: Record<TextColor, string> = {
  white: '#ffffff',
  black: '#18181b',
  rose: '#d946ef',
};

// Print constants (for export)
const DPI = 300;
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;
const A4_WIDTH_PX = Math.round((A4_WIDTH_MM / 25.4) * DPI); // 3508
const A4_HEIGHT_PX = Math.round((A4_HEIGHT_MM / 25.4) * DPI); // 2480

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useKonvaGrid() {
  const { LAYOUT } = useFanzineLayout();

  /**
   * Compute cell rectangles for a given stage size and gap.
   * Gap is in CSS pixels (0-16) relative to a ~900px-wide preview.
   * It is proportionally scaled to the actual stage width.
   */
  function computeCells(stageWidth: number, stageHeight: number, gap: number): CellRect[] {
    const scaledGap = (gap / 900) * stageWidth;
    const totalGapX = scaledGap * (COLS - 1);
    const totalGapY = scaledGap * (ROWS - 1);
    const cellW = (stageWidth - totalGapX) / COLS;
    const cellH = (stageHeight - totalGapY) / ROWS;

    return LAYOUT.map((slot) => ({
      gridIndex: slot.gridIndex,
      x: slot.col * (cellW + scaledGap),
      y: slot.row * (cellH + scaledGap),
      width: cellW,
      height: cellH,
      isRotated: slot.rotated,
      role: slot.role,
      labelKey: slot.labelKey,
    }));
  }

  /**
   * Compute fold/cut guide line coordinates for the given stage size and gap.
   */
  function computeGuides(stageWidth: number, stageHeight: number, gap: number): GridGuides {
    const scaledGap = (gap / 900) * stageWidth;
    const cellH = (stageHeight - scaledGap * (ROWS - 1)) / ROWS;
    const yCenter = cellH + scaledGap / 2;

    const foldLines: GuideLine[] = [
      // Horizontal center fold
      { points: [0, yCenter, stageWidth, yCenter] },
      // Vertical fold lines at 1/4, 1/2, 3/4
      { points: [stageWidth * 0.25, 0, stageWidth * 0.25, stageHeight] },
      { points: [stageWidth * 0.5, 0, stageWidth * 0.5, stageHeight] },
      { points: [stageWidth * 0.75, 0, stageWidth * 0.75, stageHeight] },
    ];

    const cutX1 = stageWidth * 0.25;
    const cutX2 = stageWidth * 0.75;
    const cutLine: GuideLine = { points: [cutX1, yCenter, cutX2, yCenter] };

    const scissorsPos = { x: cutX1, y: yCenter };

    return { foldLines, cutLine, scissorsPos };
  }

  /**
   * Compute the crop rectangle for "object-fit: cover" behavior.
   * Returns the source rect { x, y, width, height } to use as Konva Image `crop`.
   */
  function getCoverCrop(
    imgW: number,
    imgH: number,
    boxW: number,
    boxH: number,
  ): { x: number; y: number; width: number; height: number } {
    const imgRatio = imgW / imgH;
    const boxRatio = boxW / boxH;

    if (imgRatio > boxRatio) {
      // Image is wider -- crop horizontally
      const cropW = imgH * boxRatio;
      return { x: (imgW - cropW) / 2, y: 0, width: cropW, height: imgH };
    }
    // Image is taller -- crop vertically
    const cropH = imgW / boxRatio;
    return { x: 0, y: (imgH - cropH) / 2, width: imgW, height: cropH };
  }

  /**
   * Get the font size in pixels for a given text size at a given cell height.
   */
  function getTextFontSize(size: TextSize, cellHeight: number): number {
    return Math.round(cellHeight * TEXT_SIZE_RATIO[size]);
  }

  /**
   * Get the Konva-compatible font family string for a text font.
   */
  function getFontFamily(font: TextFont): string {
    return FONT_FAMILY_MAP[font];
  }

  /**
   * Get the fill color string for a text color.
   */
  function getTextFillColor(color: TextColor): string {
    return TEXT_COLOR_MAP[color];
  }

  /**
   * Convert a text percentage position (0-100) to pixel position within a cell.
   */
  function percentToPixel(
    percent: number,
    cellSize: number,
  ): number {
    return (percent / 100) * cellSize;
  }

  /**
   * Convert a pixel position within a cell to percentage (0-100).
   */
  function pixelToPercent(
    pixel: number,
    cellSize: number,
  ): number {
    return Math.max(5, Math.min(95, (pixel / cellSize) * 100));
  }

  /**
   * Compute the stage width for a given container width, maintaining A4 aspect ratio.
   */
  function computeStageDimensions(containerWidth: number): { width: number; height: number } {
    const width = Math.floor(containerWidth);
    const height = Math.floor(width / A4_RATIO);
    return { width, height };
  }

  return {
    computeCells,
    computeGuides,
    getCoverCrop,
    getTextFontSize,
    getFontFamily,
    getTextFillColor,
    percentToPixel,
    pixelToPercent,
    computeStageDimensions,
    // Re-export constants for use in export pipeline
    COLS,
    ROWS,
    A4_RATIO,
    A4_WIDTH_PX,
    A4_HEIGHT_PX,
    A4_WIDTH_MM,
    A4_HEIGHT_MM,
    TEXT_SIZE_RATIO,
    FONT_FAMILY_MAP,
    TEXT_COLOR_MAP,
  };
}
