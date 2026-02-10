<template>
  <div class="space-y-4">
    <!-- Spread viewer -->
    <div class="relative">
      <!-- Two-page spread -->
      <div class="booklet-spread overflow-hidden paper-shadow bg-white dark:bg-zinc-900">
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
            <!-- Text overlay for left page -->
            <div
              v-if="currentSpreadTexts[0]?.content"
              class="absolute inset-x-0 px-2 z-[2]"
              :class="bookletPositionClass(currentSpreadTexts[0].position)"
            >
              <div
                class="w-full py-1 px-2 text-center leading-tight break-words"
                :class="[
                  bookletTextSize(currentSpreadTexts[0].size),
                  bookletTextColor(currentSpreadTexts[0].color),
                  bookletFontClass(currentSpreadTexts[0].font),
                  currentSpreadTexts[0].showBg ? bookletTextBg(currentSpreadTexts[0].color, currentSpreadTexts[0].position) : '',
                ]"
              >
                {{ currentSpreadTexts[0].content }}
              </div>
            </div>
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
            <!-- Text overlay for right page -->
            <div
              v-if="currentSpreadTexts[1]?.content"
              class="absolute inset-x-0 px-2 z-[2]"
              :class="bookletPositionClass(currentSpreadTexts[1].position)"
            >
              <div
                class="w-full py-1 px-2 text-center leading-tight break-words"
                :class="[
                  bookletTextSize(currentSpreadTexts[1].size),
                  bookletTextColor(currentSpreadTexts[1].color),
                  bookletFontClass(currentSpreadTexts[1].font),
                  currentSpreadTexts[1].showBg ? bookletTextBg(currentSpreadTexts[1].color, currentSpreadTexts[1].position) : '',
                ]"
              >
                {{ currentSpreadTexts[1].content }}
              </div>
            </div>
            <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs text-center py-1.5 font-medium">
              {{ $t(currentLabels[1]) }}
            </div>
          </div>
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
import type { PhotoItem, PageText, TextSize, TextColor, TextFont, TextPosition } from '~/composables/usePhotoStore';

interface BookletPreviewProps {
  photos: PhotoItem[];
  pageTexts: PageText[];
}

const props = defineProps<BookletPreviewProps>();

const layout = useFanzineLayout();

const spreads = computed(() => layout.getSpreads(props.photos));
const spreadLabels = computed(() => layout.getSpreadLabels());

/**
 * Get page texts in reading order, matching the spread layout.
 * Each entry is a pair of PageText for the left and right pages.
 */
const spreadTexts = computed((): [PageText | undefined, PageText | undefined][] => {
  const readingOrderTexts = layout.getReadingOrderTexts(props.pageTexts);
  const pairs: [PageText | undefined, PageText | undefined][] = [];
  for (let i = 0; i < readingOrderTexts.length; i += 2) {
    pairs.push([readingOrderTexts[i], readingOrderTexts[i + 1]]);
  }
  return pairs;
});

const currentIndex = ref(0);

const currentSpread = computed(() => spreads.value[currentIndex.value]);
const currentLabels = computed((): [string, string] => spreadLabels.value[currentIndex.value] ?? ['', '']);
const currentSpreadTexts = computed((): [PageText | undefined, PageText | undefined] =>
  spreadTexts.value[currentIndex.value] ?? [undefined, undefined],
);

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

// Text style helpers (booklet uses slightly larger sizes since pages are bigger)
function bookletPositionClass(position: TextPosition): string {
  switch (position) {
    case 'top': return 'top-0';
    case 'center': return 'top-1/2 -translate-y-1/2';
    case 'bottom': return 'bottom-0';
  }
}

function bookletTextSize(size: TextSize): string {
  switch (size) {
    case 'sm': return 'text-[10px] sm:text-xs font-medium';
    case 'md': return 'text-xs sm:text-sm font-semibold';
    case 'lg': return 'text-sm sm:text-base font-bold';
  }
}

function bookletTextColor(color: TextColor): string {
  switch (color) {
    case 'white': return 'text-white';
    case 'black': return 'text-zinc-900';
    case 'rose': return 'text-fuchsia-500';
  }
}

function bookletFontClass(font: TextFont): string {
  switch (font) {
    case 'sans': return 'font-sans';
    case 'serif': return 'font-serif';
    case 'mono': return 'font-mono';
    case 'handwritten': return 'font-handwritten';
  }
}

function bookletTextBg(color: TextColor, position: TextPosition): string {
  if (position === 'center') {
    return color === 'black'
      ? 'bg-white/55'
      : 'bg-black/45';
  }
  const isTop = position === 'top';
  if (color === 'black') {
    return isTop
      ? 'bg-gradient-to-b from-white/70 to-white/40'
      : 'bg-gradient-to-t from-white/70 to-white/40';
  }
  return isTop
    ? 'bg-gradient-to-b from-black/60 to-black/30'
    : 'bg-gradient-to-t from-black/60 to-black/30';
}
</script>

<style scoped>
.booklet-spread {
  aspect-ratio: 297 / 210;
}
</style>
