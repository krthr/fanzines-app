<template>
  <UContainer class="py-10">
    <div class="max-w-4xl mx-auto">
      <!-- Hero -->
      <div class="text-center mb-10">
        <div class="stamp text-primary mb-4">
          <UIcon name="i-lucide-sparkles" class="size-4" />
          <span>{{ $t("hero.badge") }}</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-display tracking-tight mb-3">
          {{ $t("hero.titleStart") }}
          <span class="text-primary">{{ $t("hero.titleHighlight") }}</span>
        </h1>
        <p class="text-muted text-lg max-w-xl mx-auto">
          {{ $t("hero.description") }}
        </p>
      </div>

      <!-- Progress indicator -->
      <div class="flex items-center justify-center gap-3 mb-8">
        <div
          class="flex items-center gap-2 px-3 py-1.5 border-2 text-sm font-mono uppercase tracking-wide"
          :class="
            count === MAX_PHOTOS
              ? 'border-primary text-primary'
              : 'border-zinc-400 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400'
          "
        >
          <UIcon
            :name="
              count === MAX_PHOTOS
                ? 'i-lucide-check-circle'
                : 'i-lucide-image-plus'
            "
            class="size-4"
          />
          <span>{{ $t("progress.photos", { count, max: MAX_PHOTOS }) }}</span>
        </div>
      </div>

      <!-- Stepper -->
      <UStepper ref="stepper" :items="steps" disabled class="w-full">
        <template #upload>
          <div class="mt-6">
            <UCard class="tape-strip">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-image" class="size-5 text-primary" />
                  <h2 class="text-lg font-semibold">
                    {{ $t("uploadCard.title") }}
                  </h2>
                </div>
              </template>

              <PhotoUploader />
            </UCard>
          </div>
        </template>

        <template #arrange>
          <div class="mt-6 space-y-6">
            <UCard class="tape-strip">
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-lucide-layout-grid"
                      class="size-5 text-primary"
                    />
                    <h2 class="text-lg font-semibold">
                      {{ $t("arrangeCard.title") }}
                    </h2>
                  </div>
                  <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-muted shrink-0">
                      {{ $t("arrangeCard.gapLabel") }}
                    </label>
                    <USlider
                      v-model="draftGap"
                      :min="0"
                      :max="16"
                      :step="1"
                      class="w-32"
                    />
                    <span
                      class="text-xs text-muted tabular-nums w-10 text-right"
                    >
                      {{ draftGap }}px
                    </span>
                    <UButton
                      :label="$t('arrangeCard.apply')"
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
                <div class="flex items-center justify-between">
                  <p class="text-sm text-muted">
                    {{
                      gridMode === "text"
                        ? $t("arrangeCard.textHint")
                        : $t("arrangeCard.swapHint")
                    }}
                  </p>
                  <div class="flex items-center gap-2 shrink-0 ml-4">
                    <!-- Mode toggle -->
                    <div
                      class="flex items-center gap-0.5 p-0.5 border-2 border-zinc-400 dark:border-zinc-600"
                    >
                      <UButton
                        :label="$t('arrangeCard.modeReorder')"
                        icon="i-lucide-move"
                        size="xs"
                        :variant="gridMode === 'reorder' ? 'soft' : 'ghost'"
                        :color="gridMode === 'reorder' ? 'primary' : 'neutral'"
                        @click="gridMode = 'reorder'"
                      />
                      <UButton
                        :label="$t('arrangeCard.modeText')"
                        icon="i-lucide-type"
                        size="xs"
                        :variant="gridMode === 'text' ? 'soft' : 'ghost'"
                        :color="gridMode === 'text' ? 'primary' : 'neutral'"
                        @click="gridMode = 'text'"
                      />
                    </div>
                    <UButton
                      :label="$t('guides.showLabels')"
                      icon="i-lucide-tag"
                      size="xs"
                      :variant="showLabels ? 'soft' : 'ghost'"
                      :color="showLabels ? 'primary' : 'neutral'"
                      @click="showLabels = !showLabels"
                    />
                    <UButton
                      :label="$t('guides.showGuides')"
                      icon="i-lucide-scissors"
                      size="xs"
                      :variant="showGuides ? 'soft' : 'ghost'"
                      :color="showGuides ? 'primary' : 'neutral'"
                      @click="showGuides = !showGuides"
                    />
                  </div>
                </div>

                <div class="overflow-hidden paper-shadow">
                  <FanzineGrid
                    :photos="photos"
                    :page-texts="pageTexts"
                    :gap="gap"
                    :mode="gridMode"
                    :show-labels="showLabels"
                    :show-guides="showGuides"
                    @reorder="reorder"
                    @update:page-text="
                      (index, value) => updatePageText(index, value)
                    "
                  />
                </div>
              </div>
            </UCard>
          </div>
        </template>

        <template #export>
          <div class="mt-6">
            <UCard class="tape-strip">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-download" class="size-5 text-primary" />
                  <h2 class="text-lg font-semibold">
                    {{ $t("exportCard.title") }}
                  </h2>
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
          :label="$t('nav.back')"
          icon="i-lucide-arrow-left"
          variant="outline"
          color="neutral"
          size="lg"
          :disabled="!stepper?.hasPrev"
          @click="stepper?.prev()"
        />

        <UButton
          v-if="stepper?.hasNext"
          :label="$t('nav.next')"
          trailing-icon="i-lucide-arrow-right"
          size="lg"
          :disabled="!canProceed"
          @click="stepper?.next()"
        />
      </div>

      <!-- What is a Fanzine? -->
      <WhatIsFanzine />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { StepperItem } from "@nuxt/ui";

const { t } = useI18n();
const { photos, gap, pageTexts, reorder, updatePageText, count, MAX_PHOTOS } =
  usePhotoStore();

// Draft gap value -- slider updates this locally without touching the grid.
// Only committed to the store (and grid) when user clicks "Apply".
const draftGap = ref(gap.value);

// Arrange step display toggles
const showLabels = ref(false);
const showGuides = ref(false);

// Grid interaction mode: reorder (click-to-swap) or text (click-to-edit)
const gridMode = ref<"reorder" | "text">("reorder");

function applyGap(): void {
  gap.value = draftGap.value;
}

const steps = computed<StepperItem[]>(() => [
  {
    slot: "upload" as const,
    title: t("steps.upload.title"),
    description: t("steps.upload.description"),
    icon: "i-lucide-image",
  },
  {
    slot: "arrange" as const,
    title: t("steps.arrange.title"),
    description: t("steps.arrange.description"),
    icon: "i-lucide-layout-grid",
  },
  {
    slot: "export" as const,
    title: t("steps.export.title"),
    description: t("steps.export.description"),
    icon: "i-lucide-download",
  },
]);

const stepper = useTemplateRef("stepper");

const canProceed = computed(() => {
  if (!stepper.value?.hasNext) return false;
  if (count.value < MAX_PHOTOS) return false;
  return true;
});

useSeoMeta({
  title: () => t("pageTitle"),
  description: () => t("hero.description"),
  ogTitle: () => t("pageTitle"),
  ogDescription: () => t("hero.description"),
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: () => t("pageTitle"),
  twitterDescription: () => t("hero.description"),
});
</script>
