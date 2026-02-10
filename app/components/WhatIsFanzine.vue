<template>
  <div class="mt-20 border-t-4 border-dashed border-black dark:border-white pt-10">
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="text-3xl font-display mb-4 tracking-tight">
        {{ $t('whatIs.title') }}
      </h2>
      <p class="text-muted text-lg mb-8 leading-relaxed max-w-2xl mx-auto">
        {{ $t('whatIs.description') }}
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="feature-card bg-transparent border-2 border-black dark:border-white p-4 flex flex-col items-center justify-center gap-2"
        >
          <UIcon
            :name="getIcon(i - 1)"
            class="size-6 text-primary"
          />
          <span class="text-sm font-medium">{{ $t(`whatIs.features.${i - 1}`) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
function getIcon(index: number): string {
  const icons = [
    'i-lucide-file',      // One sheet
    'i-lucide-book-open', // 8 pages
    'i-lucide-scissors',  // No staples (cut & fold)
    'i-lucide-pocket',    // Pocket sized
  ];
  return icons[index] || 'i-lucide-circle';
}
</script>
