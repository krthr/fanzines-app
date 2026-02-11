<template>
  <div
    ref="containerEl"
    class="fanzine-canvas-container relative"
  >
    <div ref="stageWrapperEl" :style="{ aspectRatio: '297 / 210', width: '100%' }">
      <ClientOnly>
      <v-stage
        v-if="stageSize.width > 0"
        ref="stageRef"
        :config="stageSize"
        @wheel="onWheel"
      >
        <!-- Background layer -->
        <v-layer>
          <v-rect :config="{ x: 0, y: 0, width: stageSize.width, height: stageSize.height, fill: '#000000' }" />
        </v-layer>

        <!-- Photos layer -->
        <v-layer ref="photosLayerRef">
          <template v-for="(cell, i) in cells" :key="'cell-' + i">
            <!-- Cell group: clipped to cell bounds, optionally rotated 180° -->
            <v-group
              :config="getCellGroupConfig(i, cell)"
              @click="handleCellClick(i)"
              @tap="handleCellClick(i)"
              @mouseenter="handleCellMouseEnter(i)"
              @mouseleave="handleCellMouseLeave"
            >
              <!-- Photo image with crop (object-fit: cover) -->
              <v-image
                v-if="loadedImages[i]"
                :config="getImageConfig(i, cell)"
              />

              <!-- Text overlays for this cell: group wraps bg + text + selection for coordinated drag -->
              <template v-for="(txt, j) in (pageTexts[i] ?? [])" :key="txt.id">
                <v-group
                  v-if="txt.content"
                  :config="getTextGroupConfig(i, txt, cell)"
                  :draggable="mode === 'text' && !readonly"
                  @dragmove="handleTextDragMove(i, txt, $event)"
                  @dragend="handleTextDragEnd(i, txt, $event)"
                  @click="handleTextClick(i, txt, $event)"
                  @tap="handleTextClick(i, txt, $event)"
                  @mouseenter="mode === 'text' && !readonly && setCursor('move')"
                  @mouseleave="mode === 'text' && !readonly && setCursor('default')"
                >
                  <!-- Background pill -->
                  <v-rect
                    v-if="txt.showBg"
                    :config="getTextBgConfig(txt, cell)"
                  />
                  <!-- Text node -->
                  <v-text
                    :config="getTextNodeConfig(txt, cell)"
                  />
                  <!-- Selection indicator for active text -->
                  <v-rect
                    v-if="selectedTextId === txt.id"
                    :config="getTextSelectionConfig(txt, cell)"
                  />
                </v-group>
              </template>
            </v-group>
          </template>
        </v-layer>

        <!-- Guides layer -->
        <v-layer v-if="showGuides">
          <!-- Horizontal center fold (dashed white) -->
          <v-line :config="{
            points: [0, foldYCenter, stageSize.width, foldYCenter],
            stroke: 'rgba(255, 255, 255, 0.7)',
            strokeWidth: guideLineWidth,
            dash: [dashLength, dashLength],
          }" />

          <!-- Vertical fold lines at 1/4, 1/2, 3/4 -->
          <v-line
            v-for="frac in [0.25, 0.5, 0.75]"
            :key="'vfold-' + frac"
            :config="{
              points: [stageSize.width * frac, 0, stageSize.width * frac, stageSize.height],
              stroke: 'rgba(255, 255, 255, 0.5)',
              strokeWidth: guideLineWidth,
              dash: [dashLength, dashLength],
            }"
          />

          <!-- Cut line (solid red, center horizontal, middle half) -->
          <v-line :config="{
            points: [stageSize.width * 0.25, foldYCenter, stageSize.width * 0.75, foldYCenter],
            stroke: 'rgba(220, 80, 80, 0.9)',
            strokeWidth: guideLineWidth * 1.5,
          }" />

          <!-- Scissors "X" at cut start -->
          <v-line :config="{
            points: [
              stageSize.width * 0.25 - scissorsSize, foldYCenter - scissorsSize,
              stageSize.width * 0.25 + scissorsSize, foldYCenter + scissorsSize,
            ],
            stroke: 'rgba(220, 80, 80, 0.9)',
            strokeWidth: guideLineWidth,
          }" />
          <v-line :config="{
            points: [
              stageSize.width * 0.25 - scissorsSize, foldYCenter + scissorsSize,
              stageSize.width * 0.25 + scissorsSize, foldYCenter - scissorsSize,
            ],
            stroke: 'rgba(220, 80, 80, 0.9)',
            strokeWidth: guideLineWidth,
          }" />
        </v-layer>

        <!-- Labels layer -->
        <v-layer v-if="showLabels">
          <template v-for="(cell, i) in cells" :key="'label-' + i">
            <!-- Label background pill -->
            <v-rect :config="getLabelBgConfig(i, cell)" />
            <!-- Label text -->
            <v-text :config="getLabelTextConfig(i, cell)" />
            <!-- Rotation indicator for top-row cells -->
            <v-text
              v-if="layout.LAYOUT[i]?.rotated"
              :config="getRotationIndicatorConfig(i, cell)"
            />
          </template>
        </v-layer>

        <!-- Interaction overlay layer -->
        <v-layer v-if="!readonly">
          <template v-for="(cell, i) in cells" :key="'interaction-' + i">
            <!-- Reorder mode overlays -->
            <template v-if="mode === 'reorder'">
              <!-- Selected cell overlay -->
              <v-rect
                v-if="selectedIndex === i"
                :config="{
                  x: cell.x,
                  y: cell.y,
                  width: cell.w,
                  height: cell.h,
                  fill: 'rgba(225, 29, 72, 0.2)',
                  stroke: '#e11d48',
                  strokeWidth: Math.max(2, cell.w * 0.008),
                }"
              />

              <!-- Hover target overlay (when swap is pending) -->
              <v-rect
                v-if="hoverIndex === i && selectedIndex !== null && selectedIndex !== i"
                :config="{
                  x: cell.x,
                  y: cell.y,
                  width: cell.w,
                  height: cell.h,
                  fill: 'rgba(0, 0, 0, 0.3)',
                }"
              />

              <!-- Selected badge: "Swap" -->
              <v-rect
                v-if="selectedIndex === i"
                :config="getBadgeBgConfig(t('grid.swap'), cell, '#e11d48')"
              />
              <v-text
                v-if="selectedIndex === i"
                :config="getBadgeTextConfig(t('grid.swap'), cell)"
              />

              <!-- Hover badge: "Place Here" -->
              <v-rect
                v-if="hoverIndex === i && selectedIndex !== null && selectedIndex !== i"
                :config="getBadgeBgConfig(t('grid.placeHere'), cell, '#52525b')"
              />
              <v-text
                v-if="hoverIndex === i && selectedIndex !== null && selectedIndex !== i"
                :config="getBadgeTextConfig(t('grid.placeHere'), cell)"
              />

              <!-- Cell number at bottom (gradient + number) -->
              <v-rect
                v-if="selectedIndex !== i"
                :config="{
                  x: cell.x,
                  y: cell.y + cell.h * 0.85,
                  width: cell.w,
                  height: cell.h * 0.15,
                  fillLinearGradientStartPoint: { x: 0, y: 0 },
                  fillLinearGradientEndPoint: { x: 0, y: cell.h * 0.15 },
                  fillLinearGradientColorStops: [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.6)'],
                  listening: false,
                }"
              />
              <v-text
                v-if="selectedIndex !== i"
                :config="{
                  x: cell.x,
                  y: cell.y + cell.h - Math.max(8, cell.h * 0.04) * 1.5,
                  width: cell.w,
                  text: String(i + 1),
                  fontSize: Math.max(8, cell.h * 0.04),
                  fontStyle: '500',
                  fill: '#ffffff',
                  align: 'center',
                  listening: false,
                }"
              />
            </template>

            <!-- Text mode: editing cell highlight -->
            <v-rect
              v-if="mode === 'text' && editingIndex === i"
              :config="{
                x: cell.x,
                y: cell.y,
                width: cell.w,
                height: cell.h,
                fill: 'rgba(59, 130, 246, 0.15)',
                stroke: '#3b82f6',
                strokeWidth: Math.max(2, cell.w * 0.008),
                listening: false,
              }"
            />
          </template>
        </v-layer>
      </v-stage>
      </ClientOnly>
    </div>

    <!-- DOM overlay: PageTextEditor popover (canvas can't render form inputs) -->
    <UPopover
      v-if="mode === 'text' && !readonly && editingIndex !== null"
      :open="true"
      :content="{ side: 'bottom', align: 'center', sideOffset: 4 }"
      @update:open="(val: boolean) => { if (!val) closeTextEditor() }"
    >
      <div
        class="absolute pointer-events-none"
        :style="popoverAnchorStyle"
      />
      <template #content>
        <PageTextEditor
          :texts="currentEditTexts"
          :active-text-id="activeTextId"
          :max-texts="MAX_TEXTS_PER_PAGE"
          :label-key="editingLabelKey"
          :page-role="editingPageRole"
          @update:text="onTextUpdate"
          @add:text="onTextAdd"
          @remove:text="onTextRemove"
          @select:text="onTextSelect"
        />
      </template>
    </UPopover>
  </div>
</template>

<script setup lang="ts">
import type Konva from 'konva';
import type { PhotoItem, PageText } from '~/composables/usePhotoStore';
import type { CropTransform, CellRect } from '~/composables/useKonvaStage';
import {
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

const MAX_TEXTS_PER_PAGE = 3;

interface FanzineCanvasProps {
  photos: PhotoItem[];
  pageTexts: PageText[][];
  gap?: number;
  readonly?: boolean;
  showLabels?: boolean;
  showGuides?: boolean;
  mode?: 'reorder' | 'text';
  cropTransforms?: CropTransform[];
}

const props = withDefaults(defineProps<FanzineCanvasProps>(), {
  gap: 0,
  readonly: false,
  showLabels: false,
  showGuides: false,
  mode: 'reorder',
  cropTransforms: () => [],
});

const emit = defineEmits<{
  reorder: [fromIndex: number, toIndex: number];
  'update:pageText': [pageIndex: number, textId: string, updates: Partial<PageText>];
  'add:pageText': [pageIndex: number];
  'remove:pageText': [pageIndex: number, textId: string];
  'update:cropTransform': [index: number, transform: CropTransform];
}>();

const { t } = useI18n();
const layout = useFanzineLayout();

// Refs
const containerEl = ref<HTMLDivElement | null>(null);
const stageWrapperEl = ref<HTMLDivElement | null>(null);
const stageRef = ref<{ getNode: () => Konva.Stage } | null>(null);
const photosLayerRef = ref<{ getNode: () => Konva.Layer } | null>(null);

// Stage sizing
const stageSize = reactive({ width: 0, height: 0 });

// Loaded images cache
const loadedImages = shallowRef<(HTMLImageElement | null)[]>([]);
const imageUrlsLoaded = ref<string[]>([]);
let isLoadingAssets = false;

// Interaction state
const selectedIndex = ref<number | null>(null);
const hoverIndex = ref<number | null>(null);
const editingIndex = ref<number | null>(null);
const activeTextId = ref<string | null>(null);
const selectedTextId = ref<string | null>(null);

// ---------------------------------------------------------------------------
// Cell geometry (computed from stage size + gap)
// ---------------------------------------------------------------------------

const cells = computed<CellRect[]>(() => {
  if (stageSize.width <= 0 || stageSize.height <= 0) return [];
  return calcCellRects(stageSize.width, stageSize.height, props.gap);
});

// ---------------------------------------------------------------------------
// Guide overlay computed values
// ---------------------------------------------------------------------------

const gapPx = computed(() => {
  if (stageSize.width <= 0) return 0;
  return Math.round((props.gap / 900) * stageSize.width);
});

const foldYCenter = computed(() => {
  const c = cells.value[0];
  if (!c) return stageSize.height / 2;
  return c.h + gapPx.value / 2;
});

const guideLineWidth = computed(() => Math.max(1, stageSize.width * 0.0006));
const dashLength = computed(() => stageSize.width * 0.005);
const scissorsSize = computed(() => stageSize.width * 0.005);

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

async function ensureImagesLoaded(): Promise<void> {
  const urls = props.photos.map(p => p.url);

  if (
    urls.length === imageUrlsLoaded.value.length
    && urls.every((u, i) => u === imageUrlsLoaded.value[i])
  ) {
    return;
  }

  if (isLoadingAssets) return;
  isLoadingAssets = true;

  try {
    const photosSnapshot = [...props.photos];
    const urlsSnapshot = photosSnapshot.map(p => p.url);
    const images = await loadAllImages(photosSnapshot);

    const currentUrls = props.photos.map(p => p.url);
    if (
      urlsSnapshot.length === currentUrls.length
      && urlsSnapshot.every((u, i) => u === currentUrls[i])
    ) {
      loadedImages.value = images;
      imageUrlsLoaded.value = urlsSnapshot;
    } else {
      isLoadingAssets = false;
      ensureImagesLoaded();
      return;
    }
  } catch (err) {
    console.error('[FanzineCanvas] Failed to load images:', err);
  } finally {
    isLoadingAssets = false;
  }
}

async function ensureFontsLoaded(): Promise<void> {
  const hasText = props.pageTexts.flat().some(pt => pt.content);
  if (!hasText) return;

  try {
    const sampleH = cells.value[0]?.h ?? 300;
    const pageTextsSnapshot = props.pageTexts.map(arr => [...arr]);
    await preloadFonts(pageTextsSnapshot, sampleH);
  } catch (err) {
    console.warn('[FanzineCanvas] Font preload failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Cell group config (clip + rotation)
// ---------------------------------------------------------------------------

function getCellGroupConfig(index: number, cell: CellRect): Record<string, unknown> {
  const slot = layout.LAYOUT[index];
  const rotated = slot?.rotated ?? false;

  const config: Record<string, unknown> = {
    clipX: cell.x,
    clipY: cell.y,
    clipWidth: cell.w,
    clipHeight: cell.h,
  };

  if (rotated) {
    // Rotate 180° around the cell center
    config.rotation = 180;
    config.offsetX = cell.x + cell.w / 2;
    config.offsetY = cell.y + cell.h / 2;
    config.x = cell.x + cell.w / 2;
    config.y = cell.y + cell.h / 2;
  }

  return config;
}

// ---------------------------------------------------------------------------
// Image config (crop = object-fit: cover)
// ---------------------------------------------------------------------------

function getImageConfig(index: number, cell: CellRect): Record<string, unknown> {
  const img = loadedImages.value[index];
  if (!img) return {};

  const crop = props.cropTransforms[index] ?? defaultCropTransform();
  const coverConfig = computeImageCoverConfig(img, cell.w, cell.h, crop);

  return {
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
    listening: false,
  };
}

// ---------------------------------------------------------------------------
// Text overlay configs
// ---------------------------------------------------------------------------

/** Wrapper group for a text overlay -- positioned at text center, draggable as a unit. */
function getTextGroupConfig(index: number, txt: PageText, cell: CellRect): Record<string, unknown> {
  // Text position is stored as percentage of cell dimensions in stage (absolute) space.
  // For rotated cells (180°), we must invert the local position so that the parent's
  // rotation maps it back to the correct absolute position.
  const rotated = layout.LAYOUT[index]?.rotated ?? false;

  let localX: number;
  let localY: number;

  if (rotated) {
    // Invert: local = cell.x + cell.w - (pct * cell.w)
    localX = cell.x + cell.w - (txt.x / 100) * cell.w;
    localY = cell.y + cell.h - (txt.y / 100) * cell.h;
  } else {
    localX = cell.x + (txt.x / 100) * cell.w;
    localY = cell.y + (txt.y / 100) * cell.h;
  }

  return {
    x: localX,
    y: localY,
    dragBoundFunc: (pos: { x: number; y: number }) => ({
      x: Math.max(cell.x, Math.min(cell.x + cell.w, pos.x)),
      y: Math.max(cell.y, Math.min(cell.y + cell.h, pos.y)),
    }),
    name: `text-group-${txt.id}`,
  };
}

/** Text node config (positioned relative to its parent group at 0,0). */
function getTextNodeConfig(txt: PageText, cell: CellRect): Record<string, unknown> {
  const fontSize = getTextFontSizePx(txt.size, cell.h);
  const padding = fontSize * 0.6;
  const maxTextWidth = cell.w - padding * 2;

  const isLightText = txt.color !== 'black';

  return {
    x: 0,
    y: 0,
    offsetX: maxTextWidth / 2,
    offsetY: fontSize / 2,
    text: txt.content,
    fontSize,
    fontFamily: getKonvaFontFamily(txt.font),
    fontStyle: getTextFontStyle(txt.size, txt.font),
    fill: getTextFillColor(txt.color),
    width: maxTextWidth,
    align: 'center',
    verticalAlign: 'middle',
    shadowColor: isLightText ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.6)',
    shadowBlur: Math.max(2, fontSize * 0.1),
    shadowOffsetX: 0,
    shadowOffsetY: Math.max(1, fontSize * 0.03),
    shadowEnabled: true,
    listening: false,
  };
}

/** Background pill config (positioned relative to parent group at 0,0). */
function getTextBgConfig(txt: PageText, cell: CellRect): Record<string, unknown> {
  const fontSize = getTextFontSizePx(txt.size, cell.h);
  const padding = fontSize * 0.6;
  const maxTextWidth = cell.w - padding * 2;

  const barHeight = fontSize + padding * 2;
  const bgWidth = maxTextWidth + padding * 2;

  const isLightText = txt.color !== 'black';

  return {
    x: -bgWidth / 2,
    y: -barHeight / 2,
    width: bgWidth,
    height: barHeight,
    fill: isLightText ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.55)',
    listening: false,
  };
}

/** Selection indicator config (positioned relative to parent group at 0,0). */
function getTextSelectionConfig(txt: PageText, cell: CellRect): Record<string, unknown> {
  const fontSize = getTextFontSizePx(txt.size, cell.h);
  const padding = fontSize * 0.6;
  const maxTextWidth = cell.w - padding * 2;

  const barHeight = fontSize + padding * 2;
  const selW = maxTextWidth + padding * 2;

  return {
    x: -selW / 2,
    y: -barHeight / 2,
    width: selW,
    height: barHeight,
    stroke: '#3b82f6',
    strokeWidth: Math.max(1, fontSize * 0.06),
    dash: [4, 3],
    listening: false,
  };
}

// ---------------------------------------------------------------------------
// Label configs
// ---------------------------------------------------------------------------

function getLabelBgConfig(index: number, cell: CellRect): Record<string, unknown> {
  const slot = layout.LAYOUT[index];
  const rotated = slot?.rotated ?? false;
  const fontSize = Math.max(8, cell.h * 0.045);
  const label = t(slot?.labelKey ?? '');
  const padX = fontSize * 0.6;
  const padY = fontSize * 0.4;

  // Approximate text width (roughly 0.6 * fontSize per char)
  const approxTextW = label.length * fontSize * 0.55;
  const bgW = approxTextW + padX * 2;
  const bgH = fontSize + padY * 2;

  return {
    x: cell.x + cell.w / 2 - bgW / 2,
    y: cell.y + cell.h / 2 - bgH / 2,
    width: bgW,
    height: bgH,
    fill: rotated ? 'rgba(245, 158, 11, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    listening: false,
  };
}

function getLabelTextConfig(index: number, cell: CellRect): Record<string, unknown> {
  const slot = layout.LAYOUT[index];
  const rotated = slot?.rotated ?? false;
  const fontSize = Math.max(8, cell.h * 0.045);
  const label = t(slot?.labelKey ?? '');

  // Use width of cell for centering
  return {
    x: cell.x,
    y: cell.y + cell.h / 2 - fontSize / 2,
    width: cell.w,
    text: label,
    fontSize,
    fontStyle: '600',
    fontFamily: 'sans-serif',
    fill: rotated ? '#ffffff' : '#18181b',
    align: 'center',
    listening: false,
  };
}

function getRotationIndicatorConfig(index: number, cell: CellRect): Record<string, unknown> {
  const fontSize = Math.max(8, cell.h * 0.045);
  const smallFont = Math.max(6, fontSize * 0.65);
  const bgH = fontSize + fontSize * 0.4 * 2;

  return {
    x: cell.x,
    y: cell.y + cell.h / 2 + bgH / 2,
    width: cell.w,
    text: '\u21BB 180\u00B0',
    fontSize: smallFont,
    fontFamily: 'sans-serif',
    fill: 'rgba(252, 211, 77, 0.9)',
    align: 'center',
    listening: false,
  };
}

// ---------------------------------------------------------------------------
// Badge configs (for reorder mode)
// ---------------------------------------------------------------------------

function getBadgeBgConfig(text: string, cell: CellRect, bgColor: string): Record<string, unknown> {
  const fontSize = Math.max(10, cell.h * 0.06);
  const padX = fontSize * 0.8;
  const padY = fontSize * 0.5;
  const approxW = text.length * fontSize * 0.55 + padX * 2;
  const badgeH = fontSize + padY * 2;

  return {
    x: cell.x + cell.w / 2 - approxW / 2,
    y: cell.y + cell.h / 2 - badgeH / 2,
    width: approxW,
    height: badgeH,
    fill: bgColor,
    cornerRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowBlur: 6,
    shadowOffsetY: 2,
    listening: false,
  };
}

function getBadgeTextConfig(text: string, cell: CellRect): Record<string, unknown> {
  const fontSize = Math.max(10, cell.h * 0.06);
  return {
    x: cell.x,
    y: cell.y + cell.h / 2 - fontSize / 2,
    width: cell.w,
    text,
    fontSize,
    fontStyle: '600',
    fontFamily: 'sans-serif',
    fill: '#ffffff',
    align: 'center',
    listening: false,
  };
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function handleCellClick(index: number): void {
  if (props.readonly) return;

  if (props.mode === 'reorder') {
    if (selectedIndex.value === null) {
      selectedIndex.value = index;
    } else if (selectedIndex.value === index) {
      selectedIndex.value = null;
    } else {
      emit('reorder', selectedIndex.value, index);
      selectedIndex.value = null;
    }
  }

  if (props.mode === 'text') {
    if (editingIndex.value === index) {
      closeTextEditor();
    } else {
      editingIndex.value = index;
      const texts = props.pageTexts[index] ?? [];
      activeTextId.value = texts.length > 0 ? texts[0]!.id : null;
      selectedTextId.value = null;
    }
  }
}

function handleTextClick(cellIndex: number, txt: PageText, event: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
  // Stop propagation so the cell click doesn't fire
  event.cancelBubble = true;

  if (props.readonly) return;

  if (props.mode === 'text') {
    editingIndex.value = cellIndex;
    activeTextId.value = txt.id;
    selectedTextId.value = txt.id;
  }
}

function handleTextDragMove(cellIndex: number, txt: PageText, event: Konva.KonvaEventObject<DragEvent>): void {
  // Keep the selected text synced during drag
  if (props.mode === 'text') {
    editingIndex.value = cellIndex;
    activeTextId.value = txt.id;
    selectedTextId.value = txt.id;
  }
}

function handleTextDragEnd(cellIndex: number, txt: PageText, event: Konva.KonvaEventObject<DragEvent>): void {
  const node = event.target;
  const cell = cells.value[cellIndex];
  if (!cell) return;

  // Use absolute (stage) position since dragBoundFunc clamps in stage space.
  // This correctly handles 180°-rotated parent groups where local coords are flipped.
  const absPos = node.getAbsolutePosition();

  const newX = Math.max(5, Math.min(95,
    ((absPos.x - cell.x) / cell.w) * 100,
  ));
  const newY = Math.max(5, Math.min(95,
    ((absPos.y - cell.y) / cell.h) * 100,
  ));

  emit('update:pageText', cellIndex, txt.id, { x: newX, y: newY });
}

// ---------------------------------------------------------------------------
// Cursor management (Konva doesn't set CSS cursors automatically)
// ---------------------------------------------------------------------------

function setCursor(cursor: string): void {
  const stage = stageRef.value?.getNode();
  const container = stage?.container();
  if (container) container.style.cursor = cursor;
}

function handleCellMouseEnter(index: number): void {
  if (props.readonly) return;
  if (props.mode === 'reorder') {
    setCursor(selectedIndex.value !== null ? 'pointer' : 'grab');
    if (selectedIndex.value !== null) {
      hoverIndex.value = index;
    }
  } else if (props.mode === 'text') {
    setCursor('pointer');
  }
}

function handleCellMouseLeave(): void {
  hoverIndex.value = null;
  setCursor('default');
}

function onWheel(event: Konva.KonvaEventObject<WheelEvent>): void {
  if (props.readonly) return;

  const evt = event.evt;
  evt.preventDefault();

  const stage = stageRef.value?.getNode();
  if (!stage) return;

  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  // Find which cell the pointer is over
  const cellIndex = cells.value.findIndex(
    c => pointer.x >= c.x && pointer.x <= c.x + c.w && pointer.y >= c.y && pointer.y <= c.y + c.h,
  );
  if (cellIndex === -1) return;

  const currentCrop = props.cropTransforms[cellIndex] ?? defaultCropTransform();

  const delta = evt.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(1, Math.min(5, currentCrop.scale + delta));

  if (newScale !== currentCrop.scale) {
    emit('update:cropTransform', cellIndex, {
      ...currentCrop,
      scale: newScale,
    });
  }
}

// ---------------------------------------------------------------------------
// Text editor popover helpers
// ---------------------------------------------------------------------------

const currentEditTexts = computed(() =>
  editingIndex.value !== null ? (props.pageTexts[editingIndex.value] ?? []) : [],
);

const editingLabelKey = computed(() =>
  editingIndex.value !== null ? layout.getPageLabelKey(editingIndex.value) : '',
);

const editingPageRole = computed(() =>
  editingIndex.value !== null ? (layout.getSlot(editingIndex.value)?.role ?? '') : '',
);

/** Position the popover anchor at the center-bottom of the editing cell. */
const popoverAnchorStyle = computed(() => {
  if (editingIndex.value === null || !stageWrapperEl.value) return {};

  const cell = cells.value[editingIndex.value];
  if (!cell) return {};

  const wrapperRect = stageWrapperEl.value.getBoundingClientRect();
  const scaleX = wrapperRect.width / stageSize.width;
  const scaleY = wrapperRect.height / stageSize.height;

  const left = cell.x * scaleX + (cell.w * scaleX) / 2;
  const top = (cell.y + cell.h) * scaleY;

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: '1px',
    height: '1px',
  };
});

function closeTextEditor(): void {
  editingIndex.value = null;
  activeTextId.value = null;
  selectedTextId.value = null;
}

function onTextUpdate(textId: string, updates: Partial<PageText>): void {
  if (editingIndex.value === null) return;
  emit('update:pageText', editingIndex.value, textId, updates);
}

function onTextAdd(): void {
  if (editingIndex.value === null) return;
  emit('add:pageText', editingIndex.value);
}

function onTextRemove(textId: string): void {
  if (editingIndex.value === null) return;
  emit('remove:pageText', editingIndex.value, textId);
}

function onTextSelect(textId: string): void {
  activeTextId.value = textId;
}

// ---------------------------------------------------------------------------
// Clear selection on mode change
// ---------------------------------------------------------------------------

watch(() => props.mode, () => {
  selectedIndex.value = null;
  hoverIndex.value = null;
  editingIndex.value = null;
  activeTextId.value = null;
  selectedTextId.value = null;
});

// ---------------------------------------------------------------------------
// Reactive image/font loading
// ---------------------------------------------------------------------------

watch(
  [() => props.photos, () => props.pageTexts],
  () => {
    const urls = props.photos.map(p => p.url);
    if (
      urls.length !== imageUrlsLoaded.value.length
      || !urls.every((u, i) => u === imageUrlsLoaded.value[i])
    ) {
      imageUrlsLoaded.value = [];
      ensureImagesLoaded();
    }

    if (props.pageTexts.flat().some(pt => pt.content)) {
      ensureFontsLoaded();
    }
  },
  { deep: true },
);

// ---------------------------------------------------------------------------
// Stage sizing (responsive via ResizeObserver)
// ---------------------------------------------------------------------------

let resizeObserver: ResizeObserver | null = null;

function updateStageSize(): void {
  const wrapper = stageWrapperEl.value;
  if (!wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.width * (210 / 297)); // A4 aspect ratio

  if (stageSize.width !== w || stageSize.height !== h) {
    stageSize.width = w;
    stageSize.height = h;
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(() => {
  updateStageSize();

  resizeObserver = new ResizeObserver(() => {
    updateStageSize();
  });
  if (stageWrapperEl.value) {
    resizeObserver.observe(stageWrapperEl.value);
  }

  // Initial image load
  if (props.photos.length > 0) {
    ensureImagesLoaded();
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;

  // Release loaded image references so the browser can GC them
  loadedImages.value = [];
  imageUrlsLoaded.value = [];

  // Reset cursor in case it was left in a non-default state
  const stage = stageRef.value?.getNode();
  const container = stage?.container();
  if (container) container.style.cursor = 'default';
});
</script>

<style scoped>
.fanzine-canvas-container {
  width: 100%;
}
</style>
