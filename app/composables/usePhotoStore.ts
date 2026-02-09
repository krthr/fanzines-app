export interface PhotoItem {
  id: string;
  url: string;
}

const MAX_PHOTOS = 8;

// Module-scoped state (client-only, never leaves the browser)
const photos = shallowRef<PhotoItem[]>([]);
const gap = ref<number>(0);

export function usePhotoStore() {
  /**
   * Adds local photos from a file picker / drag-and-drop.
   * Creates in-memory blob URLs -- nothing is sent to a server.
   */
  function addPhotos(files: File[]): void {
    const remaining = MAX_PHOTOS - photos.value.length;
    const toAdd = files.slice(0, remaining);

    if (toAdd.length === 0) return;

    const newItems: PhotoItem[] = toAdd.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
    }));

    photos.value = [...photos.value, ...newItems];
  }

  function removePhoto(index: number): void {
    const photo = photos.value[index];
    if (!photo) return;

    URL.revokeObjectURL(photo.url);

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
    const temp = next[fromIndex]!;
    next[fromIndex] = next[toIndex]!;
    next[toIndex] = temp;
    photos.value = next;
  }

  function clear(): void {
    for (const photo of photos.value) {
      URL.revokeObjectURL(photo.url);
    }
    photos.value = [];
  }

  const isFull = computed(() => photos.value.length >= MAX_PHOTOS);
  const count = computed(() => photos.value.length);

  return {
    photos,
    gap,
    addPhotos,
    removePhoto,
    reorder,
    clear,
    isFull,
    count,
    MAX_PHOTOS,
  };
}
