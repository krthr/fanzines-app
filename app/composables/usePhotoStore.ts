import { processImages } from '~/composables/useImageProcessor';

export interface PhotoItem {
  id: string;
  url: string;
}

export type TextSize = 'sm' | 'md' | 'lg' | 'xl';
export type TextColor = 'white' | 'black' | 'rose';
export type TextFont = 'sans' | 'serif' | 'mono' | 'handwritten';

export interface PageText {
  id: string;
  content: string;
  x: number;
  y: number;
  size: TextSize;
  color: TextColor;
  font: TextFont;
  showBg: boolean;
}

const MAX_PHOTOS = 8;
const MAX_TEXTS_PER_PAGE = 3;

function createDefaultPageTexts(): PageText[][] {
  return Array.from({ length: MAX_PHOTOS }, () => []);
}

// Module-scoped state (client-only, never leaves the browser)
const photos = shallowRef<PhotoItem[]>([]);
const gap = ref<number>(0);
const pageTexts = ref<PageText[][]>(createDefaultPageTexts());
const isProcessing = ref(false);

export function usePhotoStore() {

  /**
   * Adds local photos from a file picker / drag-and-drop.
   * Images are resized and compressed before being stored so that
   * large originals (10–20 MB) don't bloat browser memory.
   */
  async function addPhotos(files: File[]): Promise<void> {
    const remaining = MAX_PHOTOS - photos.value.length;
    const toAdd = files.slice(0, remaining);

    if (toAdd.length === 0) return;

    isProcessing.value = true;
    try {
      const blobs = await processImages(toAdd);
      const newItems: PhotoItem[] = blobs.map((blob) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(blob),
      }));

      photos.value = [...photos.value, ...newItems];
    } finally {
      isProcessing.value = false;
    }
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

    // Swap corresponding page text arrays
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

  function addPageText(pageIndex: number): PageText | null {
    if (pageIndex < 0 || pageIndex >= MAX_PHOTOS) return null;
    const texts = [...pageTexts.value];
    const pageArr = [...(texts[pageIndex] || [])];
    if (pageArr.length >= MAX_TEXTS_PER_PAGE) return null;

    const newText: PageText = {
      id: crypto.randomUUID(),
      content: '',
      x: 50,
      y: 50,
      size: 'md',
      color: 'white',
      font: 'sans',
      showBg: true,
    };
    pageArr.push(newText);
    texts[pageIndex] = pageArr;
    pageTexts.value = texts;
    return newText;
  }

  function removePageText(pageIndex: number, textId: string): void {
    if (pageIndex < 0 || pageIndex >= MAX_PHOTOS) return;
    const texts = [...pageTexts.value];
    const pageArr = (texts[pageIndex] || []).filter(t => t.id !== textId);
    texts[pageIndex] = pageArr;
    pageTexts.value = texts;
  }

  function updatePageText(pageIndex: number, textId: string, updates: Partial<PageText>): void {
    if (pageIndex < 0 || pageIndex >= MAX_PHOTOS) return;
    const texts = [...pageTexts.value];
    const pageArr = [...(texts[pageIndex] || [])];
    const idx = pageArr.findIndex(t => t.id === textId);
    if (idx === -1) return;
    pageArr[idx] = { ...pageArr[idx]!, ...updates };
    texts[pageIndex] = pageArr;
    pageTexts.value = texts;
  }

  const isFull = computed(() => photos.value.length >= MAX_PHOTOS);
  const count = computed(() => photos.value.length);

  return {
    photos,
    gap,
    pageTexts,
    isProcessing,
    addPhotos,
    removePhoto,
    reorder,
    clear,
    addPageText,
    removePageText,
    updatePageText,
    isFull,
    count,
    MAX_PHOTOS,
    MAX_TEXTS_PER_PAGE,
  };
}
