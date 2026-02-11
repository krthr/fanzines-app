<template>
  <div class="relative overflow-hidden">
    <img
      v-if="photo"
      :src="photo.url"
      :alt="$t(label)"
      class="w-full h-full object-cover"
    >
    <!-- Text overlays -->
    <div
      v-for="text in texts"
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
      {{ $t(label) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PhotoItem, PageText, TextSize, TextColor, TextFont } from '~/composables/usePhotoStore';

interface BookletSpreadPageProps {
  photo?: PhotoItem;
  texts: PageText[];
  label: string;
}

defineProps<BookletSpreadPageProps>();

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
