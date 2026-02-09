export interface PhotoItem {
  file: File;
  url: string;
}

const MAX_PHOTOS = 8;

// Module-scoped state (client-only — blob URLs and File objects can't be SSR'd)
const photos = shallowRef<PhotoItem[]>([]);
const gap = ref<number>(0);

export function usePhotoStore() {
  function addPhotos(files: File[]): void {
    const remaining = MAX_PHOTOS - photos.value.length;
    const toAdd = files.slice(0, remaining);
    const newItems = toAdd.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));
    photos.value = [...photos.value, ...newItems];
  }

  function removePhoto(index: number): void {
    const removed = photos.value[index];
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
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
