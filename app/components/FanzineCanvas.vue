<template>
  <div
    ref="containerEl"
    class="fanzine-canvas-container relative"
  >
    <canvas
      ref="canvasEl"
      class="w-full h-auto block"
      :style="{ aspectRatio: '297 / 210' }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    />

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
import type { PhotoItem, PageText } from '~/composables/usePhotoStore';
import type {
  CropTransform,
  InteractionState,
  CellRect,
  HitTestResult,
  RenderOptions,
} from '~/composables/useCanvasRenderer';
import {
  renderGrid,
  calcCellRects,
  hitTest,
  loadAllImages,
  preloadFonts,
  defaultCropTransform,
} from '~/composables/useCanvasRenderer';

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
const canvasEl = ref<HTMLCanvasElement | null>(null);

// Loaded images cache
const loadedImages = shallowRef<HTMLImageElement[]>([]);
const imageUrlsLoaded = ref<string[]>([]);

// Interaction state
const selectedIndex = ref<number | null>(null);
const hoverIndex = ref<number | null>(null);
const editingIndex = ref<number | null>(null);
const activeTextId = ref<string | null>(null);
const selectedTextId = ref<string | null>(null);

// Cached cell rects (updated after each render)
const cellRects = shallowRef<CellRect[]>([]);

// Drag state
const isDragging = ref(false);
const dragType = ref<'text' | 'pan' | null>(null);
const dragStartPointer = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const dragStartValue = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const dragCellIndex = ref<number>(-1);
const dragTextId = ref<string | null>(null);

// Animation frame handle
let rafId: number | null = null;

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

async function loadImages(): Promise<void> {
  const urls = props.photos.map(p => p.url);

  // Skip if same URLs already loaded
  if (
    urls.length === imageUrlsLoaded.value.length
    && urls.every((u, i) => u === imageUrlsLoaded.value[i])
  ) {
    return;
  }

  const images = await loadAllImages(props.photos);
  loadedImages.value = images;
  imageUrlsLoaded.value = urls;
}

// ---------------------------------------------------------------------------
// Canvas sizing (retina-aware via ResizeObserver)
// ---------------------------------------------------------------------------

let resizeObserver: ResizeObserver | null = null;

function updateCanvasSize(): void {
  const canvas = canvasEl.value;
  const container = containerEl.value;
  if (!canvas || !container) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.width * (210 / 297) * dpr); // A4 aspect ratio

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    scheduleRender();
  }
}

// ---------------------------------------------------------------------------
// Render scheduling
// ---------------------------------------------------------------------------

function scheduleRender(): void {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    render();
  });
}

async function render(): Promise<void> {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Ensure images are loaded
  await loadImages();

  // Pre-load fonts for text overlays
  if (props.pageTexts.flat().some(t => t.content)) {
    const tempCells = calcCellRects(canvas.width, canvas.height, props.gap);
    const sampleH = tempCells[0]?.h ?? 300;
    await preloadFonts(props.pageTexts, sampleH);
  }

  const interaction: InteractionState | null = props.readonly
    ? null
    : {
        selectedIndex: selectedIndex.value,
        hoverIndex: hoverIndex.value,
        selectedTextId: selectedTextId.value,
        editingIndex: editingIndex.value,
        mode: props.mode,
      };

  // Build crop transforms (fill with defaults if not provided)
  const crops: CropTransform[] = [];
  for (let i = 0; i < 8; i++) {
    crops.push(props.cropTransforms[i] ?? defaultCropTransform());
  }

  const renderOpts: RenderOptions = {
    photos: props.photos,
    images: loadedImages.value,
    layout: layout.LAYOUT,
    gap: props.gap,
    pageTexts: props.pageTexts,
    cropTransforms: crops,
    showGuides: props.showGuides,
    showLabels: props.showLabels,
    readonly: props.readonly,
    interaction,
    t,
  };

  cellRects.value = renderGrid(ctx, canvas.width, canvas.height, renderOpts);
}

// ---------------------------------------------------------------------------
// Pointer event helpers
// ---------------------------------------------------------------------------

/** Convert a pointer event to canvas-space coordinates. */
function toCanvasCoords(event: PointerEvent): { x: number; y: number } {
  const canvas = canvasEl.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function performHitTest(event: PointerEvent): HitTestResult {
  const canvas = canvasEl.value;
  if (!canvas) return { type: 'empty', cellIndex: -1, textId: null, cellX: 0, cellY: 0 };
  const ctx = canvas.getContext('2d');
  if (!ctx) return { type: 'empty', cellIndex: -1, textId: null, cellX: 0, cellY: 0 };

  const { x, y } = toCanvasCoords(event);
  return hitTest(x, y, cellRects.value, layout.LAYOUT, props.pageTexts, ctx);
}

// ---------------------------------------------------------------------------
// Pointer event handlers
// ---------------------------------------------------------------------------

function onPointerDown(event: PointerEvent): void {
  if (props.readonly) return;

  const hit = performHitTest(event);
  const { x, y } = toCanvasCoords(event);

  if (props.mode === 'reorder') {
    if (hit.type === 'cell' || hit.type === 'text') {
      if (selectedIndex.value === null) {
        selectedIndex.value = hit.cellIndex;
      } else if (selectedIndex.value === hit.cellIndex) {
        selectedIndex.value = null;
      } else {
        emit('reorder', selectedIndex.value, hit.cellIndex);
        selectedIndex.value = null;
      }
      scheduleRender();
    }
  }

  if (props.mode === 'text') {
    if (hit.type === 'text' && hit.textId) {
      // Start dragging text
      isDragging.value = true;
      dragType.value = 'text';
      dragCellIndex.value = hit.cellIndex;
      dragTextId.value = hit.textId;
      dragStartPointer.value = { x, y };

      // Find current text position
      const text = props.pageTexts[hit.cellIndex]?.find(t => t.id === hit.textId);
      if (text) {
        dragStartValue.value = { x: text.x, y: text.y };
      }

      selectedTextId.value = hit.textId;
      activeTextId.value = hit.textId;
      editingIndex.value = hit.cellIndex;

      // Capture pointer for smooth dragging
      canvasEl.value?.setPointerCapture(event.pointerId);

      scheduleRender();
    } else if (hit.type === 'cell') {
      // Open text editor for this cell
      if (editingIndex.value === hit.cellIndex) {
        closeTextEditor();
      } else {
        editingIndex.value = hit.cellIndex;
        const texts = props.pageTexts[hit.cellIndex] ?? [];
        activeTextId.value = texts.length > 0 ? texts[0]!.id : null;
        selectedTextId.value = null;
      }
      scheduleRender();
    }
  }
}

function onPointerMove(event: PointerEvent): void {
  if (props.readonly) return;

  const { x, y } = toCanvasCoords(event);

  if (isDragging.value && dragType.value === 'text') {
    // Dragging a text overlay
    const cell = cellRects.value[dragCellIndex.value];
    if (!cell) return;

    const slot = layout.LAYOUT[dragCellIndex.value];
    const rotated = slot?.rotated ?? false;

    let deltaX = x - dragStartPointer.value.x;
    let deltaY = y - dragStartPointer.value.y;

    // Invert for rotated cells
    if (rotated) {
      deltaX = -deltaX;
      deltaY = -deltaY;
    }

    const pctX = (deltaX / cell.w) * 100;
    const pctY = (deltaY / cell.h) * 100;

    const newX = Math.max(5, Math.min(95, dragStartValue.value.x + pctX));
    const newY = Math.max(5, Math.min(95, dragStartValue.value.y + pctY));

    if (dragTextId.value) {
      emit('update:pageText', dragCellIndex.value, dragTextId.value, { x: newX, y: newY });
    }
    return;
  }

  // Hover tracking for reorder mode
  if (props.mode === 'reorder' && selectedIndex.value !== null) {
    const hit = performHitTest(event);
    const newHover = (hit.type === 'cell' || hit.type === 'text') ? hit.cellIndex : null;
    if (newHover !== hoverIndex.value) {
      hoverIndex.value = newHover;
      scheduleRender();
    }
  }
}

function onPointerUp(event: PointerEvent): void {
  if (isDragging.value) {
    canvasEl.value?.releasePointerCapture(event.pointerId);
    isDragging.value = false;
    dragType.value = null;
    selectedTextId.value = null;
    scheduleRender();
  }
  hoverIndex.value = null;
}

function onWheel(event: WheelEvent): void {
  if (props.readonly) return;

  // Wheel-to-zoom on a cell (for pan+zoom feature)
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;

  const hit = hitTest(canvasX, canvasY, cellRects.value, layout.LAYOUT, props.pageTexts, ctx);
  if (hit.type === 'empty') return;

  const index = hit.cellIndex;
  const currentCrop = props.cropTransforms[index] ?? defaultCropTransform();

  // Zoom in/out with scroll
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(1, Math.min(5, currentCrop.scale + delta));

  if (newScale !== currentCrop.scale) {
    emit('update:cropTransform', index, {
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
  if (editingIndex.value === null || !canvasEl.value) return {};

  const canvas = canvasEl.value;
  const displayRect = canvas.getBoundingClientRect();
  const cell = cellRects.value[editingIndex.value];
  if (!cell) return {};

  // Convert from canvas coords to display coords
  const scaleX = displayRect.width / canvas.width;
  const scaleY = displayRect.height / canvas.height;

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
  scheduleRender();
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
  scheduleRender();
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
  scheduleRender();
});

// ---------------------------------------------------------------------------
// Reactive re-render triggers
// ---------------------------------------------------------------------------

// Re-render when any prop changes
watch(
  [
    () => props.photos,
    () => props.pageTexts,
    () => props.gap,
    () => props.showGuides,
    () => props.showLabels,
    () => props.readonly,
    () => props.cropTransforms,
  ],
  () => {
    // If photos changed, force image reload
    const urls = props.photos.map(p => p.url);
    if (
      urls.length !== imageUrlsLoaded.value.length
      || !urls.every((u, i) => u === imageUrlsLoaded.value[i])
    ) {
      imageUrlsLoaded.value = []; // Force reload
    }
    scheduleRender();
  },
  { deep: true },
);

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(() => {
  updateCanvasSize();

  resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
  });
  if (containerEl.value) {
    resizeObserver.observe(containerEl.value);
  }

  scheduleRender();
});

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<style scoped>
.fanzine-canvas-container {
  width: 100%;
}
</style>
