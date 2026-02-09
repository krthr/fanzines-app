<template>
  <div
    ref="gridEl"
    class="fanzine-grid"
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
      <!-- Number overlay -->
      <div
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
  </div>
</template>

<script setup lang="ts">
import type { PhotoItem } from '~/composables/usePhotoStore';

interface FanzineGridProps {
  photos: PhotoItem[];
  gap?: number;
  readonly?: boolean;
}

const props = withDefaults(defineProps<FanzineGridProps>(), {
  gap: 0,
  readonly: false,
});

const emit = defineEmits<{
  reorder: [fromIndex: number, toIndex: number];
}>();

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
</style>
