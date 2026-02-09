<template>
  <div class="space-y-6">
    <div class="border border-default rounded-lg overflow-hidden">
      <FanzineGrid
        :photos="photos"
        :gap="gap"
        readonly
      />
    </div>

    <div class="flex justify-center">
      <UButton
        label="Download PDF"
        icon="i-lucide-download"
        size="lg"
        :loading="isExporting"
        @click="handleExport"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { photos, gap } = usePhotoStore();
const { exportToPdf, isExporting } = useExportPdf();

function handleExport(): void {
  exportToPdf(photos.value, gap.value);
}
</script>
