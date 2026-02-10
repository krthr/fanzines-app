<template>
  <div
    ref="gridEl"
    class="fanzine-grid relative"
  >
    <div
      v-for="(photo, index) in photos"
      :key="photo.id"
      :ref="el => setCellRef(index, el as HTMLElement | null)"
      class="fanzine-cell relative overflow-hidden"
      :class="{
        'cursor-pointer': !readonly,
        'ring-3 ring-primary ring-inset z-10': mode === 'reorder' && selectedIndex === index,
        'ring-3 ring-blue-500 ring-inset z-10': mode === 'text' && editingIndex === index,
        'hover:brightness-105': !readonly && selectedIndex !== index,
      }"
    >
      <!-- Clickable area for reorder mode -->
      <div
        v-if="mode === 'reorder'"
        class="absolute inset-0 z-[5]"
        @click="onCellClick(index)"
      />

      <img
        :src="photo.url"
        :alt="$t('grid.photoAlt', { n: index + 1 })"
        class="w-full h-full object-cover select-none pointer-events-none transition-transform duration-200"
      >

      <!-- Text overlays (renders in all modes when content exists) -->
      <div
        v-for="text in pageTexts[index]"
        :key="text.id"
        class="absolute z-[2] px-1 sm:px-2"
        :class="[
          layout.isRotated(index) ? 'rotate-180' : '',
          mode === 'text' && !readonly ? 'pointer-events-auto cursor-grab' : 'pointer-events-none',
          isDragging && drag?.textId === text.id ? 'cursor-grabbing' : '',
        ]"
        :style="{
          left: text.x + '%',
          top: text.y + '%',
          transform: 'translate(-50%, -50%)' + (layout.isRotated(index) ? ' rotate(180deg)' : ''),
        }"
        @pointerdown.stop="mode === 'text' && !readonly && onTextDragStart($event, index, text)"
        @pointermove="onTextDragMove($event, index)"
        @pointerup="onTextDragEnd()"
      >
        <div
          v-if="text.content"
          class="w-max max-w-full py-0.5 sm:py-1 px-1.5 sm:px-3 text-center leading-tight break-words rounded-sm"
          :class="[
            textSizeClass(text.size),
            textColorClass(text.color),
            textFontClass(text.font),
            text.showBg ? textBgClass(text.color) : '',
          ]"
          :style="textShadowStyle(text.color)"
        >
          {{ text.content }}
        </div>
      </div>

      <!-- Page label overlay -->
      <div
        v-if="showLabels"
        class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      >
        <div
          class="px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold leading-tight text-center"
          :class="layout.isRotated(index)
            ? 'bg-amber-500/85 text-white rotate-180'
            : 'bg-white/85 text-zinc-900'"
        >
          {{ $t(layout.getPageLabelKey(index)) }}
        </div>
        <!-- Rotation indicator for top-row cells -->
        <UIcon
          v-if="layout.isRotated(index)"
          name="i-lucide-rotate-cw"
          class="size-3 sm:size-3.5 text-amber-300 mt-1 rotate-180"
        />
      </div>

      <!-- Number overlay (hidden when labels are visible) -->
      <div
        v-if="!showLabels && mode !== 'text'"
        class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs text-center py-1 font-medium pointer-events-none"
        :class="{ 'opacity-0': selectedIndex === index }"
      >
        {{ index + 1 }}
      </div>

      <!-- Swap badge (reorder mode only) -->
      <div
        v-if="mode === 'reorder' && selectedIndex === index && !readonly"
        class="absolute inset-0 flex items-center justify-center bg-primary/20 pointer-events-none"
      >
        <UBadge :label="$t('grid.swap')" size="md" color="primary" variant="solid" class="shadow-lg" />
      </div>
      <!-- Target hint when one is selected (reorder mode only) -->
      <div
        v-if="mode === 'reorder' && selectedIndex !== null && selectedIndex !== index && !readonly"
        class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 z-[6]"
        @click="onCellClick(index)"
      >
        <UBadge :label="$t('grid.placeHere')" size="sm" color="neutral" variant="solid" />
      </div>

      <!-- Text edit button (text mode only) -->
      <UPopover
        v-if="mode === 'text' && !readonly"
        :open="editingIndex === index"
        :content="{ side: 'bottom', align: 'center', sideOffset: 4 }"
        @update:open="(val: boolean) => onPopoverToggle(index, val)"
      >
        <button
          class="absolute inset-0 z-[1] flex items-center justify-center transition-opacity"
          :class="editingIndex === index ? 'bg-blue-500/15' : 'opacity-0 hover:opacity-100 bg-black/30'"
          @click.stop="onTextCellClick(index)"
        >
          <UBadge
            :label="(pageTexts[index]?.length ?? 0) > 0 ? $t('text.edit') : $t('text.add')"
            size="sm"
            color="info"
            variant="solid"
            class="shadow-lg"
          />
        </button>

        <template #content>
          <PageTextEditor
            :texts="pageTexts[index] ?? []"
            :active-text-id="activeTextId"
            :max-texts="MAX_TEXTS_PER_PAGE"
            :label-key="layout.getPageLabelKey(index)"
            :page-role="layout.getSlot(index)?.role ?? ''"
            @update:text="(textId, updates) => emit('update:pageText', index, textId, updates)"
            @add:text="emit('add:pageText', index)"
            @remove:text="(textId) => emit('remove:pageText', index, textId)"
            @select:text="(textId) => activeTextId = textId"
          />
        </template>
      </UPopover>
    </div>

    <!-- Fold guide overlay (positioned over the entire grid) -->
    <div
      v-if="showGuides"
      class="fold-guides absolute inset-0 pointer-events-none z-20"
    >
      <!-- Horizontal center fold line -->
      <div class="absolute left-0 right-0 top-1/2 -translate-y-px h-0 border-t-2 border-dashed border-white/70" />

      <!-- Vertical fold line at 1/4 -->
      <div class="absolute top-0 bottom-0 left-1/4 -translate-x-px w-0 border-l-2 border-dashed border-white/50" />

      <!-- Vertical fold line at 3/4 -->
      <div class="absolute top-0 bottom-0 left-3/4 -translate-x-px w-0 border-l-2 border-dashed border-white/50" />

      <!-- Center fold line at 1/2 (the one you fold along first) -->
      <div class="absolute top-0 bottom-0 left-1/2 -translate-x-px w-0 border-l-2 border-dashed border-white/50" />

      <!-- Cut line: horizontal center, middle half only (between col 1-2 and col 2-3) -->
      <div class="absolute top-1/2 left-1/4 w-1/2 -translate-y-px flex items-center">
        <div class="w-full h-0 border-t-2 border-solid border-red-400/90" />
      </div>

      <!-- Scissors icon at the start of the cut line -->
      <div class="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 bg-red-500/90 rounded-full p-0.5 sm:p-1">
        <UIcon name="i-lucide-scissors" class="size-2.5 sm:size-3.5 text-white" />
      </div>

      <!-- Fold labels -->
      <div class="absolute top-1 left-1/2 -translate-x-1/2">
        <span class="text-[8px] sm:text-[10px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
          {{ $t('guides.fold') }}
        </span>
      </div>
      <div class="absolute left-1 top-1/2 -translate-y-1/2">
        <span class="text-[8px] sm:text-[10px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
          {{ $t('guides.fold') }}
        </span>
      </div>
      <div class="absolute right-1 top-1/2 -translate-y-1/2">
        <span class="text-[8px] sm:text-[10px] font-medium text-red-300 bg-black/40 px-1.5 py-0.5 rounded">
          {{ $t('guides.cut') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PhotoItem, PageText, TextSize, TextColor, TextFont } from '~/composables/usePhotoStore';
import { useDragText } from '~/composables/useDragText';

const MAX_TEXTS_PER_PAGE = 3;

interface FanzineGridProps {
  photos: PhotoItem[];
  pageTexts: PageText[][];
  gap?: number;
  readonly?: boolean;
  showLabels?: boolean;
  showGuides?: boolean;
  mode?: 'reorder' | 'text';
}

const props = withDefaults(defineProps<FanzineGridProps>(), {
  gap: 0,
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
}>();

const layout = useFanzineLayout();

// Gap applied via CSS custom property to bypass VDOM diffing
const gridEl = ref<HTMLElement | null>(null);

watch(() => props.gap, (val) => {
  gridEl.value?.style.setProperty('--grid-gap', `${val}px`);
}, { immediate: true });

// Click-to-swap state (reorder mode)
const selectedIndex = ref<number | null>(null);

// Text editing state (text mode)
const editingIndex = ref<number | null>(null);
const activeTextId = ref<string | null>(null);

// Cell element refs for drag calculations
const cellRefs = new Map<number, HTMLElement>();

function setCellRef(index: number, el: HTMLElement | null): void {
  if (el) cellRefs.set(index, el);
  else cellRefs.delete(index);
}

// Drag composable
const { drag, isDragging, startDrag, onPointerMove, endDrag } = useDragText(
  (index: number) => layout.isRotated(index),
);

function onTextDragStart(event: PointerEvent, pageIndex: number, text: PageText): void {
  startDrag(event, pageIndex, text.id, text.x, text.y);
}

function onTextDragMove(event: PointerEvent, pageIndex: number): void {
  const cellEl = cellRefs.get(pageIndex);
  if (!cellEl) return;
  const result = onPointerMove(event, cellEl.getBoundingClientRect());
  if (result) {
    emit('update:pageText', result.pageIndex, result.textId, { x: result.x, y: result.y });
  }
}

function onTextDragEnd(): void {
  const result = endDrag();
  if (result) {
    // Signal parent to persist after drag
    emit('update:pageText', result.pageIndex, result.textId, {});
  }
}

// Clear selection when mode changes
watch(() => props.mode, () => {
  selectedIndex.value = null;
  editingIndex.value = null;
  activeTextId.value = null;
});

function onCellClick(index: number): void {
  if (props.readonly || props.mode !== 'reorder') return;

  if (selectedIndex.value === null) {
    selectedIndex.value = index;
  }
  else if (selectedIndex.value === index) {
    selectedIndex.value = null;
  }
  else {
    emit('reorder', selectedIndex.value, index);
    selectedIndex.value = null;
  }
}

function onTextCellClick(index: number): void {
  if (props.readonly || props.mode !== 'text') return;
  if (editingIndex.value === index) {
    editingIndex.value = null;
    activeTextId.value = null;
  } else {
    editingIndex.value = index;
    // Select first text if any, otherwise null
    const texts = props.pageTexts[index] ?? [];
    activeTextId.value = texts.length > 0 ? texts[0]!.id : null;
  }
}

function onPopoverToggle(index: number, open: boolean): void {
  if (!open && editingIndex.value === index) {
    editingIndex.value = null;
    activeTextId.value = null;
  }
}

// Text style helpers
function textSizeClass(size: TextSize): string {
  switch (size) {
    case 'sm': return 'text-[8px] sm:text-[10px] font-medium';
    case 'md': return 'text-[10px] sm:text-xs font-semibold';
    case 'lg': return 'text-xs sm:text-sm font-bold';
    case 'xl': return 'text-sm sm:text-base font-bold';
  }
}

function textColorClass(color: TextColor): string {
  switch (color) {
    case 'white': return 'text-white';
    case 'black': return 'text-zinc-900';
    case 'rose': return 'text-fuchsia-500';
  }
}

function textFontClass(font: TextFont): string {
  switch (font) {
    case 'sans': return 'font-sans';
    case 'serif': return 'font-serif';
    case 'mono': return 'font-mono';
    case 'handwritten': return 'font-handwritten';
  }
}

function textBgClass(color: TextColor): string {
  return color === 'black' ? 'bg-white/55' : 'bg-black/45';
}

function textShadowStyle(color: TextColor): Record<string, string> {
  if (color === 'black') {
    return { textShadow: '0 1px 3px rgba(255,255,255,0.6), 0 0 6px rgba(255,255,255,0.3)' };
  }
  return { textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.4)' };
}
</script>

<style scoped>
.fanzine-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  aspect-ratio: 297 / 210;
  background-color: black;
  gap: var(--grid-gap, 0px);
}

.fanzine-cell {
  transition: none;
}

.fold-guides {
  /* Ensure the overlay spans the full grid area, including gaps */
  margin: calc(var(--grid-gap, 0px) * -0.5);
  padding: calc(var(--grid-gap, 0px) * 0.5);
}
</style>
