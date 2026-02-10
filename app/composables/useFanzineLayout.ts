import type { PhotoItem } from '~/composables/usePhotoStore';
import type { PageText } from '~/composables/usePhotoStore';

/**
 * 8-page fanzine fold layout mapping.
 *
 * The printed A4 landscape sheet has a 4 x 2 grid.
 * When folded and cut according to the standard one-sheet zine method,
 * the grid positions map to booklet pages as follows:
 *
 *  ┌──────────┬──────────┬──────────┬──────────┐
 *  │  Page 6  │  Page 5  │  Page 4  │  Page 3  │  ← TOP ROW (printed upside-down)
 *  │  (180°)  │  (180°)  │  (180°)  │  (180°)  │
 *  ├──────────┼──────────┼──────────┼──────────┤
 *  │   Back   │  Front   │  Page 1  │  Page 2  │  ← BOTTOM ROW (right-side up)
 *  │  Cover   │  Cover   │          │          │
 *  └──────────┴──────────┴──────────┴──────────┘
 *
 * The cut goes along the horizontal center between columns 1-2 and 2-3
 * (i.e., the middle half of the horizontal center line).
 */

export type PageRole =
  | 'frontCover'
  | 'backCover'
  | 'page1'
  | 'page2'
  | 'page3'
  | 'page4'
  | 'page5'
  | 'page6';

export interface PageSlot {
  /** Grid index (0-7, left-to-right then top-to-bottom) */
  gridIndex: number;
  /** Row in the 4x2 grid (0 = top, 1 = bottom) */
  row: number;
  /** Column in the 4x2 grid (0-3) */
  col: number;
  /** Logical page role */
  role: PageRole;
  /** Human-readable label key for i18n */
  labelKey: string;
  /** Whether the image should be rotated 180° on the printed sheet */
  rotated: boolean;
  /** Reading order position (0 = front cover, 7 = back cover) */
  readingOrder: number;
}

/**
 * The canonical layout map. Index = grid position (0-7).
 *
 * Grid positions are numbered left-to-right, top-to-bottom:
 *   0  1  2  3
 *   4  5  6  7
 */
const LAYOUT: PageSlot[] = [
  // Top row — all rotated 180°
  { gridIndex: 0, row: 0, col: 0, role: 'page6',      labelKey: 'layout.page6',      rotated: true,  readingOrder: 6 },
  { gridIndex: 1, row: 0, col: 1, role: 'page5',      labelKey: 'layout.page5',      rotated: true,  readingOrder: 5 },
  { gridIndex: 2, row: 0, col: 2, role: 'page4',      labelKey: 'layout.page4',      rotated: true,  readingOrder: 4 },
  { gridIndex: 3, row: 0, col: 3, role: 'page3',      labelKey: 'layout.page3',      rotated: true,  readingOrder: 3 },
  // Bottom row — right-side up
  { gridIndex: 4, row: 1, col: 0, role: 'backCover',  labelKey: 'layout.backCover',  rotated: false, readingOrder: 7 },
  { gridIndex: 5, row: 1, col: 1, role: 'frontCover', labelKey: 'layout.frontCover', rotated: false, readingOrder: 0 },
  { gridIndex: 6, row: 1, col: 2, role: 'page1',      labelKey: 'layout.page1',      rotated: false, readingOrder: 1 },
  { gridIndex: 7, row: 1, col: 3, role: 'page2',      labelKey: 'layout.page2',      rotated: false, readingOrder: 2 },
];

export function useFanzineLayout() {
  /**
   * Get the full layout definition for a given grid index.
   */
  function getSlot(gridIndex: number): PageSlot | undefined {
    return LAYOUT[gridIndex];
  }

  /**
   * Get the i18n label key for a grid position.
   */
  function getPageLabelKey(gridIndex: number): string {
    return LAYOUT[gridIndex]?.labelKey ?? '';
  }

  /**
   * Check whether a grid position should be rotated 180° on the printed sheet.
   */
  function isRotated(gridIndex: number): boolean {
    return LAYOUT[gridIndex]?.rotated ?? false;
  }

  /**
   * Return photos reordered into booklet reading order
   * (front cover, page 1, page 2, ..., page 6, back cover).
   *
   * Input: photos array where index = grid position.
   * Output: photos array where index = reading order position.
   */
  function getReadingOrder(photos: PhotoItem[]): PhotoItem[] {
    const sorted = [...LAYOUT].sort((a, b) => a.readingOrder - b.readingOrder);
    return sorted
      .map(slot => photos[slot.gridIndex])
      .filter((p): p is PhotoItem => p !== undefined);
  }

  /**
   * Return page texts reordered into booklet reading order.
   *
   * Input: pageTexts array where index = grid position.
   * Output: pageTexts array where index = reading order position.
   */
  function getReadingOrderTexts(pageTexts: PageText[]): PageText[] {
    const sorted = [...LAYOUT].sort((a, b) => a.readingOrder - b.readingOrder);
    return sorted
      .map(slot => pageTexts[slot.gridIndex])
      .filter((t): t is PageText => t !== undefined);
  }

  /**
   * Return the reading-order spreads for the booklet preview.
   * Each spread is a pair of pages shown side by side.
   *
   * Spread 0: Front Cover | Page 1
   * Spread 1: Page 2      | Page 3
   * Spread 2: Page 4      | Page 5
   * Spread 3: Page 6      | Back Cover
   */
  function getSpreads(photos: PhotoItem[]): [PhotoItem | undefined, PhotoItem | undefined][] {
    const ordered = getReadingOrder(photos);
    const spreads: [PhotoItem | undefined, PhotoItem | undefined][] = [];
    for (let i = 0; i < ordered.length; i += 2) {
      spreads.push([ordered[i], ordered[i + 1]]);
    }
    return spreads;
  }

  /**
   * Get label keys for each spread (for display purposes).
   */
  function getSpreadLabels(): [string, string][] {
    const sortedSlots = [...LAYOUT].sort((a, b) => a.readingOrder - b.readingOrder);
    const labels: [string, string][] = [];
    for (let i = 0; i < sortedSlots.length; i += 2) {
      labels.push([
        sortedSlots[i]!.labelKey,
        sortedSlots[i + 1]!.labelKey,
      ]);
    }
    return labels;
  }

  return {
    LAYOUT,
    getSlot,
    getPageLabelKey,
    isRotated,
    getReadingOrder,
    getReadingOrderTexts,
    getSpreads,
    getSpreadLabels,
  };
}
