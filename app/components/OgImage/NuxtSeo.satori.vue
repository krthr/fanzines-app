<script setup>
import { computed } from 'vue';

const props = defineProps({
  colorMode: { type: String, required: false, default: 'light' },
  title: { type: String, required: false, default: 'Fanzine' },
  description: { type: String, required: false },
  icon: { type: String, required: false },
});

const isDark = computed(() => props.colorMode === 'dark');

// Rose 500 / Rose 400 for accent
const accentRgb = computed(() => isDark.value ? '251, 113, 133' : '244, 63, 94');
const accentHex = computed(() => isDark.value ? '#fb7185' : '#f43f5e');
const accentHexLight = computed(() => isDark.value ? '#fda4af' : '#fb7185');
</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-center items-center relative overflow-hidden"
    :style="{
      backgroundColor: isDark ? '#18181b' : '#ffffff',
      color: isDark ? '#fafafa' : '#18181b',
      fontFamily: 'Space Grotesk, sans-serif',
    }"
  >
    <!-- Dot texture background -->
    <div
      class="absolute top-0 left-0 right-0 bottom-0"
      :style="{
        backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? 'rgba(63, 63, 70, 0.6)' : 'rgba(228, 228, 231, 0.8)'} 0.5px, transparent 0)`,
        backgroundSize: '24px 24px',
      }"
    />

    <!-- Gradient accents -->
    <div
      class="absolute top-0 left-0 right-0 bottom-0"
      :style="{
        backgroundImage: `radial-gradient(ellipse 80% 80% at 100% 100%, rgba(${accentRgb}, 0.2) 0%, transparent 60%)`,
      }"
    />
    <div
      class="absolute top-0 left-0 right-0 bottom-0"
      :style="{
        backgroundImage: `radial-gradient(ellipse 60% 60% at 0% 0%, rgba(${accentRgb}, 0.1) 0%, transparent 50%)`,
      }"
    />

    <!-- Content -->
    <div class="w-full flex flex-col items-center text-center gap-6 relative px-16 py-12">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <svg viewBox="0 0 24 24" class="w-14 h-14" fill="none" :stroke="accentHex" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          <path d="M8 7h6" />
          <path d="M8 11h8" />
        </svg>
        <span
          class="text-[42px] font-bold tracking-tight"
          :style="{ color: isDark ? '#fafafa' : '#18181b' }"
        >
          Fanzine
        </span>
      </div>

      <!-- Title -->
      <h1
        class="text-[72px] font-bold leading-tight max-w-[900px]"
        style="display: block; line-clamp: 2; text-overflow: ellipsis; text-wrap: balance;"
      >
        {{ title }}
      </h1>

      <!-- Description -->
      <p
        v-if="description"
        class="text-[28px] max-w-[750px] leading-relaxed"
        :style="{ opacity: 0.65 }"
        style="display: block; line-clamp: 2; text-overflow: ellipsis;"
      >
        {{ description }}
      </p>

      <!-- Accent bar -->
      <div
        class="w-24 h-1.5 rounded-full mt-2"
        :style="{
          backgroundImage: `linear-gradient(to right, ${accentHex}, ${accentHexLight})`,
        }"
      />
    </div>

    <!-- Bottom bar -->
    <div
      class="absolute bottom-0 left-0 right-0 h-1.5"
      :style="{
        backgroundImage: `linear-gradient(to right, ${accentHex}, ${accentHexLight})`,
      }"
    />
  </div>
</template>
