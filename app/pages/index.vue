<template>
  <UContainer class="py-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-2">
        Fanzine
      </h1>
      <p class="text-muted text-center mb-8">
        Upload photos, arrange your layout, and export a print-ready PDF.
      </p>

      <UStepper
        ref="stepper"
        :items="steps"
        disabled
        class="w-full"
      >
        <template #upload>
          <div class="mt-6">
            <PhotoUploader />
          </div>
        </template>

        <template #arrange>
          <div class="mt-6 space-y-6">
            <div class="flex items-center gap-4">
              <label class="text-sm font-medium text-muted shrink-0">
                Gap
              </label>
              <USlider
                v-model="draftGap"
                :min="0"
                :max="16"
                :step="1"
                class="flex-1"
              />
              <span class="text-xs text-muted tabular-nums w-10 text-right">
                {{ draftGap }}px
              </span>
              <UButton
                label="Apply"
                icon="i-lucide-check"
                size="sm"
                :disabled="draftGap === gap"
                @click="applyGap"
              />
            </div>

            <p class="text-sm text-muted">
              Click a photo to select it, then click another to swap their positions.
            </p>

            <div class="border border-default rounded-lg overflow-hidden">
              <FanzineGrid
                :photos="photos"
                :gap="gap"
                @reorder="reorder"
              />
            </div>
          </div>
        </template>

        <template #export>
          <div class="mt-6">
            <FanzinePreview />
          </div>
        </template>
      </UStepper>

      <div class="flex justify-between mt-6">
        <UButton
          label="Back"
          icon="i-lucide-arrow-left"
          variant="outline"
          color="neutral"
          :disabled="!stepper?.hasPrev"
          @click="stepper?.prev()"
        />

        <UButton
          v-if="stepper?.hasNext"
          label="Next"
          trailing-icon="i-lucide-arrow-right"
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

// Draft gap value — slider updates this locally without touching the grid.
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
