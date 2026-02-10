<template>
  <div class="space-y-5">
    <!-- Progress bar -->
    <div v-if="count > 0" class="space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted">{{ $t('uploader.progress') }}</span>
        <span class="font-medium" :class="isFull ? 'text-primary' : ''">
          {{ count }}/{{ MAX_PHOTOS }}
        </span>
      </div>
      <UProgress
        :model-value="(count / MAX_PHOTOS) * 100"
        size="sm"
        :color="isFull ? 'primary' : 'neutral'"
      />
    </div>

    <!-- Processing indicator -->
    <div
      v-if="isProcessing"
      class="flex items-center justify-center gap-2 py-8 text-sm text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-primary" />
      <span>{{ $t('uploader.processing') }}</span>
    </div>

    <!-- Drop zone -->
    <UFileUpload
      v-if="!isProcessing"
      v-model="files"
      multiple
      accept="image/*"
      icon="i-lucide-image"
      :label="pickerLabel"
      :description="$t('uploader.fileTypes', { count, max: MAX_PHOTOS })"
      :disabled="isFull"
      :preview="false"
      class="min-h-48"
      @update:model-value="onFilesChanged"
    />

    <!-- Privacy notice -->
    <div class="flex items-center gap-2 text-xs text-muted">
      <UIcon name="i-lucide-shield-check" class="size-4 text-primary shrink-0" />
      <span>{{ $t('uploader.privacyNotice') }}</span>
    </div>

    <!-- Thumbnail grid -->
    <div
      v-if="photos.length"
      class="grid grid-cols-4 gap-3"
    >
      <!-- Photos -->
      <div
        v-for="(photo, index) in photos"
        :key="photo.id"
        class="photo-thumb relative group aspect-[3/4] rounded-lg overflow-hidden bg-elevated ring-1 ring-zinc-200 dark:ring-zinc-700"
      >
        <img
          :src="photo.url"
          :alt="$t('grid.photoAlt', { n: index + 1 })"
          class="w-full h-full object-cover"
        >
        <button
          type="button"
          class="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-500"
          @click="handleRemove(index)"
        >
          <UIcon name="i-lucide-x" class="size-3.5" />
        </button>
        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs text-center py-1 font-medium">
          {{ index + 1 }}
        </div>
      </div>

      <!-- Empty slots -->
      <div
        v-for="n in emptySlots"
        :key="`empty-${n}`"
        class="aspect-[3/4] rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-1"
      >
        <UIcon name="i-lucide-image-plus" class="size-5 text-zinc-300 dark:text-zinc-600" />
        <span class="text-xs text-zinc-400 dark:text-zinc-600">{{ count + n }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const {
  photos,
  addPhotos,
  removePhoto,
  isProcessing,
  isFull,
  count,
  MAX_PHOTOS,
} = usePhotoStore();

const toast = useToast();
const files = ref<File[] | null>(null);

const emptySlots = computed(() => Math.max(0, MAX_PHOTOS - count.value));

const pickerLabel = computed(() => {
  if (isFull.value) {
    return t('uploader.allSelected');
  }
  return t('uploader.dropHint');
});

async function onFilesChanged(value: File[] | null | undefined): Promise<void> {
  if (!value || value.length === 0) return;

  await addPhotos(value);

  nextTick(() => {
    files.value = null;
  });
}

function handleRemove(index: number): void {
  removePhoto(index);
  toast.add({
    title: t('uploader.toastRemoved'),
    color: 'neutral',
  });
}
</script>
