<template>
  <div class="mt-20 border-t border-zinc-200 dark:border-zinc-800 pt-10">
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-4 tracking-tight">
        {{ $t('whatIs.title') }}
      </h2>
      <p class="text-muted text-lg mb-8 leading-relaxed max-w-2xl mx-auto">
        {{ $t('whatIs.description') }}
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 border border-zinc-100 dark:border-zinc-800"
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
