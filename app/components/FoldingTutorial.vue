<template>
  <UModal
    v-model:open="open"
    :title="$t('tutorial.title')"
    :description="$t('tutorial.description')"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <slot />

    <template #body>
      <div class="space-y-6">
        <!-- Step illustration -->
        <div class="flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 border-2 border-dashed border-black dark:border-white p-6 min-h-[180px]">
          <!-- Step 1: Flat sheet face-up -->
          <div v-if="currentStep === 0" class="tutorial-sheet">
            <div class="grid grid-cols-4 grid-rows-2 w-full h-full border-2 border-zinc-400 dark:border-zinc-500 rounded-sm">
              <div
                v-for="i in 8"
                :key="i"
                class="flex items-center justify-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700"
              >
                {{ LAYOUT[i - 1]?.role === 'frontCover' ? 'FC' : LAYOUT[i - 1]?.role === 'backCover' ? 'BC' : `P${LAYOUT[i - 1]?.readingOrder}` }}
              </div>
            </div>
          </div>

          <!-- Step 2: Fold in half horizontally -->
          <div v-else-if="currentStep === 1" class="flex flex-col items-center gap-3">
            <div class="tutorial-sheet-half border-2 border-zinc-400 dark:border-zinc-500 rounded-sm relative">
              <div class="absolute inset-x-0 bottom-0 h-1 bg-primary/30" />
            </div>
            <UIcon name="i-lucide-arrow-down" class="size-5 text-primary animate-bounce" />
            <div class="tutorial-sheet-half border-2 border-zinc-400 dark:border-zinc-500 rounded-sm opacity-40 border-dashed" />
          </div>

          <!-- Step 3: Fold in half again -->
          <div v-else-if="currentStep === 2" class="flex items-center gap-3">
            <div class="tutorial-sheet-quarter border-2 border-zinc-400 dark:border-zinc-500 rounded-sm" />
            <UIcon name="i-lucide-arrow-left" class="size-5 text-primary animate-pulse" />
            <div class="tutorial-sheet-quarter border-2 border-zinc-400 dark:border-zinc-500 rounded-sm opacity-40 border-dashed" />
          </div>

          <!-- Step 4: Fold once more -->
          <div v-else-if="currentStep === 3" class="flex items-center gap-3">
            <div class="tutorial-sheet-eighth border-2 border-zinc-400 dark:border-zinc-500 rounded-sm relative">
              <div class="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                8 layers
              </div>
            </div>
          </div>

          <!-- Step 5: Unfold + show layout with cut line -->
          <div v-else-if="currentStep === 4" class="tutorial-sheet relative">
            <div class="grid grid-cols-4 grid-rows-2 w-full h-full border-2 border-zinc-400 dark:border-zinc-500 rounded-sm">
              <div
                v-for="i in 8"
                :key="i"
                class="flex items-center justify-center text-[10px] font-medium border border-zinc-200 dark:border-zinc-700"
                :class="i <= 4 ? 'text-amber-500 rotate-180' : 'text-zinc-500 dark:text-zinc-400'"
              >
                {{ LAYOUT[i - 1]?.role === 'frontCover' ? 'FC' : LAYOUT[i - 1]?.role === 'backCover' ? 'BC' : `P${LAYOUT[i - 1]?.readingOrder}` }}
              </div>
            </div>
            <!-- Cut line indicator -->
            <div class="absolute top-1/2 left-1/4 w-1/2 -translate-y-px h-0.5 bg-red-500" />
            <div class="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-3">
              <UIcon name="i-lucide-scissors" class="size-4 text-red-500" />
            </div>
          </div>

          <!-- Step 6: Fold horizontally + pop out center -->
          <div v-else-if="currentStep === 5" class="flex flex-col items-center gap-2">
            <div class="flex items-end gap-0">
              <div class="w-12 h-16 border-2 border-zinc-400 dark:border-zinc-500 rounded-sm" />
              <div class="w-12 h-20 border-2 border-primary rounded-sm -mx-px relative">
                <div class="absolute inset-0 flex items-center justify-center">
                  <UIcon name="i-lucide-unfold-vertical" class="size-5 text-primary" />
                </div>
              </div>
              <div class="w-12 h-16 border-2 border-zinc-400 dark:border-zinc-500 rounded-sm" />
            </div>
            <span class="text-xs text-muted">{{ $t('tutorial.popHint') }}</span>
          </div>

          <!-- Step 7: Final booklet -->
          <div v-else-if="currentStep === 6" class="flex flex-col items-center gap-3">
            <div class="relative">
              <!-- Booklet representation -->
              <div class="w-20 h-28 bg-white dark:bg-zinc-700 border-2 border-zinc-400 dark:border-zinc-500 rounded-r-sm rounded-l-[2px] shadow-md relative">
                <!-- Spine -->
                <div class="absolute left-0 top-1 bottom-1 w-0.5 bg-zinc-300 dark:bg-zinc-500 rounded-full" />
                <!-- Page lines -->
                <div class="absolute top-3 left-3 right-3 space-y-1.5">
                  <div class="h-0.5 bg-zinc-200 dark:bg-zinc-600 rounded" />
                  <div class="h-0.5 bg-zinc-200 dark:bg-zinc-600 rounded w-3/4" />
                  <div class="h-0.5 bg-zinc-200 dark:bg-zinc-600 rounded w-1/2" />
                </div>
                <div class="absolute bottom-2 inset-x-0 text-center text-[9px] font-semibold text-primary">
                  Fanzine
                </div>
              </div>
              <!-- Back pages shadow -->
              <div class="absolute -left-0.5 top-0.5 w-20 h-28 border border-zinc-300 dark:border-zinc-600 rounded-r-sm rounded-l-[2px] -z-10" />
              <div class="absolute -left-1 top-1 w-20 h-28 border border-zinc-200 dark:border-zinc-700 rounded-r-sm rounded-l-[2px] -z-20" />
            </div>
            <UIcon name="i-lucide-party-popper" class="size-5 text-primary" />
          </div>
        </div>

        <!-- Step text -->
        <div class="text-center">
          <p class="text-sm font-semibold mb-1">
            {{ $t(`tutorial.steps.${currentStep}.title`) }}
          </p>
          <p class="text-sm text-muted">
            {{ $t(`tutorial.steps.${currentStep}.description`) }}
          </p>
        </div>

        <!-- Progress dots -->
        <div class="flex items-center justify-center gap-1.5">
          <button
            v-for="(_, i) in TOTAL_STEPS"
            :key="i"
            class="size-2.5"
            :class="i === currentStep
              ? 'bg-primary'
              : i < currentStep
                ? 'bg-primary/40'
                : 'bg-zinc-300 dark:bg-zinc-600'"
            @click="currentStep = i"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UButton
          :label="$t('tutorial.prev')"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          :disabled="currentStep === 0"
          @click="currentStep--"
        />
        <span class="text-xs text-muted tabular-nums">
          {{ currentStep + 1 }} / {{ TOTAL_STEPS }}
        </span>
        <UButton
          v-if="currentStep < TOTAL_STEPS - 1"
          :label="$t('tutorial.next')"
          trailing-icon="i-lucide-arrow-right"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="currentStep++"
        />
        <UButton
          v-else
          :label="$t('tutorial.done')"
          icon="i-lucide-check"
          variant="soft"
          size="sm"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const TOTAL_STEPS = 7;

const open = defineModel<boolean>('open', { default: false });
const currentStep = ref(0);

const { LAYOUT } = useFanzineLayout();

// Keyboard navigation -- only listen when modal is open
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight' && currentStep.value < TOTAL_STEPS - 1) {
    currentStep.value++;
  }
  else if (e.key === 'ArrowLeft' && currentStep.value > 0) {
    currentStep.value--;
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    currentStep.value = 0;
    window.addEventListener('keydown', onKeydown);
  } else {
    window.removeEventListener('keydown', onKeydown);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.tutorial-sheet {
  width: 240px;
  aspect-ratio: 297 / 210;
}

.tutorial-sheet-half {
  width: 240px;
  aspect-ratio: 297 / 105;
}

.tutorial-sheet-quarter {
  width: 120px;
  aspect-ratio: 148.5 / 105;
}

.tutorial-sheet-eighth {
  width: 60px;
  aspect-ratio: 74.25 / 105;
}
</style>
