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
          <div class="rounded-lg overflow-hidden paper-shadow">
            <FanzineGrid
              :photos="photos"
              :gap="gap"
              readonly
              show-labels
              show-guides
            />
          </div>
        </div>
      </template>

      <template #booklet>
        <div class="mt-4 space-y-3">
          <p class="text-sm text-muted">
            {{ $t('preview.bookletDescription') }}
          </p>
          <BookletPreview :photos="photos" />
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
          class="flex-1"
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

const { t } = useI18n();
const { $posthog } = useNuxtApp();
const { photos, gap } = usePhotoStore();
const { exportToPdf, isExporting } = useExportPdf();
const toast = useToast();

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
  const eventProps = {
    photo_count: photos.value.length,
    show_guides: pdfGuides.value,
    gap: gap.value,
  };

  try {
    await exportToPdf(photos.value, gap.value, { showGuides: pdfGuides.value });
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
