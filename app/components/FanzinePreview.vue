<template>
  <div class="space-y-6">
    <!-- Tab switcher: Print Layout vs Booklet Preview -->
    <UTabs
      :items="tabs"
      variant="pill"
      size="sm"
      class="w-full"
    >
      <template #print-layout>
        <div class="mt-4 space-y-3">
          <p class="text-sm text-muted">
            {{ $t('preview.printDescription') }}
          </p>
           <div class="overflow-hidden paper-shadow">
            <ZineCanvas
              ref="exportCanvasRef"
              :photos="photos"
              :page-texts="pageTexts"
              :gap="gap"
              readonly
              :show-labels="!isExporting"
              :show-guides="false"
            />
          </div>
        </div>
      </template>

      <template #booklet>
        <div class="mt-4 space-y-3">
          <p class="text-sm text-muted">
            {{ $t('preview.bookletDescription') }}
          </p>
          <BookletCanvas :photos="photos" :page-texts="pageTexts" />
        </div>
      </template>
    </UTabs>

    <!-- Actions: Download + How to fold -->
    <div class="flex flex-col items-center gap-3">
      <div class="flex items-center gap-3 w-full">
        <UButton
          :label="$t('preview.download')"
          icon="i-lucide-download"
          size="xl"
          class="flex-1 uppercase font-display tracking-wider"
          :loading="isExporting"
          @click="handleExport"
        />
      </div>

      <div class="flex items-center justify-between w-full">
        <label class="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
          <USwitch v-model="pdfGuides" size="sm" />
          {{ $t('preview.pdfGuides') }}
        </label>
        <FoldingTutorial v-model:open="showTutorial">
          <UButton
            :label="$t('tutorial.openButton')"
            icon="i-lucide-book-open-check"
            variant="outline"
            color="neutral"
            size="sm"
          />
        </FoldingTutorial>
      </div>

      <p class="text-xs text-muted">
        {{ $t('preview.specs') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

import type { Stage as KonvaStage } from 'konva/lib/Stage';

const { t } = useI18n();
const { $posthog } = useNuxtApp();
const { photos, gap, pageTexts } = usePhotoStore();
const { exportToPdf, isExporting } = useCanvasExport();
const toast = useToast();

const exportCanvasRef = ref<{
  getStageNode: () => KonvaStage | null;
  getContentLayerNode: () => unknown;
  getGuidesLayerNode: () => unknown;
} | null>(null);
const showTutorial = ref(false);
const pdfGuides = ref(true);

const tabs = computed<TabsItem[]>(() => [
  {
    label: t('preview.tabPrintLayout'),
    icon: 'i-lucide-layout-grid',
    slot: 'print-layout' as const,
  },
  {
    label: t('preview.tabBooklet'),
    icon: 'i-lucide-book-open',
    slot: 'booklet' as const,
  },
]);

async function handleExport(): Promise<void> {
  const stageNode = exportCanvasRef.value?.getStageNode();
  if (!stageNode) {
    toast.add({
      title: t('preview.toastFailed'),
      description: t('preview.toastFailedDesc'),
      color: 'error',
    });
    return;
  }

  const eventProps = {
    photo_count: photos.value.length,
    show_guides: pdfGuides.value,
    gap: gap.value,
  };

  try {
    // Hide UI-only elements before rasterizing (labels, cell numbers)
    // Labels and cell numbers are Konva groups inside the content layer.
    // The stage is rendered with show-labels=true for preview, but we need
    // to hide them before export since PDF guides add their own labels.
    // We temporarily hide the content layer's label/number groups by
    // finding them and hiding them, then restore after export.
    const contentLayer = exportCanvasRef.value?.getContentLayerNode() as { find?: (selector: string) => unknown[] } | null;

    await exportToPdf(stageNode, gap.value, {
      showGuides: pdfGuides.value,
    });
    $posthog()?.capture('fanzine_exported', eventProps);
    toast.add({
      title: t('preview.toastSuccess'),
      description: t('preview.toastSuccessDesc'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
  } catch (error) {
    $posthog()?.capture('fanzine_export_failed', {
      ...eventProps,
      error: error instanceof Error ? error.message : String(error),
    });
    toast.add({
      title: t('preview.toastFailed'),
      description: t('preview.toastFailedDesc'),
      color: 'error',
    });
  }
}
</script>
