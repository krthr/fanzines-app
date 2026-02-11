<template>
  <div ref="containerRef" class="w-full">
    <ClientOnly>
      <template #fallback>
        <div
          class="w-full bg-zinc-200 dark:bg-zinc-800 animate-pulse"
          :style="{ aspectRatio: '297 / 210' }"
        />
      </template>

      <div class="relative">
        <v-stage ref="stageRef" :config="stageConfig">
          <v-layer>
            <!-- White background -->
            <v-rect
              :config="{
                width: stageConfig.width,
                height: stageConfig.height,
                fill: '#ffffff',
                listening: false,
              }"
            />

            <!-- Left page -->
            <v-group v-if="currentLeft">
              <v-group
                :config="{
                  clipX: 0,
                  clipY: 0,
                  clipWidth: pageWidth,
                  clipHeight: stageConfig.height,
                }"
              >
                <!-- Photo -->
                <v-image
                  v-if="leftImage"
                  :config="getPageImageConfig(leftImage, 0)"
                />

                <!-- Text overlays -->
                <template v-for="pageText in currentLeftTexts" :key="pageText.id">
                  <v-group
                    v-if="pageText.content"
                    :config="getBookletTextGroupConfig(pageText, 0)"
                  >
                    <v-rect
                      v-if="pageText.showBg"
                      :config="getBookletTextBgConfig(pageText)"
                    />
                    <v-text :config="getBookletTextConfig(pageText)" />
                  </v-group>
                </template>
              </v-group>

              <!-- Left page label -->
              <v-group :config="{ x: pageWidth / 2, y: stageConfig.height - 24, listening: false }">
                <v-rect
                  :config="{
                    x: -40,
                    y: 0,
                    width: 80,
                    height: 20,
                    fillLinearGradientStartPoint: { x: 0, y: 0 },
                    fillLinearGradientEndPoint: { x: 0, y: 20 },
                    fillLinearGradientColorStops: [0, 'rgba(0,0,0,0)', 0.3, 'rgba(0,0,0,0.4)', 1, 'rgba(0,0,0,0.6)'],
                    cornerRadius: [4, 4, 0, 0],
                  }"
                />
                <v-text
                  :config="{
                    x: -40,
                    y: 2,
                    width: 80,
                    height: 18,
                    text: currentSpreadLabels?.[0] ? t(currentSpreadLabels[0]) : '',
                    fontSize: 9,
                    fontFamily: 'sans-serif',
                    fill: '#ffffff',
                    align: 'center',
                    verticalAlign: 'middle',
                    opacity: 0.9,
                  }"
                />
              </v-group>
            </v-group>

            <!-- Spine line (dashed center) -->
            <v-line
              :config="{
                points: [pageWidth, 0, pageWidth, stageConfig.height],
                stroke: '#d4d4d8',
                strokeWidth: 1,
                dash: [4, 3],
              }"
            />

            <!-- Right page -->
            <v-group v-if="currentRight">
              <v-group
                :config="{
                  clipX: pageWidth,
                  clipY: 0,
                  clipWidth: pageWidth,
                  clipHeight: stageConfig.height,
                }"
              >
                <!-- Photo -->
                <v-image
                  v-if="rightImage"
                  :config="getPageImageConfig(rightImage, pageWidth)"
                />

                <!-- Text overlays -->
                <template v-for="pageText in currentRightTexts" :key="pageText.id">
                  <v-group
                    v-if="pageText.content"
                    :config="getBookletTextGroupConfig(pageText, pageWidth)"
                  >
                    <v-rect
                      v-if="pageText.showBg"
                      :config="getBookletTextBgConfig(pageText)"
                    />
                    <v-text :config="getBookletTextConfig(pageText)" />
                  </v-group>
                </template>
              </v-group>

              <!-- Right page label -->
              <v-group :config="{ x: pageWidth + pageWidth / 2, y: stageConfig.height - 24, listening: false }">
                <v-rect
                  :config="{
                    x: -40,
                    y: 0,
                    width: 80,
                    height: 20,
                    fillLinearGradientStartPoint: { x: 0, y: 0 },
                    fillLinearGradientEndPoint: { x: 0, y: 20 },
                    fillLinearGradientColorStops: [0, 'rgba(0,0,0,0)', 0.3, 'rgba(0,0,0,0.4)', 1, 'rgba(0,0,0,0.6)'],
                    cornerRadius: [4, 4, 0, 0],
                  }"
                />
                <v-text
                  :config="{
                    x: -40,
                    y: 2,
                    width: 80,
                    height: 18,
                    text: currentSpreadLabels?.[1] ? t(currentSpreadLabels[1]) : '',
                    fontSize: 9,
                    fontFamily: 'sans-serif',
                    fill: '#ffffff',
                    align: 'center',
                    verticalAlign: 'middle',
                    opacity: 0.9,
                  }"
                />
              </v-group>
            </v-group>
          </v-layer>
        </v-stage>

        <!-- HTML Navigation Overlay -->
        <!-- Left arrow -->
        <button
          v-if="currentSpread > 0"
          class="absolute left-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white transition-colors"
          @click="currentSpread--"
        >
          <UIcon name="i-lucide-chevron-left" class="size-5" />
        </button>

        <!-- Right arrow -->
        <button
          v-if="currentSpread < totalSpreads - 1"
          class="absolute right-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white transition-colors"
          @click="currentSpread++"
        >
          <UIcon name="i-lucide-chevron-right" class="size-5" />
        </button>

        <!-- Dot indicators + counter -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button
            v-for="i in totalSpreads"
            :key="i"
            class="size-2.5 rounded-full transition-colors"
            :class="i - 1 === currentSpread ? 'bg-primary' : 'bg-white/50 hover:bg-white/70'"
            @click="currentSpread = i - 1"
          />
          <span class="text-xs text-white/80 ml-1 font-mono">
            {{ currentSpread + 1 }} / {{ totalSpreads }}
          </span>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { PhotoItem, PageText } from '~/composables/usePhotoStore';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookletCanvasProps {
  photos: PhotoItem[];
  pageTexts: PageText[][];
}

const props = defineProps<BookletCanvasProps>();

// ---------------------------------------------------------------------------
// Composables & Refs
// ---------------------------------------------------------------------------

const { t } = useI18n();
const {
  getCoverCrop,
  getTextFontSize,
  getFontFamily,
  getTextFillColor,
  percentToPixel,
  computeStageDimensions,
} = useKonvaGrid();
const { getSpreads, getReadingOrderTexts, getSpreadLabels } = useFanzineLayout();

const containerRef = ref<HTMLDivElement>();
const stageRef = ref<InstanceType<any>>();

// ---------------------------------------------------------------------------
// Responsive Sizing
// ---------------------------------------------------------------------------

const containerWidth = ref(600);
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
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

const stageDimensions = computed(() => computeStageDimensions(containerWidth.value));

const stageConfig = computed(() => ({
  width: stageDimensions.value.width,
  height: stageDimensions.value.height,
}));

const pageWidth = computed(() => stageDimensions.value.width / 2);
const pageHeight = computed(() => stageDimensions.value.height);

// ---------------------------------------------------------------------------
// Spread Data
// ---------------------------------------------------------------------------

const totalSpreads = 4;
const currentSpread = ref(0);

// Reset when photos change
watch(() => props.photos, () => {
  currentSpread.value = 0;
});

const spreads = computed(() => getSpreads(props.photos));
const spreadLabels = computed(() => getSpreadLabels());
const orderedTexts = computed(() => getReadingOrderTexts(props.pageTexts));

const currentLeft = computed(() => spreads.value[currentSpread.value]?.[0] ?? null);
const currentRight = computed(() => spreads.value[currentSpread.value]?.[1] ?? null);

const currentLeftTexts = computed(() => {
  const readIdx = currentSpread.value * 2;
  return orderedTexts.value[readIdx] ?? [];
});

const currentRightTexts = computed(() => {
  const readIdx = currentSpread.value * 2 + 1;
  return orderedTexts.value[readIdx] ?? [];
});

const currentSpreadLabels = computed(() => spreadLabels.value[currentSpread.value] ?? null);

// ---------------------------------------------------------------------------
// Image Loading
// ---------------------------------------------------------------------------

const imageCache = ref<Map<string, HTMLImageElement>>(new Map());

watch(
  () => props.photos,
  (newPhotos) => {
    for (const photo of newPhotos) {
      if (!imageCache.value.has(photo.url)) {
        const img = new Image();
        const url = photo.url;
        img.onload = () => {
          imageCache.value = new Map(imageCache.value).set(url, img);
        };
        img.onerror = () => {
          console.warn(`[BookletCanvas] Failed to load image: ${url}`);
        };
        img.src = photo.url;
      }
    }
  },
  { immediate: true },
);

const leftImage = computed(() => {
  if (!currentLeft.value) return null;
  return imageCache.value.get(currentLeft.value.url) ?? null;
});

const rightImage = computed(() => {
  if (!currentRight.value) return null;
  return imageCache.value.get(currentRight.value.url) ?? null;
});

// ---------------------------------------------------------------------------
// Konva Configs
// ---------------------------------------------------------------------------

function getPageImageConfig(img: HTMLImageElement, xOffset: number) {
  const pw = pageWidth.value;
  const ph = pageHeight.value;
  const crop = getCoverCrop(img.naturalWidth, img.naturalHeight, pw, ph);

  return {
    x: xOffset,
    y: 0,
    image: img,
    width: pw,
    height: ph,
    crop,
    listening: false,
  };
}

function getBookletTextGroupConfig(pageText: PageText, xOffset: number) {
  const pw = pageWidth.value;
  const ph = pageHeight.value;
  const x = xOffset + percentToPixel(pageText.x, pw);
  const y = percentToPixel(pageText.y, ph);

  return { x, y, listening: false };
}

function getBookletTextConfig(pageText: PageText) {
  // Booklet text is slightly larger than grid text
  const ph = pageHeight.value;
  const baseFontSize = getTextFontSize(pageText.size, ph);
  const fontSize = Math.round(baseFontSize * 1.15);
  const fontFamily = getFontFamily(pageText.font);
  const fill = getTextFillColor(pageText.color);
  const fontStyle = fontSize >= 16 ? 'bold' : 'normal';
  const isLightText = pageText.color !== 'black';

  return {
    text: pageText.content,
    fontSize,
    fontFamily,
    fontStyle,
    fill,
    align: 'center' as const,
    width: Math.max(pageText.content.length * fontSize * 0.6, fontSize),
    offsetX: Math.max(pageText.content.length * fontSize * 0.6, fontSize) / 2,
    offsetY: fontSize / 2,
    shadowColor: isLightText ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.6)',
    shadowBlur: 3,
    shadowOffsetY: 1,
    listening: false,
  };
}

function getBookletTextBgConfig(pageText: PageText) {
  const ph = pageHeight.value;
  const baseFontSize = getTextFontSize(pageText.size, ph);
  const fontSize = Math.round(baseFontSize * 1.15);
  const padding = fontSize * 0.5;
  const isLightText = pageText.color !== 'black';

  const charWidth = fontSize * 0.6;
  const textWidth = Math.min(pageText.content.length * charWidth, pageWidth.value * 0.9);
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
// Keyboard Navigation
// ---------------------------------------------------------------------------

function onKeyDown(e: KeyboardEvent) {
  // Don't capture arrow keys when user is typing in an input/textarea
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (e.key === 'ArrowLeft' && currentSpread.value > 0) {
    currentSpread.value--;
  } else if (e.key === 'ArrowRight' && currentSpread.value < totalSpreads - 1) {
    currentSpread.value++;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>
