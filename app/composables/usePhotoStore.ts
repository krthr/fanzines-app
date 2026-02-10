export interface PhotoItem {
  id: string;
  url: string;
}

export type TextPosition = 'top' | 'bottom';
export type TextSize = 'sm' | 'md' | 'lg';
export type TextColor = 'white' | 'black' | 'rose';

export interface PageText {
  content: string;
  position: TextPosition;
  size: TextSize;
  color: TextColor;
}

const MAX_PHOTOS = 8;

function createDefaultPageText(): PageText {
  return { content: '', position: 'bottom', size: 'md', color: 'white' };
}

function createDefaultPageTexts(): PageText[] {
  return Array.from({ length: MAX_PHOTOS }, () => createDefaultPageText());
}

// Module-scoped state (client-only, never leaves the browser)
const photos = shallowRef<PhotoItem[]>([]);
const gap = ref<number>(0);
const pageTexts = ref<PageText[]>(createDefaultPageTexts());

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

    // Swap corresponding page texts
    const texts = [...pageTexts.value];
    const tmpText = texts[fromIndex]!;
    texts[fromIndex] = texts[toIndex]!;
    texts[toIndex] = tmpText;
    pageTexts.value = texts;
  }

  function clear(): void {
    for (const photo of photos.value) {
      URL.revokeObjectURL(photo.url);
    }
    photos.value = [];
    pageTexts.value = createDefaultPageTexts();
  }

  function updatePageText(index: number, updates: Partial<PageText>): void {
    if (index < 0 || index >= MAX_PHOTOS) return;
    const texts = [...pageTexts.value];
    texts[index] = { ...texts[index]!, ...updates };
    pageTexts.value = texts;
  }

  const isFull = computed(() => photos.value.length >= MAX_PHOTOS);
  const count = computed(() => photos.value.length);

  return {
    photos,
    gap,
    pageTexts,
    addPhotos,
    removePhoto,
    reorder,
    clear,
    updatePageText,
    isFull,
    count,
    MAX_PHOTOS,
  };
}
