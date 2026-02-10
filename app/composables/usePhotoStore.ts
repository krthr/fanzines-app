import { processImages } from '~/composables/useImageProcessor';
import {
  savePhoto,
  deletePhoto,
  saveMeta,
  loadSession,
  clearAll,
} from '~/utils/storage';

export interface PhotoItem {
  id: string;
  url: string;
}

export type TextPosition = 'top' | 'center' | 'bottom';
export type TextSize = 'sm' | 'md' | 'lg';
export type TextColor = 'white' | 'black' | 'rose';
export type TextFont = 'sans' | 'serif' | 'mono' | 'handwritten';

export interface PageText {
  content: string;
  position: TextPosition;
  size: TextSize;
  color: TextColor;
  font: TextFont;
  showBg: boolean;
}

const MAX_PHOTOS = 8;

function createDefaultPageText(): PageText {
  return { content: '', position: 'bottom', size: 'md', color: 'white', font: 'sans', showBg: true };
}

function createDefaultPageTexts(): PageText[] {
  return Array.from({ length: MAX_PHOTOS }, () => createDefaultPageText());
}

// Module-scoped state (client-only, never leaves the browser)
const photos = shallowRef<PhotoItem[]>([]);
const gap = ref<number>(0);
const pageTexts = ref<PageText[]>(createDefaultPageTexts());
const isProcessing = ref(false);

// --- Persistence helpers ---

let restored = false;

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  return res.blob();
}

function persistPhotos(): void {
  const items = photos.value;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    fetchBlob(item.url).then(blob => savePhoto(item.id, blob, i));
  }
}

function persistMeta(): void {
  saveMeta(gap.value, pageTexts.value);
}

async function restoreSession(): Promise<void> {
  try {
    const session = await loadSession();

    if (session.photos.length > 0) {
      photos.value = session.photos.map(p => ({
        id: p.id,
        url: URL.createObjectURL(p.blob),
      }));
    }

    if (session.meta) {
      gap.value = session.meta.gap;
      pageTexts.value = session.meta.pageTexts as PageText[];
    }
  } catch {
    // IndexedDB unavailable or corrupt — start fresh
  }
}

export function usePhotoStore() {
  if (!restored) {
    restored = true;
    restoreSession();

    // Watch gap for changes and persist
    watch(gap, () => persistMeta());
  }

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

      // Persist all photos (re-save with correct order indices)
      persistPhotos();
      persistMeta();
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

    // Remove from IndexedDB and re-save remaining orders
    deletePhoto(photo.id);
    persistPhotos();
    persistMeta();
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

    persistPhotos();
    persistMeta();
  }

  function clear(): void {
    for (const photo of photos.value) {
      URL.revokeObjectURL(photo.url);
    }
    photos.value = [];
    pageTexts.value = createDefaultPageTexts();

    clearAll();
  }

  function updatePageText(index: number, updates: Partial<PageText>): void {
    if (index < 0 || index >= MAX_PHOTOS) return;
    const texts = [...pageTexts.value];
    texts[index] = { ...texts[index]!, ...updates };
    pageTexts.value = texts;

    persistMeta();
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
    updatePageText,
    isFull,
    count,
    MAX_PHOTOS,
  };
}
