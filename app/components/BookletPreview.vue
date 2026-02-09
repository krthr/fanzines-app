<template>
  <div class="space-y-4">
    <!-- Spread viewer -->
    <div class="relative">
      <!-- Two-page spread -->
      <div class="booklet-spread rounded-lg overflow-hidden paper-shadow bg-white dark:bg-zinc-900">
        <div
          v-if="currentSpread"
          class="grid grid-cols-2 h-full"
        >
          <!-- Left page -->
          <div class="relative overflow-hidden border-r border-dashed border-zinc-300 dark:border-zinc-600">
            <img
              v-if="currentSpread[0]"
              :src="currentSpread[0].url"
              :alt="$t(currentLabels[0])"
              class="w-full h-full object-cover"
            >
            <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs text-center py-1.5 font-medium">
              {{ $t(currentLabels[0]) }}
            </div>
          </div>

          <!-- Right page -->
          <div class="relative overflow-hidden">
            <img
              v-if="currentSpread[1]"
              :src="currentSpread[1].url"
              :alt="$t(currentLabels[1])"
              class="w-full h-full object-cover"
            >
            <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs text-center py-1.5 font-medium">
              {{ $t(currentLabels[1]) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation arrows (overlaid on spread) -->
      <button
        class="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="currentIndex === 0"
        :aria-label="$t('booklet.prev')"
        @click="currentIndex--"
      >
        <UIcon name="i-lucide-chevron-left" class="size-5" />
      </button>
      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="currentIndex === spreads.length - 1"
        :aria-label="$t('booklet.next')"
        @click="currentIndex++"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5" />
      </button>
    </div>

    <!-- Spread indicators -->
    <div class="flex items-center justify-center gap-3">
      <div class="flex items-center gap-1.5">
        <button
          v-for="(_, i) in spreads"
          :key="i"
          class="size-2 rounded-full transition-colors"
          :class="i === currentIndex
            ? 'bg-primary'
            : 'bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400 dark:hover:bg-zinc-500'"
          :aria-label="$t('booklet.goToSpread', { n: i + 1 })"
          @click="currentIndex = i"
        />
      </div>
      <span class="text-xs text-muted tabular-nums">
        {{ $t('booklet.spreadCount', { current: currentIndex + 1, total: spreads.length }) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PhotoItem } from '~/composables/usePhotoStore';

interface BookletPreviewProps {
  photos: PhotoItem[];
}

const props = defineProps<BookletPreviewProps>();

const layout = useFanzineLayout();

const spreads = computed(() => layout.getSpreads(props.photos));
const spreadLabels = computed(() => layout.getSpreadLabels());

const currentIndex = ref(0);

const currentSpread = computed(() => spreads.value[currentIndex.value]);
const currentLabels = computed(() => spreadLabels.value[currentIndex.value] ?? ['', '']);

// Reset to first spread when photos change
watch(() => props.photos, () => {
  currentIndex.value = 0;
});

// Keyboard navigation
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowLeft' && currentIndex.value > 0) {
    currentIndex.value--;
  }
  else if (e.key === 'ArrowRight' && currentIndex.value < spreads.value.length - 1) {
    currentIndex.value++;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.booklet-spread {
  aspect-ratio: 297 / 210;
}
</style>
