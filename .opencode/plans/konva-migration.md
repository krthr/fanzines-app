# Konva.js Migration Plan

Migrate the fanzine-app rendering layer from HTML/CSS to Konva.js canvas via `vue-konva`.

## Status Legend

- [ ] Not started
- [x] Completed
- [-] In progress

---

## Decisions

| Decision | Choice |
|---|---|
| Text content editing | Hybrid: double-click Konva.Text -> HTML textarea overlay |
| Text property controls | Nuxt UI components in a panel alongside canvas |
| Booklet navigation | HTML overlay buttons on top of canvas |
| PDF export approach | `stage.toDataURL({ pixelRatio })` on visible stage (simplest) |
| Canvas controls prefix | Default `v-` prefix (v-stage, v-layer, etc.) |

---

## Phase 1: Setup & Infrastructure

### 1.1 Install Dependencies
- [x] `yarn add konva vue-konva`
- [x] Keep `jspdf` (already installed, still needed for PDF wrapper + vector guides)

### 1.2 Create Client Plugin
- [x] Create `app/plugins/vue-konva.client.ts`
  - Register `VueKonva` with `nuxtApp.vueApp.use(VueKonva)`
  - `.client.ts` suffix ensures it only runs in the browser (Konva requires DOM)

### 1.3 Create `useKonvaGrid` Composable
- [x] Create `app/composables/useKonvaGrid.ts`
- Pure computation layer (no canvas dependency -- just math)
- Input: `stageWidth`, `stageHeight`, `gap`, `photoCount`
- Output: Array of 8 cell descriptors + guide line coordinates

```typescript
interface CellRect {
  gridIndex: number;
  x: number;       // pixel position in stage
  y: number;
  width: number;
  height: number;
  isRotated: boolean;
  role: PageRole;
  labelKey: string;
}

interface GridGuides {
  foldLines: { x1: number; y1: number; x2: number; y2: number }[];
  cutLine: { x1: number; y1: number; x2: number; y2: number };
  scissorsPos: { x: number; y: number };
}
```

- Gap scaling: same ratio as current export (`gap / stageWidth * actualWidth`)
- Cell dimensions: `(stageWidth - totalGapX) / 4` width, `(stageHeight - totalGapY) / 2` height
- This composable is shared by ZineCanvas, BookletCanvas, and useCanvasExport
- Also expose a `getCoverCrop(imgW, imgH, boxW, boxH)` utility for image cropping

---

## Phase 2: ZineCanvas Component (Main Interactive Canvas)

### 2.1 Create `ZineCanvas.vue`
- [x] Create `app/components/ZineCanvas.vue`
- Wrapped in `<ClientOnly>` with a loading placeholder fallback
- Responsive: use a wrapper `<div ref="container">` and compute stage dimensions
  from container width, maintaining 297:210 (A4 landscape) aspect ratio
- Watch container size and update stage dimensions reactively

### 2.2 Canvas Structure (Konva Node Tree)

```
v-stage (responsive width x height, A4 aspect ratio)
  v-layer (main content layer)
    v-rect (black background -- fills gaps)
    v-group (per cell, x8)
      v-group (clip group: clipX/Y/Width/Height for cell bounds)
        v-group (rotation group: rotation=180 + offsetX/Y for top-row cells)
          v-image (photo, with crop prop for cover-fit)
          v-text (text overlay x3 max, draggable in text mode)
            - Positioned at percentage-based coords within cell
            - Background pill via v-rect behind each v-text
      v-rect (selection highlight -- stroke only, reorder mode)
      v-rect (hover overlay -- semi-transparent, reorder mode)
      v-group (page label -- v-rect bg + v-text, toggleable)
      v-group (cell number -- gradient rect + v-text, toggleable)
  v-layer (guides layer, toggleable)
    v-line (horizontal fold line, dashed)
    v-line (vertical fold lines x3, dashed)
    v-line (cut line, solid red)
    v-text (fold/cut labels)
```

### 2.3 Props & Emits

```typescript
// Props (same interface as current FanzineGrid)
interface ZineCanvasProps {
  photos: PhotoItem[];
  pageTexts: PageText[][];
  gap: number;
  readonly?: boolean;       // default false
  showLabels?: boolean;     // default false
  showGuides?: boolean;     // default false
  mode?: 'reorder' | 'text'; // default 'reorder'
}

// Emits
interface ZineCanvasEmits {
  (e: 'reorder', fromIndex: number, toIndex: number): void;
  (e: 'update:pageText', pageIndex: number, textId: string, updates: Partial<PageText>): void;
  (e: 'add:pageText', pageIndex: number): void;
  (e: 'remove:pageText', pageIndex: number, textId: string): void;
  (e: 'select:text', pageIndex: number, textId: string | null): void;
}
```

### 2.4 Image Loading
- [x] Use `useImage()` from vue-konva for each photo URL
- Track loaded state per image (show placeholder until loaded)
- Compute crop rect for each image using `getCoverCrop(naturalWidth, naturalHeight, cellWidth, cellHeight)`
- Re-compute crop when cell dimensions change (responsive resize)
- Images are blob URLs (same origin) -- no CORS issues

### 2.5 Text Overlay Rendering
- [x] Each `PageText` renders as a `v-group` containing:
  - `v-rect` (background pill, conditional on `showBg`)
  - `v-text` (the text content)
- Position: convert percentage (0-100) to pixel coords within cell
- Anchor text at center: `offsetX: textWidth/2, offsetY: textHeight/2`
- Font mapping (same as current):
  - sans -> Special Elite
  - serif -> Libre Baskerville
  - mono -> Courier Prime
  - handwritten -> Caveat
- Size mapping (screen pixels, scaled proportionally to cell size):
  - sm: ~8-10px equivalent
  - md: ~10-12px equivalent
  - lg: ~12-14px equivalent
  - xl: ~14-16px equivalent
  (Exact sizes TBD based on stage dimensions -- compute as fraction of cell height)
- Color mapping: white=#ffffff, black=#18181b, rose=#d946ef (fuchsia-500)
- Text shadow via Konva `shadowColor`, `shadowBlur`, `shadowOffset`
- Font preloading: call `document.fonts.ready` on mount, then `layer.batchDraw()`

### 2.6 Text Dragging (Text Mode)
- [x] Set `draggable: true` on text groups when `mode === 'text'` and `!readonly`
- `dragBoundFunc` constrains to 5-95% of cell dimensions (converted to pixels)
- On `@dragend`: convert pixel position back to percentage, emit `update:pageText`
- Rotation handling: text nodes are children of the rotated cell group,
  so Konva handles coordinate transforms automatically -- no manual delta inversion needed
- Cursor: `pointer` on hover in text mode

### 2.7 Text Content Editing (Hybrid HTML Overlay)
- [x] On double-click of a text node:
  1. Get the text node's absolute position on screen via `node.getClientRect()` + stage container offset
  2. Create/show an HTML `<textarea>` absolutely positioned over the canvas
  3. Style the textarea to match: font family, font size, color, alignment, rotation
  4. Focus the textarea, select all text
  5. On blur / Enter / Escape: sync value back via `emit('update:pageText')`, remove textarea
- On single-click of a text node: select it (show in property panel)
- On click of empty cell area in text mode: emit `add:pageText`

### 2.8 Text Property Panel (HTML, Outside Canvas)
- [x] When a text node is selected (clicked in text mode), show a panel/toolbar
- Panel renders alongside the canvas (not inside it) using Nuxt UI components
- Controls: font picker (4 buttons), size picker (S/M/L/XL), color picker (3 swatches),
  background toggle (USwitch), remove button
- Panel receives the selected text's properties as props, emits updates
- Reuse adapted version of current `PageTextEditor.vue`
- Panel visibility tied to `selectedTextId` state
- Panel positioned below or beside the canvas

### 2.9 Reorder Mode (Click-to-Swap)
- [x] First click on a cell: set `selectedIndex`, show selection highlight (stroke rect)
- Second click on different cell: emit `reorder`, clear selection
- Click same cell: deselect
- Hover effect: adjust cell overlay opacity on mouseenter/mouseleave
- "Swap" badge: `v-group` with `v-rect` + `v-text` on selected cell
- "Place here" hint: shown on hover over non-selected cells when one is selected
- Cursor: `pointer` on cells in reorder mode

### 2.10 Page Labels
- [x] Toggle via `showLabels` prop
- Each cell gets a `v-group` (label) with:
  - `v-rect` background (amber for rotated cells, white otherwise)
  - `v-text` with page role from i18n
  - Rotation indicator: small `v-text` with "(180deg)" for top-row cells

### 2.11 Fold/Cut Guides
- [x] Toggle via `showGuides` prop
- Rendered on a separate `v-layer` (so they can be toggled without redrawing content)
- Fold lines: 4 `v-line` nodes with `dash: [6, 4]`, white/70 opacity
- Cut line: `v-line` solid red, spanning middle half of horizontal center
- Fold/Cut labels: `v-text` nodes

### 2.12 Expose Stage Ref for Export
- [x] Expose the `v-stage` ref via `defineExpose` so the export composable can call
  `stageRef.getNode().toDataURL({ pixelRatio })` directly
- This is the key integration point with Phase 4

---

## Phase 3: BookletCanvas Component

### 3.1 Create `BookletCanvas.vue`
- [x] Create `app/components/BookletCanvas.vue`
- Read-only canvas showing the fanzine in booklet reading order as 2-page spreads
- Wrapped in `<ClientOnly>`

### 3.2 Canvas Structure

```
div.relative (wrapper for canvas + HTML overlay controls)
  v-stage (width x height, aspect-ratio 297:210)
    v-layer
      v-rect (white background)
      v-group (left page)
        v-group (clip to left half)
          v-image (photo with cover-crop)
          v-group (text overlays)
        v-group (page label at bottom)
      v-line (spine: dashed center line)
      v-group (right page)
        v-group (clip to right half)
          v-image (photo with cover-crop)
          v-group (text overlays)
        v-group (page label at bottom)

  <!-- HTML overlay navigation -->
  <button> left arrow </button>
  <button> right arrow </button>
  <div> dot indicators + counter </div>
```

### 3.3 Props & Navigation State

```typescript
interface BookletCanvasProps {
  photos: PhotoItem[];
  pageTexts: PageText[][];
}
```

- Internal state: `currentSpread` ref (0-3)
- Uses `useFanzineLayout().getSpreads()` and `getReadingOrderTexts()`
- Navigation: prev/next via HTML buttons + keyboard arrow listeners
- Dot indicators: HTML divs positioned below canvas
- Text sizes slightly larger than grid (proportional to page size)
- No rotation applied (booklet pages are already in reading orientation)
- Auto-reset `currentSpread` to 0 when photos change

---

## Phase 4: Export Pipeline

### 4.1 Create `useCanvasExport.ts`
- [x] Create `app/composables/useCanvasExport.ts`
- Replaces `useExportPdf.ts`

### 4.2 Export Approach (Simplest: pixelRatio on Visible Stage)

```typescript
export function useCanvasExport() {
  const isExporting = ref(false);

  async function exportToPdf(
    stageNode: Konva.Stage,
    gap: number,
    options: { showGuides?: boolean; filename?: string }
  ): Promise<void> {
    isExporting.value = true;
    try {
      await document.fonts.ready;

      // pixelRatio scales the visible stage up to 300 DPI
      const pixelRatio = 3508 / stageNode.width();

      const dataURL = stageNode.toDataURL({
        pixelRatio,
        mimeType: 'image/jpeg',
        quality: 0.95,
      });

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(dataURL, 'JPEG', 0, 0, 297, 210);

      if (options.showGuides) {
        drawPrintGuides(pdf, gap);
      }

      pdf.save(options.filename ?? 'fanzine.pdf');
    } finally {
      isExporting.value = false;
    }
  }

  return { exportToPdf, isExporting };
}
```

### 4.3 Print Guides
- [x] Port `drawPrintGuides()` and `cropMarkLines()` from current `useExportPdf.ts`
- No logic changes needed -- these use jsPDF's native vector drawing API
- Copy constants: DPI, A4 dimensions, guide styling values

### 4.4 Export Integration
- [x] `ZineCanvas` exposes stage ref via `defineExpose({ getStageNode })`
- [x] `FanzinePreview` calls `useCanvasExport().exportToPdf(stageNode, gap, options)`
- [x] Before export: temporarily hide non-print layers/elements:
  - Selection highlights, hover overlays
  - Cell number overlays
  - Page labels (PDF guides draw their own labels via jsPDF)
  - Reorder/text mode indicators
- [x] After export: restore all hidden elements
- [x] Guide lines layer: keep visible if `showGuides` option is true
  (they become part of the raster image; jsPDF guides add vector overlay on top)

---

## Phase 5: Integration & Wiring

### 5.1 Update `index.vue`
- [x] Replace `<FanzineGrid>` with `<ZineCanvas>` (wrapped in `<ClientOnly>`)
- [x] Same props and emits interface -- should be a near drop-in replacement
- [x] Add the text property panel alongside the canvas (conditional on text mode + selected text)
- [x] Wire up text property changes to `updatePageText` store action

### 5.2 Update `FanzinePreview.vue`
- [x] Replace `<FanzineGrid readonly ...>` with `<ZineCanvas readonly ...>`
- [x] Replace `<BookletPreview>` with `<BookletCanvas>`
- [x] Update export call: use `useCanvasExport` instead of `useExportPdf`
- [x] Get stage ref from ZineCanvas for export

### 5.3 Adapt `PageTextEditor.vue`
- [x] Keep as Nuxt UI component (not on canvas)
- [x] Adjust props/emits if the interface changes
- [x] Render as a floating panel or toolbar below the canvas
- [x] Bind to the currently selected text node's properties

### 5.4 Ensure Font Preloading
- [x] Fonts already configured in `nuxt.config.ts` via `@nuxt/fonts`
- [x] On canvas mount: `await document.fonts.ready` before initial render
- [x] After fonts load: `layer.batchDraw()` to re-render text with correct fonts

---

## Phase 6: Cleanup

### 6.1 Delete Replaced Files
- [x] `app/components/FanzineGrid.vue` (replaced by ZineCanvas.vue)
- [x] `app/components/BookletPreview.vue` (replaced by BookletCanvas.vue)
- [x] `app/composables/useExportPdf.ts` (replaced by useCanvasExport.ts)
- [x] `app/composables/useDragText.ts` (drag logic now native in Konva)

### 6.2 Verify All Flows
- [x] Dev server compiles without errors
- [x] TypeScript typecheck passes clean
- [x] SSR renders without errors (curl test)
- [ ] Upload 8 photos -> step 2 (manual browser test)
- [ ] Reorder mode: click-to-swap works correctly
- [ ] Text mode: add text, edit content (double-click), drag to reposition
- [ ] Text mode: change font, size, color, background via property panel
- [ ] Text mode: remove text
- [ ] Gap slider: draft/apply pattern works, canvas re-renders
- [ ] Labels toggle: show/hide page role labels
- [ ] Guides toggle: show/hide fold/cut guides
- [ ] Export tab: print layout shows readonly ZineCanvas
- [ ] Export tab: booklet tab shows BookletCanvas with spread navigation
- [ ] PDF download: generates correct A4 landscape PDF
- [ ] PDF: images are high-res (300 DPI equivalent)
- [ ] PDF: text overlays render correctly
- [ ] PDF: vector guides render correctly
- [ ] PDF: top-row cells are rotated 180 degrees
- [ ] Responsive: canvas resizes with container
- [ ] Dark mode: canvas wrapper has correct background
- [ ] i18n: labels use translated strings
- [ ] Keyboard: booklet arrow navigation works

---

## File Summary

### New Files (5)
| File | Purpose |
|---|---|
| `app/plugins/vue-konva.client.ts` | Register vue-konva (client-only) |
| `app/composables/useKonvaGrid.ts` | Cell geometry + guide line computation |
| `app/components/ZineCanvas.vue` | Main interactive Konva canvas (replaces FanzineGrid) |
| `app/components/BookletCanvas.vue` | Booklet spread Konva canvas (replaces BookletPreview) |
| `app/composables/useCanvasExport.ts` | PDF export via Konva stage (replaces useExportPdf) |

### Modified Files (3)
| File | Changes |
|---|---|
| `app/pages/index.vue` | Swap FanzineGrid -> ZineCanvas, add text panel |
| `app/components/FanzinePreview.vue` | Swap components, update export |
| `app/components/PageTextEditor.vue` | Minor prop/emit adjustments, render as panel |

### Deleted Files (4)
| File | Reason |
|---|---|
| `app/components/FanzineGrid.vue` | Replaced by ZineCanvas |
| `app/components/BookletPreview.vue` | Replaced by BookletCanvas |
| `app/composables/useExportPdf.ts` | Replaced by useCanvasExport |
| `app/composables/useDragText.ts` | Konva native drag replaces this |

### Unchanged Files
| File | Reason |
|---|---|
| `app/composables/usePhotoStore.ts` | State model stays the same |
| `app/composables/useFanzineLayout.ts` | Layout mapping stays the same |
| `app/composables/useImageProcessor.ts` | Image processing stays the same |
| `app/components/PhotoUploader.vue` | No canvas involvement |
| `app/components/FoldingTutorial.vue` | No canvas involvement |
| `app/components/WhatIsFanzine.vue` | No canvas involvement |
| `nuxt.config.ts` | No changes needed (plugin auto-discovered) |
| `package.json` | Only new deps added via yarn |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Font rendering on canvas | Preload all fonts via `document.fonts.ready` before mount + `batchDraw()` after |
| SSR crash (Konva needs DOM) | `.client.ts` plugin + `<ClientOnly>` wrapper on all canvas components |
| Canvas memory on mobile | Images already pre-processed to max 2400px; Konva handles this well |
| Export canvas size limits | A4 at 300 DPI = 3508x2480 -- well within browser limits (~16k x 16k) |
| Accessibility | Add `aria-label` on canvas wrapper; text editor stays as accessible HTML |
| Popover anchoring on canvas | Use floating panel/toolbar instead of UPopover anchored to canvas nodes |
| Dark mode | Apply newsprint/paper styles to canvas wrapper div, not inside canvas |
| pixelRatio export includes UI elements | Hide labels/selection/hover layers before export, restore after |
| Preview vs export mismatch | Unified pipeline -- same Konva stage renders both preview and export |
