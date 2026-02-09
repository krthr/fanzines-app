export interface PhotoItem {
  id: string;
  url: string;
}

const MAX_PHOTOS = 8;

// Module-scoped state (client-only)
const photos = shallowRef<PhotoItem[]>([]);
const gap = ref<number>(0);
const isUploading = ref(false);

export function usePhotoStore() {
  async function addPhotos(files: File[]): Promise<void> {
    const remaining = MAX_PHOTOS - photos.value.length;
    const toAdd = files.slice(0, remaining);

    if (toAdd.length === 0) return;

    isUploading.value = true;

    try {
      const formData = new FormData();
      for (const file of toAdd) {
        formData.append('file', file);
      }

      const response = await $fetch<{ photos: PhotoItem[] }>('/api/photos', {
        method: 'POST',
        body: formData,
      });

      photos.value = [...photos.value, ...response.photos];
    }
    finally {
      isUploading.value = false;
    }
  }

  async function removePhoto(index: number): Promise<void> {
    const photo = photos.value[index];
    if (!photo) return;

    await $fetch(`/api/photos/${photo.id}`, { method: 'DELETE' });

    const arr = [...photos.value];
    arr.splice(index, 1);
    photos.value = arr;
  }

  function reorder(fromIndex: number, toIndex: number): void {
    const arr = photos.value;
    if (
      fromIndex < 0
      || fromIndex >= arr.length
      || toIndex < 0
      || toIndex >= arr.length
    ) {
      return;
    }
    const next = [...arr];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item!);
    photos.value = next;
  }

  async function clear(): Promise<void> {
    await Promise.all(
      photos.value.map(photo =>
        $fetch(`/api/photos/${photo.id}`, { method: 'DELETE' }).catch(() => {}),
      ),
    );
    photos.value = [];
  }

  const isFull = computed(() => photos.value.length >= MAX_PHOTOS);
  const count = computed(() => photos.value.length);

  return {
    photos,
    gap,
    isUploading,
    addPhotos,
    removePhoto,
    reorder,
    clear,
    isFull,
    count,
    MAX_PHOTOS,
  };
}
