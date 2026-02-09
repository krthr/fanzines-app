<template>
  <UContainer class="py-10">
    <div class="max-w-4xl mx-auto">
      <!-- Hero -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <UIcon name="i-lucide-sparkles" class="size-4" />
          <span>Photo Zine Creator</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Create Your <span class="text-primary">Photo Zine</span>
        </h1>
        <p class="text-muted text-lg max-w-xl mx-auto">
          Upload 8 photos, arrange them in a beautiful layout, and export a print-ready A4 PDF
          -- all in your browser.
        </p>
      </div>

      <!-- Progress indicator -->
      <div class="flex items-center justify-center gap-3 mb-8">
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          :class="count === MAX_PHOTOS
            ? 'bg-primary/15 text-primary'
            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'"
        >
          <UIcon
            :name="count === MAX_PHOTOS ? 'i-lucide-check-circle' : 'i-lucide-image'"
            class="size-4"
          />
          <span>{{ count }}/{{ MAX_PHOTOS }} photos</span>
        </div>
      </div>

      <!-- Stepper -->
      <UStepper
        ref="stepper"
        :items="steps"
        disabled
        class="w-full"
      >
        <template #upload>
          <div class="mt-6">
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-image-plus" class="size-5 text-primary" />
                  <h2 class="text-lg font-semibold">Upload Your Photos</h2>
                </div>
              </template>

              <PhotoUploader />
            </UCard>
          </div>
        </template>

        <template #arrange>
          <div class="mt-6 space-y-6">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-layout-grid" class="size-5 text-primary" />
                    <h2 class="text-lg font-semibold">Arrange Layout</h2>
                  </div>
                  <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-muted shrink-0">
                      Gap
                    </label>
                    <USlider
                      v-model="draftGap"
                      :min="0"
                      :max="16"
                      :step="1"
                      class="w-32"
                    />
                    <span class="text-xs text-muted tabular-nums w-10 text-right">
                      {{ draftGap }}px
                    </span>
                    <UButton
                      label="Apply"
                      icon="i-lucide-check"
                      size="xs"
                      variant="soft"
                      :disabled="draftGap === gap"
                      @click="applyGap"
                    />
                  </div>
                </div>
              </template>

              <div class="space-y-3">
                <p class="text-sm text-muted">
                  Click a photo to select it, then click another to swap their positions.
                </p>

                <div class="rounded-lg overflow-hidden paper-shadow">
                  <FanzineGrid
                    :photos="photos"
                    :gap="gap"
                    @reorder="reorder"
                  />
                </div>
              </div>
            </UCard>
          </div>
        </template>

        <template #export>
          <div class="mt-6">
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-download" class="size-5 text-primary" />
                  <h2 class="text-lg font-semibold">Export Your Zine</h2>
                </div>
              </template>

              <FanzinePreview />
            </UCard>
          </div>
        </template>
      </UStepper>

      <!-- Navigation -->
      <div class="flex justify-between mt-8">
        <UButton
          label="Back"
          icon="i-lucide-arrow-left"
          variant="outline"
          color="neutral"
          size="lg"
          :disabled="!stepper?.hasPrev"
          @click="stepper?.prev()"
        />

        <UButton
          v-if="stepper?.hasNext"
          label="Next Step"
          trailing-icon="i-lucide-arrow-right"
          size="lg"
          :disabled="!canProceed"
          @click="stepper?.next()"
        />
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui';

const { photos, gap, reorder, count, MAX_PHOTOS } = usePhotoStore();

// Draft gap value -- slider updates this locally without touching the grid.
// Only committed to the store (and grid) when user clicks "Apply".
const draftGap = ref(gap.value);

function applyGap(): void {
  gap.value = draftGap.value;
}

const steps: StepperItem[] = [
  {
    slot: 'upload' as const,
    title: 'Upload',
    description: 'Add your photos',
    icon: 'i-lucide-image-plus',
  },
  {
    slot: 'arrange' as const,
    title: 'Arrange',
    description: 'Reorder and customize',
    icon: 'i-lucide-layout-grid',
  },
  {
    slot: 'export' as const,
    title: 'Export',
    description: 'Download your fanzine',
    icon: 'i-lucide-download',
  },
];

const stepper = useTemplateRef('stepper');

const canProceed = computed(() => {
  if (!stepper.value?.hasNext) return false;
  if (count.value < MAX_PHOTOS) return false;
  return true;
});

useHead({
  title: 'Fanzine - Create Print-Ready Photo Zines',
});
</script>
