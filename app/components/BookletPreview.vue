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
            <!-- Text overlays for left page -->
            <div
              v-for="text in currentSpreadTexts[0]"
              :key="text.id"
              class="absolute z-[2] px-2 pointer-events-none"
              :style="{
                left: text.x + '%',
                top: text.y + '%',
                transform: 'translate(-50%, -50%)',
              }"
            >
              <div
                v-if="text.content"
                class="w-max max-w-full py-1 px-2 text-center leading-tight break-words rounded-sm"
                :class="[
                  bookletTextSize(text.size),
                  bookletTextColor(text.color),
                  bookletFontClass(text.font),
                  text.showBg ? bookletTextBg(text.color) : '',
                ]"
                :style="bookletTextShadow(text.color)"
              >
                {{ text.content }}
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
            <!-- Text overlays for right page -->
            <div
              v-for="text in currentSpreadTexts[1]"
              :key="text.id"
              class="absolute z-[2] px-2 pointer-events-none"
              :style="{
                left: text.x + '%',
                top: text.y + '%',
                transform: 'translate(-50%, -50%)',
              }"
            >
              <div
                v-if="text.content"
                class="w-max max-w-full py-1 px-2 text-center leading-tight break-words rounded-sm"
                :class="[
                  bookletTextSize(text.size),
                  bookletTextColor(text.color),
                  bookletFontClass(text.font),
                  text.showBg ? bookletTextBg(text.color) : '',
                ]"
                :style="bookletTextShadow(text.color)"
              >
                {{ text.content }}
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
import type { PhotoItem, PageText, TextSize, TextColor, TextFont } from '~/composables/usePhotoStore';

interface BookletPreviewProps {
  photos: PhotoItem[];
  pageTexts: PageText[][];
}

const props = defineProps<BookletPreviewProps>();

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
function bookletTextSize(size: TextSize): string {
  switch (size) {
    case 'sm': return 'text-[10px] sm:text-xs font-medium';
    case 'md': return 'text-xs sm:text-sm font-semibold';
    case 'lg': return 'text-sm sm:text-base font-bold';
    case 'xl': return 'text-base sm:text-lg font-bold';
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

function bookletTextBg(color: TextColor): string {
  return color === 'black' ? 'bg-white/55' : 'bg-black/45';
}

function bookletTextShadow(color: TextColor): Record<string, string> {
  if (color === 'black') {
    return { textShadow: '0 1px 3px rgba(255,255,255,0.6), 0 0 6px rgba(255,255,255,0.3)' };
  }
  return { textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.4)' };
}
</script>

<style scoped>
.booklet-spread {
  aspect-ratio: 297 / 210;
}
</style>
