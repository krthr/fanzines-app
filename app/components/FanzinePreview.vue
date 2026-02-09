<template>
  <div class="space-y-6">
    <!-- Preview with paper effect -->
    <div>
      <p class="text-sm text-muted mb-3">
        This is how your zine will look when printed on A4 landscape paper.
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
        label="Download PDF"
        icon="i-lucide-download"
        size="xl"
        block
        :loading="isExporting"
        @click="handleExport"
      />
      <p class="text-xs text-muted">
        A4 landscape, 300 DPI, print-ready quality
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { photos, gap } = usePhotoStore();
const { exportToPdf, isExporting } = useExportPdf();
const toast = useToast();

async function handleExport(): Promise<void> {
  try {
    await exportToPdf(photos.value, gap.value);
    toast.add({
      title: 'PDF exported!',
      description: 'Your zine has been downloaded successfully.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
  } catch {
    toast.add({
      title: 'Export failed',
      description: 'Something went wrong generating the PDF.',
      color: 'error',
    });
  }
}
</script>
