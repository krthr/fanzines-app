<template>
  <div ref="containerRef" class="w-full">
    <ClientOnly>
      <template #fallback>
        <div
          class="w-full bg-zinc-200 dark:bg-zinc-800 animate-pulse"
          :style="{ aspectRatio: '297 / 210' }"
        />
      </template>

      <v-stage
        ref="stageRef"
        :config="stageConfig"
        @click="onStageClick"
        @mouseenter="onStageMouseEnter"
        @mouseleave="onStageMouseLeave"
      >
        <!-- Main content layer -->
        <v-layer ref="contentLayerRef">
          <!-- Black background (visible in gaps) -->
          <v-rect :config="bgConfig" />

          <!-- Cells -->
          <template v-for="cell in cells" :key="cell.gridIndex">
            <v-group :config="{ x: cell.x, y: cell.y }">
              <!-- Cell clip group -->
              <v-group
                :config="{
                  clipX: 0,
                  clipY: 0,
                  clipWidth: cell.width,
                  clipHeight: cell.height,
                }"
              >
                <!-- Rotation group (180deg for top-row cells) -->
                <v-group
                  :config="cell.isRotated
                    ? { x: cell.width / 2, y: cell.height / 2, rotation: 180, offsetX: cell.width / 2, offsetY: cell.height / 2 }
                    : {}
                  "
                >
                  <!-- Photo image -->
                  <v-image
                    v-if="loadedImages[cell.gridIndex]"
                    :config="getImageConfig(cell)"
                  />

                  <!-- Empty cell placeholder -->
                  <v-rect
                    v-else
                    :config="{
                      width: cell.width,
                      height: cell.height,
                      fill: '#27272a',
                    }"
                  />

                  <!-- Text overlays -->
                  <template v-for="pageText in (pageTexts[cell.gridIndex] ?? [])" :key="pageText.id">
                    <v-group
                      v-if="pageText.content"
                      :config="getTextGroupConfig(pageText, cell)"
                      :draggable="mode === 'text' && !readonly"
                      @click="onTextClick($event, cell.gridIndex, pageText.id)"
                      @dblclick="onTextDblClick($event, cell.gridIndex, pageText)"
                      @dragend="onTextDragEnd($event, cell)"
                      @dragstart="onTextDragStart($event, cell.gridIndex, pageText.id)"
                      @mouseenter="setCursor('move')"
                      @mouseleave="setCursor('default')"
                    >
                      <!-- Background pill -->
                      <v-rect
                        v-if="pageText.showBg"
                        :config="getTextBgConfig(pageText, cell)"
                      />
                      <!-- Text node -->
                      <v-text :config="getTextConfig(pageText, cell)" />
                    </v-group>
                  </template>
                </v-group>
              </v-group>

              <!-- Selection highlight (reorder mode) -->
              <v-rect
                v-if="mode === 'reorder' && selectedIndex === cell.gridIndex && !readonly"
                :config="{
                  width: cell.width,
                  height: cell.height,
                  stroke: '#e11d48',
                  strokeWidth: 3,
                  dash: [],
                  listening: false,
                }"
              />

              <!-- Hover overlay (reorder mode, when another cell is selected) -->
              <v-rect
                v-if="mode === 'reorder' && selectedIndex !== null && selectedIndex !== cell.gridIndex && hoveredIndex === cell.gridIndex && !readonly"
                :config="{
                  width: cell.width,
                  height: cell.height,
                  fill: 'rgba(0, 0, 0, 0.3)',
                  listening: false,
                }"
              />

              <!-- Selection overlay (reorder mode) -->
              <v-rect
                v-if="mode === 'reorder' && selectedIndex === cell.gridIndex && !readonly"
                :config="{
                  width: cell.width,
                  height: cell.height,
                  fill: 'rgba(225, 29, 72, 0.15)',
                  listening: false,
                }"
              />

              <!-- Clickable overlay for cell interactions -->
              <v-rect
                :config="{
                  width: cell.width,
                  height: cell.height,
                  fill: 'transparent',
                  listening: !readonly,
                }"
                @click="onCellClick(cell.gridIndex)"
                @mouseenter="onCellMouseEnter(cell.gridIndex)"
                @mouseleave="onCellMouseLeave(cell.gridIndex)"
              />

              <!-- Swap badge (reorder mode, on selected cell) -->
              <v-group
                v-if="mode === 'reorder' && selectedIndex === cell.gridIndex && !readonly"
                :config="{ x: cell.width / 2, y: cell.height / 2, listening: false }"
              >
                <v-rect
                  :config="{
                    x: -30,
                    y: -12,
                    width: 60,
                    height: 24,
                    fill: '#e11d48',
                    cornerRadius: 4,
                  }"
                />
                <v-text
                  :config="{
                    x: -30,
                    y: -12,
                    width: 60,
                    height: 24,
                    text: t('grid.swap'),
                    fontSize: 12,
                    fontFamily: 'sans-serif',
                    fontStyle: 'bold',
                    fill: '#ffffff',
                    align: 'center',
                    verticalAlign: 'middle',
                  }"
                />
              </v-group>

              <!-- "Place here" badge (reorder mode, on hover target) -->
              <v-group
                v-if="mode === 'reorder' && selectedIndex !== null && selectedIndex !== cell.gridIndex && hoveredIndex === cell.gridIndex && !readonly"
                :config="{ x: cell.width / 2, y: cell.height / 2, listening: false }"
              >
                <v-rect
                  :config="{
                    x: -45,
                    y: -12,
                    width: 90,
                    height: 24,
                    fill: 'rgba(0, 0, 0, 0.7)',
                    cornerRadius: 4,
                  }"
                />
                <v-text
                  :config="{
                    x: -45,
                    y: -12,
                    width: 90,
                    height: 24,
                    text: t('grid.placeHere'),
                    fontSize: 11,
                    fontFamily: 'sans-serif',
                    fill: '#ffffff',
                    align: 'center',
                    verticalAlign: 'middle',
                  }"
                />
              </v-group>

              <!-- Page label -->
              <v-group
                v-if="showLabels"
                :config="{ x: cell.width / 2, y: cell.height / 2, listening: false }"
              >
                <v-rect
                  :config="{
                    x: -50,
                    y: -14,
                    width: 100,
                    height: 28,
                    fill: cell.isRotated ? 'rgba(245, 158, 11, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    cornerRadius: 4,
                  }"
                />
                <v-text
                  :config="{
                    x: -50,
                    y: -14,
                    width: 100,
                    height: 28,
                    text: t(cell.labelKey) + (cell.isRotated ? ' (180\u00B0)' : ''),
                    fontSize: 10,
                    fontFamily: 'sans-serif',
                    fontStyle: 'bold',
                    fill: cell.isRotated ? '#78350f' : '#18181b',
                    align: 'center',
                    verticalAlign: 'middle',
                  }"
                />
              </v-group>

              <!-- Cell number (when labels not shown and not in text mode) -->
              <v-group
                v-if="!showLabels && mode !== 'text'"
                :config="{ x: 0, y: cell.height - 20, listening: false }"
              >
                <v-rect
                  :config="{
                    width: cell.width,
                    height: 20,
                    fillLinearGradientStartPoint: { x: 0, y: 0 },
                    fillLinearGradientEndPoint: { x: 0, y: 20 },
                    fillLinearGradientColorStops: [0, 'rgba(0,0,0,0)', 0.4, 'rgba(0,0,0,0.5)', 1, 'rgba(0,0,0,0.7)'],
                  }"
                />
                <v-text
                  :config="{
                    width: cell.width,
                    height: 20,
                    text: String(cell.gridIndex + 1),
                    fontSize: 11,
                    fontFamily: 'sans-serif',
                    fontStyle: 'bold',
                    fill: '#ffffff',
                    align: 'center',
                    verticalAlign: 'middle',
                    opacity: 0.8,
                  }"
                />
              </v-group>
            </v-group>
          </template>
        </v-layer>

        <!-- Guides layer -->
        <v-layer v-if="showGuides" ref="guidesLayerRef" :config="{ listening: false }">
          <!-- Fold lines (dashed) -->
          <v-line
            v-for="(line, i) in guides.foldLines"
            :key="'fold-' + i"
            :config="{
              points: line.points,
              stroke: 'rgba(255, 255, 255, 0.6)',
              strokeWidth: 1,
              dash: [6, 4],
            }"
          />

          <!-- Cut line (solid red) -->
          <v-line
            :config="{
              points: guides.cutLine.points,
              stroke: '#f87171',
              strokeWidth: 2,
            }"
          />

          <!-- Scissors X at cut start -->
          <v-line
            :config="{
              points: [
                guides.scissorsPos.x - 4, guides.scissorsPos.y - 4,
                guides.scissorsPos.x + 4, guides.scissorsPos.y + 4,
              ],
              stroke: '#f87171',
              strokeWidth: 1.5,
            }"
          />
          <v-line
            :config="{
              points: [
                guides.scissorsPos.x - 4, guides.scissorsPos.y + 4,
                guides.scissorsPos.x + 4, guides.scissorsPos.y - 4,
              ],
              stroke: '#f87171',
              strokeWidth: 1.5,
            }"
          />

          <!-- Fold label -->
          <v-text
            :config="{
              x: 4,
              y: guides.foldLines[0]!.points[1]! - 14,
              text: t('guides.fold'),
              fontSize: 10,
              fontFamily: 'sans-serif',
              fill: 'rgba(255, 255, 255, 0.6)',
            }"
          />

          <!-- Cut label -->
          <v-text
            :config="{
              x: guides.scissorsPos.x + 8,
              y: guides.scissorsPos.y - 14,
              text: t('guides.cut'),
              fontSize: 10,
              fontFamily: 'sans-serif',
              fontStyle: 'bold',
              fill: '#f87171',
            }"
          />
        </v-layer>
      </v-stage>

      <!-- HTML textarea overlay for inline text editing -->
      <textarea
        v-if="editingTextarea"
        ref="textareaRef"
        :value="editingTextarea.content"
        :style="editingTextarea.style"
        class="fixed z-50 resize-none border-2 border-primary bg-transparent outline-none p-0"
        :maxlength="60"
        @input="onTextareaInput"
        @blur="commitTextEdit"
        @keydown.enter.prevent="commitTextEdit"
        @keydown.escape.prevent="cancelTextEdit"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { PhotoItem, PageText, TextSize } from '~/composables/usePhotoStore';
import type { CellRect } from '~/composables/useKonvaGrid';

// ---------------------------------------------------------------------------
// Props & Emits
// ---------------------------------------------------------------------------

interface ZineCanvasProps {
  photos: PhotoItem[];
  pageTexts: PageText[][];
  gap: number;
  readonly?: boolean;
  showLabels?: boolean;
  showGuides?: boolean;
  mode?: 'reorder' | 'text';
}

const props = withDefaults(defineProps<ZineCanvasProps>(), {
  readonly: false,
  showLabels: false,
  showGuides: false,
  mode: 'reorder',
});

const emit = defineEmits<{
  reorder: [fromIndex: number, toIndex: number];
  'update:pageText': [pageIndex: number, textId: string, updates: Partial<PageText>];
  'add:pageText': [pageIndex: number];
  'remove:pageText': [pageIndex: number, textId: string];
  'select:text': [pageIndex: number, textId: string | null];
}>();

// ---------------------------------------------------------------------------
// Composables & Refs
// ---------------------------------------------------------------------------

const { t } = useI18n();
const {
  computeCells,
  computeGuides,
  getCoverCrop,
  getTextFontSize,
  getFontFamily,
  getTextFillColor,
  percentToPixel,
  pixelToPercent,
  computeStageDimensions,
} = useKonvaGrid();

const containerRef = ref<HTMLDivElement>();
const stageRef = ref<InstanceType<any>>();
const contentLayerRef = ref<InstanceType<any>>();
const guidesLayerRef = ref<InstanceType<any>>();
const textareaRef = ref<HTMLTextAreaElement>();

// ---------------------------------------------------------------------------
// Responsive Stage Sizing
// ---------------------------------------------------------------------------

const containerWidth = ref(800);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(containerRef.value);
  }

  // Ensure fonts are loaded, then redraw
  document.fonts.ready.then(() => {
    contentLayerRef.value?.getNode()?.batchDraw();
  });
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

const stageDimensions = computed(() => computeStageDimensions(containerWidth.value));

const stageConfig = computed(() => ({
  width: stageDimensions.value.width,
  height: stageDimensions.value.height,
}));

const bgConfig = computed(() => ({
  width: stageDimensions.value.width,
  height: stageDimensions.value.height,
  fill: '#000000',
  listening: false,
}));

// ---------------------------------------------------------------------------
// Grid Cells & Guides
// ---------------------------------------------------------------------------

const cells = computed(() =>
  computeCells(stageDimensions.value.width, stageDimensions.value.height, props.gap),
);

const guides = computed(() =>
  computeGuides(stageDimensions.value.width, stageDimensions.value.height, props.gap),
);

// ---------------------------------------------------------------------------
// Image Loading
// ---------------------------------------------------------------------------

const loadedImages = ref<Record<number, HTMLImageElement | null>>({});

// Watch photos and load/unload images
watch(
  () => props.photos,
  (newPhotos) => {
    const newLoaded: Record<number, HTMLImageElement | null> = {};
    newPhotos.forEach((photo, i) => {
      if (loadedImages.value[i] && loadedImages.value[i]?.src === photo.url) {
        // Reuse already loaded image
        newLoaded[i] = loadedImages.value[i]!;
      } else {
        // Load new image
        newLoaded[i] = null;
        const img = new Image();
        const index = i;
        img.onload = () => {
          loadedImages.value = { ...loadedImages.value, [index]: img };
        };
        img.onerror = () => {
          console.warn(`[ZineCanvas] Failed to load image at index ${index}`);
        };
        img.src = photo.url;
      }
    });
    loadedImages.value = newLoaded;
  },
  { immediate: true, deep: false },
);

function getImageConfig(cell: CellRect) {
  const img = loadedImages.value[cell.gridIndex];
  if (!img) return {};

  const crop = getCoverCrop(img.naturalWidth, img.naturalHeight, cell.width, cell.height);

  return {
    image: img,
    width: cell.width,
    height: cell.height,
    crop,
    listening: false,
  };
}

// ---------------------------------------------------------------------------
// Text Overlay Configs
// ---------------------------------------------------------------------------

function getTextGroupConfig(pageText: PageText, cell: CellRect) {
  const x = percentToPixel(pageText.x, cell.width);
  const y = percentToPixel(pageText.y, cell.height);

  // Clamp drag within cell bounds (5-95% range).
  // In the rotated group, local coordinates are in rotated space,
  // so we constrain relative to the group's local bounds (0 to cell size).
  const margin = cell.width * 0.05;
  const marginY = cell.height * 0.05;

  return {
    x,
    y,
    name: `text-${pageText.id}`,
    dragBoundFunc: (pos: { x: number; y: number }) => {
      // dragBoundFunc receives absolute stage coordinates.
      // The text is inside nested groups: cell group (x: cell.x, y: cell.y)
      //   -> clip group -> rotation group -> text group
      // For the rotation group in rotated cells, Konva maps coordinates
      // through the transform. We constrain in absolute space.
      const absMinX = cell.x + margin;
      const absMaxX = cell.x + cell.width - margin;
      const absMinY = cell.y + marginY;
      const absMaxY = cell.y + cell.height - marginY;

      return {
        x: Math.max(absMinX, Math.min(absMaxX, pos.x)),
        y: Math.max(absMinY, Math.min(absMaxY, pos.y)),
      };
    },
  };
}

function getTextConfig(pageText: PageText, cell: CellRect) {
  const fontSize = getTextFontSize(pageText.size, cell.height);
  const fontFamily = getFontFamily(pageText.font);
  const fill = getTextFillColor(pageText.color);
  const fontStyle = fontSize >= 16 ? 'bold' : 'normal';
  const isLightText = pageText.color !== 'black';

  // Estimate text width for centering via offsetX
  const charWidth = fontSize * 0.6;
  const estimatedWidth = Math.min(pageText.content.length * charWidth, cell.width * 0.9);
  const textWidth = Math.max(estimatedWidth, fontSize); // minimum one char width

  return {
    text: pageText.content,
    fontSize,
    fontFamily,
    fontStyle,
    fill,
    align: 'center' as const,
    width: textWidth,
    offsetX: textWidth / 2,
    offsetY: fontSize / 2,
    shadowColor: isLightText ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.6)',
    shadowBlur: 3,
    shadowOffsetY: 1,
    listening: false,
  };
}

function getTextBgConfig(pageText: PageText, cell: CellRect) {
  const fontSize = getTextFontSize(pageText.size, cell.height);
  const padding = fontSize * 0.5;
  const isLightText = pageText.color !== 'black';

  // Estimate text width (approximate -- Konva will render it more precisely)
  const charWidth = fontSize * 0.6;
  const textWidth = Math.min(pageText.content.length * charWidth, cell.width * 0.9);
  const bgWidth = textWidth + padding * 2;
  const bgHeight = fontSize + padding * 2;

  return {
    x: -bgWidth / 2,
    y: -(bgHeight / 2),
    width: bgWidth,
    height: bgHeight,
    fill: isLightText ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.55)',
    cornerRadius: 4,
    listening: false,
  };
}

// ---------------------------------------------------------------------------
// Interaction State
// ---------------------------------------------------------------------------

const selectedIndex = ref<number | null>(null);
const hoveredIndex = ref<number | null>(null);
const selectedTextInfo = ref<{ pageIndex: number; textId: string } | null>(null);

// Editing state for inline textarea
const editingTextarea = ref<{
  pageIndex: number;
  textId: string;
  content: string;
  style: Record<string, string>;
} | null>(null);

// Reset interaction state when mode changes
watch(() => props.mode, () => {
  selectedIndex.value = null;
  hoveredIndex.value = null;
  selectedTextInfo.value = null;
  cancelTextEdit();
});

// ---------------------------------------------------------------------------
// Reorder Mode Handlers
// ---------------------------------------------------------------------------

function onCellClick(gridIndex: number) {
  if (props.readonly) return;

  if (props.mode === 'reorder') {
    if (selectedIndex.value === null) {
      // First click: select
      selectedIndex.value = gridIndex;
    } else if (selectedIndex.value === gridIndex) {
      // Click same cell: deselect
      selectedIndex.value = null;
    } else {
      // Click different cell: swap
      emit('reorder', selectedIndex.value, gridIndex);
      selectedIndex.value = null;
    }
  } else if (props.mode === 'text') {
    // In text mode, clicking empty area of a cell can add text
    const existingTexts = props.pageTexts[gridIndex] ?? [];
    if (existingTexts.length === 0) {
      emit('add:pageText', gridIndex);
    }
  }
}

function onCellMouseEnter(gridIndex: number) {
  if (props.readonly) return;
  hoveredIndex.value = gridIndex;

  if (props.mode === 'reorder') {
    if (selectedIndex.value !== null && selectedIndex.value !== gridIndex) {
      setCursor('pointer');
    } else {
      setCursor('pointer');
    }
  }
}

function onCellMouseLeave(_gridIndex: number) {
  hoveredIndex.value = null;
  setCursor('default');
}

// ---------------------------------------------------------------------------
// Text Mode Handlers
// ---------------------------------------------------------------------------

function onTextClick(e: KonvaEventObject<MouseEvent>, pageIndex: number, textId: string) {
  if (props.readonly || props.mode !== 'text') return;
  e.cancelBubble = true;

  selectedTextInfo.value = { pageIndex, textId };
  emit('select:text', pageIndex, textId);
}

function onTextDblClick(
  e: KonvaEventObject<MouseEvent>,
  pageIndex: number,
  pageText: PageText,
) {
  if (props.readonly || props.mode !== 'text') return;
  e.cancelBubble = true;

  startTextEdit(pageIndex, pageText);
}

function onTextDragStart(
  e: KonvaEventObject<DragEvent>,
  pageIndex: number,
  textId: string,
) {
  if (props.readonly || props.mode !== 'text') {
    // Prevent drag in wrong mode
    e.target.stopDrag();
    return;
  }
  selectedTextInfo.value = { pageIndex, textId };
  emit('select:text', pageIndex, textId);
}

function onTextDragEnd(e: KonvaEventObject<DragEvent>, cell: CellRect) {
  if (!selectedTextInfo.value) return;

  const node = e.target;
  let localX = node.x();
  let localY = node.y();

  // In rotated cells (180deg), the local coordinate system is inverted.
  // Convert back from rotated local space to normal percentage space.
  if (cell.isRotated) {
    localX = cell.width - localX;
    localY = cell.height - localY;
  }

  // Convert back to percentage
  const xPercent = pixelToPercent(localX, cell.width);
  const yPercent = pixelToPercent(localY, cell.height);

  emit('update:pageText', selectedTextInfo.value.pageIndex, selectedTextInfo.value.textId, {
    x: xPercent,
    y: yPercent,
  });
}

// ---------------------------------------------------------------------------
// Inline Text Editing (HTML textarea overlay)
// ---------------------------------------------------------------------------

function startTextEdit(pageIndex: number, pageText: PageText) {
  const stage = stageRef.value?.getNode() as KonvaStage | undefined;
  if (!stage) return;

  const container = stage.container();
  const containerRect = container.getBoundingClientRect();
  const cell = cells.value[pageIndex];
  if (!cell) return;

  // Compute text position in screen coordinates
  const scaleX = containerRect.width / stage.width();
  const scaleY = containerRect.height / stage.height();

  const textX = cell.x + percentToPixel(pageText.x, cell.width);
  const textY = cell.y + percentToPixel(pageText.y, cell.height);

  const screenX = containerRect.left + textX * scaleX;
  const screenY = containerRect.top + textY * scaleY;

  const fontSize = getTextFontSize(pageText.size, cell.height) * scaleY;
  const fontFamily = getFontFamily(pageText.font);
  const fill = getTextFillColor(pageText.color);

  const textareaWidth = Math.min(cell.width * scaleX * 0.9, 300);

  editingTextarea.value = {
    pageIndex,
    textId: pageText.id,
    content: pageText.content,
    style: {
      left: `${screenX - textareaWidth / 2}px`,
      top: `${screenY - fontSize}px`,
      width: `${textareaWidth}px`,
      fontSize: `${fontSize}px`,
      fontFamily,
      color: fill,
      textAlign: 'center',
      lineHeight: '1.2',
      transform: cell.isRotated ? 'rotate(180deg)' : 'none',
    },
  };

  nextTick(() => {
    textareaRef.value?.focus();
    textareaRef.value?.select();
  });
}

function onTextareaInput(e: Event) {
  if (!editingTextarea.value) return;
  editingTextarea.value.content = (e.target as HTMLTextAreaElement).value;
}

function commitTextEdit() {
  if (!editingTextarea.value) return;

  const { pageIndex, textId, content } = editingTextarea.value;
  emit('update:pageText', pageIndex, textId, { content });
  editingTextarea.value = null;
}

function cancelTextEdit() {
  editingTextarea.value = null;
}

// ---------------------------------------------------------------------------
// Stage-level Events
// ---------------------------------------------------------------------------

function onStageClick(e: KonvaEventObject<MouseEvent>) {
  // If clicked on empty stage area (not on a shape), deselect
  if (e.target === e.target.getStage()) {
    selectedIndex.value = null;
    selectedTextInfo.value = null;
    emit('select:text', -1, null);
  }
}

function onStageMouseEnter() {
  if (props.readonly) return;
  if (props.mode === 'reorder') setCursor('pointer');
}

function onStageMouseLeave() {
  hoveredIndex.value = null;
  setCursor('default');
}

// ---------------------------------------------------------------------------
// Cursor Helper
// ---------------------------------------------------------------------------

function setCursor(cursor: string) {
  const stage = stageRef.value?.getNode() as KonvaStage | undefined;
  if (stage) {
    stage.container().style.cursor = cursor;
  }
}

// ---------------------------------------------------------------------------
// Expose Stage for Export
// ---------------------------------------------------------------------------

function getStageNode(): KonvaStage | null {
  return stageRef.value?.getNode() ?? null;
}

function getContentLayerNode() {
  return contentLayerRef.value?.getNode() ?? null;
}

function getGuidesLayerNode() {
  return guidesLayerRef.value?.getNode() ?? null;
}

defineExpose({
  getStageNode,
  getContentLayerNode,
  getGuidesLayerNode,
});
</script>
