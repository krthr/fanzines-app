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

    <!-- Download button -->
    <div class="flex flex-col items-center gap-3">
      <UButton
        :label="$t('preview.download')"
        icon="i-lucide-download"
        size="xl"
        block
        :loading="isExporting"
        @click="handleExport"
      />
      <p class="text-xs text-muted">
        {{ $t('preview.specs') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

const { t } = useI18n();
const { photos, gap } = usePhotoStore();
const { exportToPdf, isExporting } = useExportPdf();
const toast = useToast();

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
  try {
    await exportToPdf(photos.value, gap.value);
    toast.add({
      title: t('preview.toastSuccess'),
      description: t('preview.toastSuccessDesc'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
  } catch {
    toast.add({
      title: t('preview.toastFailed'),
      description: t('preview.toastFailedDesc'),
      color: 'error',
    });
  }
}
</script>
