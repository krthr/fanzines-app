<template>
  <div class="space-y-4">
    <UFileUpload
      v-model="files"
      multiple
      accept="image/*"
      icon="i-lucide-image"
      :label="uploadLabel"
      :description="`JPG, PNG, WebP or GIF. ${count}/${MAX_PHOTOS} photos uploaded.`"
      :disabled="isFull || isUploading"
      :preview="false"
      class="min-h-48"
      @update:model-value="onFilesChanged"
    />

    <div
      v-if="photos.length || uploadQueue.length"
      class="grid grid-cols-4 gap-3"
    >
      <!-- Completed uploads -->
      <div
        v-for="(photo, index) in photos"
        :key="photo.id"
        class="relative group aspect-[3/4] rounded-lg overflow-hidden bg-elevated"
      >
        <img
          :src="photo.url"
          :alt="`Photo ${index + 1}`"
          class="w-full h-full object-cover"
        >
        <button
          type="button"
          class="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          @click="handleRemove(index)"
        >
          <UIcon name="i-lucide-x" class="size-3.5" />
        </button>
        <div class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs text-center py-0.5">
          {{ index + 1 }}
        </div>
      </div>

      <!-- In-flight uploads -->
      <div
        v-for="item in uploadQueue"
        :key="item.id"
        class="relative aspect-[3/4] rounded-lg overflow-hidden bg-elevated"
      >
        <img
          :src="item.previewUrl"
          alt="Uploading..."
          class="w-full h-full object-cover"
          :class="{ 'opacity-50': item.status !== 'done' }"
        >
        <div
          v-if="item.status === 'error'"
          class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60"
        >
          <UIcon name="i-lucide-circle-alert" class="size-5 text-red-400" />
          <span class="text-xs text-red-300">Failed</span>
        </div>
        <div
          v-else-if="item.status !== 'done'"
          class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40"
        >
          <UIcon name="i-lucide-loader-circle" class="size-5 text-white animate-spin" />
          <span class="text-xs text-white/80">
            {{ item.status === 'compressing' ? 'Compressing...' : 'Uploading...' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  photos,
  addPhotos,
  removePhoto,
  isUploading,
  uploadQueue,
  isFull,
  count,
  MAX_PHOTOS,
} = usePhotoStore();

const files = ref<File[] | null>(null);

const uploadLabel = computed(() => {
  if (isUploading.value) {
    return 'Uploading...';
  }
  if (isFull.value) {
    return 'All photos uploaded';
  }
  return 'Drop your photos here or click to browse';
});

async function onFilesChanged(value: File[] | null | undefined): Promise<void> {
  if (!value || value.length === 0) {
    return;
  }
  await addPhotos(value);
  nextTick(() => {
    files.value = null;
  });
}

async function handleRemove(index: number): Promise<void> {
  await removePhoto(index);
}
</script>
