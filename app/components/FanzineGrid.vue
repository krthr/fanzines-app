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
        'ring-3 ring-primary ring-inset': selectedIndex === index,
      }"
      @click="onCellClick(index)"
    >
      <img
        :src="photo.url"
        :alt="`Photo ${index + 1}`"
        class="w-full h-full object-cover select-none pointer-events-none"
      >
      <div class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs text-center py-0.5">
        {{ index + 1 }}
      </div>
      <div
        v-if="selectedIndex === index && !readonly"
        class="absolute top-1 left-1"
      >
        <UBadge label="Swap" size="sm" />
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
</style>
