# Plan: 8-Page Fanzine Creation Experience Improvements

## Summary

Improve the fanzine app with 6 features that teach users the fold/cut process and ensure the PDF output is physically correct for the one-sheet zine folding method.

## Background

The one-sheet 8-page fanzine fold creates a booklet from a single A4 landscape sheet. The physical grid layout is:

```
┌──────────┬──────────┬──────────┬──────────┐
│  Page 6  │  Page 5  │  Page 4  │  Page 3  │  ← TOP ROW (printed upside-down / rotated 180°)
├──────────┼──────────┼──────────┼──────────┤
│   Back   │  Front   │  Page 1  │  Page 2  │  ← BOTTOM ROW (right-side up)
│  Cover   │  Cover   │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

The cut goes horizontally along the center between columns 1-2 and 2-3 (middle half only).

## Implementation Plan (Feature by Feature)

### Feature 1: `useFanzineLayout.ts` composable
**New file: `app/composables/useFanzineLayout.ts`**

Central mapping between logical pages and physical grid positions:
- `PageSlot` interface with: gridIndex, row, col, role, labelKey, rotated, readingOrder
- `LAYOUT` constant array mapping all 8 grid positions
- Helper functions:
  - `getSlot(gridIndex)` — full slot definition
  - `getPageLabelKey(gridIndex)` — i18n label key
  - `isRotated(gridIndex)` — whether 180° rotation needed
  - `getReadingOrder(photos)` — photos sorted in booklet reading order
  - `getSpreads(photos)` — photos grouped into 4 two-page spreads
  - `getSpreadLabels()` — label key pairs for each spread

### Feature 2: Update `FanzineGrid.vue` — Page labels + fold guide overlay
**Modify: `app/components/FanzineGrid.vue`**

- New props: `showLabels: boolean`, `showGuides: boolean`
- Page label overlay on each cell using `useFanzineLayout().getPageLabelKey()`
- Fold guide overlay (togglable) showing:
  - Dashed fold lines (horizontal center, vertical at 1/4 and 3/4 width)
  - Scissors icon + solid line for the cut line (center horizontal, middle half)
  - Rotation indicator (↻ icon) on top-row cells
- Overlays are semi-transparent, positioned absolute over the grid

### Feature 3: Update `useExportPdf.ts` — Correct rotation + print guides
**Modify: `app/composables/useExportPdf.ts`**

- Use `useFanzineLayout().isRotated()` to rotate top-row images 180° via canvas transforms (`ctx.save/translate/rotate/restore`)
- Add crop marks at sheet corners (thin lines in margins)
- Add fold lines as thin dashed gray lines on the PDF
- Add cut line indicator along center horizontal between middle columns
- Add small page labels near margins (optional)

### Feature 4: `BookletPreview.vue` + update `FanzinePreview.vue`
**New file: `app/components/BookletPreview.vue`**
**Modify: `app/components/FanzinePreview.vue`**

BookletPreview.vue:
- Shows pages in reading order as 2-page spreads
- 4 spreads: Front Cover|Page 1, Page 2|Page 3, Page 4|Page 5, Page 6|Back Cover
- Left/right arrow navigation between spreads
- Spread counter (e.g., "2 / 4")
- Uses `useFanzineLayout().getSpreads()`

FanzinePreview.vue:
- Add tab switcher: "Print Layout" vs "Booklet Preview"
- Print Layout = current grid view (now with fold guides always on)
- Booklet Preview = new BookletPreview component
- Add "How to fold" button that opens FoldingTutorial modal

### Feature 5: `FoldingTutorial.vue` — Interactive folding guide
**New file: `app/components/FoldingTutorial.vue`**

Modal component with ~7 steps:
1. "Start with your printed sheet face-up"
2. "Fold in half horizontally"
3. "Fold in half again"
4. "Fold once more"
5. "Unfold completely. Cut a slit along the center line"
6. "Fold horizontally. Pop the center outward"
7. "Fold into a booklet. Done!"

Each step has:
- Step number and title text
- A simple SVG/CSS illustration of the paper at that stage
- Next/Previous navigation
- Progress indicator dots

Uses UModal as the container, triggered from FanzinePreview.

### Feature 6: Update `index.vue` — Wire controls
**Modify: `app/pages/index.vue`**

- Arrange step: Add toggle buttons for "Show page labels" and "Show fold guides" in the card header area
- Pass these as props to FanzineGrid
- No other structural changes needed (FanzinePreview handles its own tabs/modal internally)

### Feature 7: i18n strings
**Modify: `i18n/locales/en.json` and `i18n/locales/es.json`**

New keys (~40 strings) for:
- `layout.*` — page role labels (Front Cover, Back Cover, Page 1-6)
- `guides.*` — fold guide toggle labels, overlay text
- `booklet.*` — booklet preview labels, spread navigation
- `tutorial.*` — all 7 step titles and descriptions
- `preview.*` — new tab labels, fold tutorial button text

## Files Summary

### Create (3 files)
| File | Purpose |
|------|---------|
| `app/composables/useFanzineLayout.ts` | Page mapping, rotation logic, reading order |
| `app/components/BookletPreview.vue` | Page-by-page booklet flip preview |
| `app/components/FoldingTutorial.vue` | Step-by-step folding/cutting instructions modal |

### Modify (6 files)
| File | Changes |
|------|---------|
| `app/components/FanzineGrid.vue` | Add page labels, fold guide overlay props |
| `app/components/FanzinePreview.vue` | Add tab switcher + fold tutorial button |
| `app/composables/useExportPdf.ts` | Rotate images, add crop/fold/cut marks |
| `app/pages/index.vue` | Add toggle controls in arrange step |
| `i18n/locales/en.json` | ~40 new translation strings |
| `i18n/locales/es.json` | ~40 new Spanish translation strings |

## Implementation Order
1. `useFanzineLayout.ts` (foundation — no dependencies)
2. `FanzineGrid.vue` updates (depends on 1)
3. `useExportPdf.ts` updates (depends on 1)
4. `BookletPreview.vue` + `FanzinePreview.vue` updates (depends on 1)
5. `FoldingTutorial.vue` (standalone component)
6. `index.vue` wiring (depends on 2)
7. i18n strings (done incrementally with each feature)
