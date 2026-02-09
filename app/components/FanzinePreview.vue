<template>
  <div class="space-y-6">
    <!-- Preview with paper effect -->
    <div>
      <p class="text-sm text-muted mb-3">
        {{ $t('preview.description') }}
      </p>
      <div class="rounded-lg overflow-hidden paper-shadow">
        <FanzineGrid
          :photos="photos"
          :gap="gap"
          readonly
        />
      </div>
    </div>

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
const { t } = useI18n();
const { photos, gap } = usePhotoStore();
const { exportToPdf, isExporting } = useExportPdf();
const toast = useToast();

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
