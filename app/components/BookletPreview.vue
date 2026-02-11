<template>
  <div
    ref="rootEl"
    class="space-y-4"
    tabindex="0"
    @keydown="onKeydown"
  >
    <!-- Spread viewer -->
    <div class="relative">
      <!-- Two-page spread -->
      <div class="booklet-spread overflow-hidden paper-shadow bg-white dark:bg-zinc-900">
        <div
          v-if="currentSpread"
          class="grid grid-cols-2 h-full"
        >
          <!-- Left page -->
          <BookletSpreadPage
            :photo="currentSpread[0]"
            :texts="currentSpreadTexts[0]"
            :label="currentLabels[0]"
            class="border-r border-dashed border-zinc-300 dark:border-zinc-600"
          />

          <!-- Right page -->
          <BookletSpreadPage
            :photo="currentSpread[1]"
            :texts="currentSpreadTexts[1]"
            :label="currentLabels[1]"
          />
        </div>
      </div>

      <!-- Navigation arrows (overlaid on spread) -->
      <button
        class="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="currentIndex === 0"
        :aria-label="$t('booklet.prev')"
        @click="currentIndex--"
      >
        <UIcon name="i-lucide-chevron-left" class="size-5" />
      </button>
      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed"
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
          class="size-2.5"
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
import type { PhotoItem, PageText } from '~/composables/usePhotoStore';

interface BookletPreviewProps {
  photos: PhotoItem[];
  pageTexts: PageText[][];
}

const props = defineProps<BookletPreviewProps>();

const rootEl = ref<HTMLDivElement | null>(null);
const layout = useFanzineLayout();

const spreads = computed(() => layout.getSpreads(props.photos));
const spreadLabels = computed(() => layout.getSpreadLabels());

const spreadTexts = computed((): [PageText[], PageText[]][] => {
  const readingOrderTexts = layout.getReadingOrderTexts(props.pageTexts);
  const pairs: [PageText[], PageText[]][] = [];
  for (let i = 0; i < readingOrderTexts.length; i += 2) {
    pairs.push([readingOrderTexts[i] ?? [], readingOrderTexts[i + 1] ?? []]);
  }
  return pairs;
});

const currentIndex = ref(0);

const currentSpread = computed(() => spreads.value[currentIndex.value]);
const currentLabels = computed((): [string, string] => spreadLabels.value[currentIndex.value] ?? ['', '']);
const currentSpreadTexts = computed((): [PageText[], PageText[]] =>
  spreadTexts.value[currentIndex.value] ?? [[], []],
);

// Reset to first spread when photos change
watch(() => props.photos, () => {
  currentIndex.value = 0;
});

// Keyboard navigation (scoped to this component via @keydown on root element)
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowLeft' && currentIndex.value > 0) {
    currentIndex.value--;
  }
  else if (e.key === 'ArrowRight' && currentIndex.value < spreads.value.length - 1) {
    currentIndex.value++;
  }
}
</script>

<style scoped>
.booklet-spread {
  aspect-ratio: 297 / 210;
}
</style>
