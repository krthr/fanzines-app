<template>
  <div
    ref="gridEl"
    class="fanzine-grid relative"
  >
    <div
      v-for="(photo, index) in photos"
      :key="photo.id"
      class="fanzine-cell relative overflow-hidden"
      :class="{
        'cursor-pointer': !readonly,
        'ring-3 ring-primary ring-inset z-10': selectedIndex === index,
        'hover:brightness-105': !readonly && selectedIndex !== index,
      }"
      @click="onCellClick(index)"
    >
      <img
        :src="photo.url"
        :alt="$t('grid.photoAlt', { n: index + 1 })"
        class="w-full h-full object-cover select-none pointer-events-none transition-transform duration-200"
      >

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
        v-if="!showLabels"
        class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs text-center py-1 font-medium"
        :class="{ 'opacity-0': selectedIndex === index }"
      >
        {{ index + 1 }}
      </div>

      <!-- Swap badge -->
      <div
        v-if="selectedIndex === index && !readonly"
        class="absolute inset-0 flex items-center justify-center bg-primary/20"
      >
        <UBadge :label="$t('grid.swap')" size="md" color="primary" variant="solid" class="shadow-lg" />
      </div>
      <!-- Target hint when one is selected -->
      <div
        v-if="selectedIndex !== null && selectedIndex !== index && !readonly"
        class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30"
      >
        <UBadge :label="$t('grid.placeHere')" size="sm" color="neutral" variant="solid" />
      </div>
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
import type { PhotoItem } from '~/composables/usePhotoStore';

interface FanzineGridProps {
  photos: PhotoItem[];
  gap?: number;
  readonly?: boolean;
  showLabels?: boolean;
  showGuides?: boolean;
}

const props = withDefaults(defineProps<FanzineGridProps>(), {
  gap: 0,
  readonly: false,
  showLabels: false,
  showGuides: false,
});

const emit = defineEmits<{
  reorder: [fromIndex: number, toIndex: number];
}>();

const layout = useFanzineLayout();

// Gap applied via CSS custom property to bypass VDOM diffing
const gridEl = ref<HTMLElement | null>(null);

watch(() => props.gap, (val) => {
  gridEl.value?.style.setProperty('--grid-gap', `${val}px`);
}, { immediate: true });

// Click-to-swap state
const selectedIndex = ref<number | null>(null);

function onCellClick(index: number): void {
  if (props.readonly) return;

  if (selectedIndex.value === null) {
    // First click: select this photo
    selectedIndex.value = index;
  }
  else if (selectedIndex.value === index) {
    // Clicked same photo: deselect
    selectedIndex.value = null;
  }
  else {
    // Second click on a different photo: swap them
    emit('reorder', selectedIndex.value, index);
    selectedIndex.value = null;
  }
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
  transition: filter 0.2s ease;
}

.fold-guides {
  /* Ensure the overlay spans the full grid area, including gaps */
  margin: calc(var(--grid-gap, 0px) * -0.5);
  padding: calc(var(--grid-gap, 0px) * 0.5);
}
</style>
