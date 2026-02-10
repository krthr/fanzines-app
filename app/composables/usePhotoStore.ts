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
      const raw = session.meta.pageTexts as unknown[];

      // Migration: detect old format (flat array of objects with `position` key)
      if (raw.length > 0 && raw[0] && typeof raw[0] === 'object' && !Array.isArray(raw[0]) && 'position' in (raw[0] as Record<string, unknown>)) {
        const posMap: Record<string, number> = { top: 10, center: 50, bottom: 90 };
        pageTexts.value = (raw as Record<string, unknown>[]).map((old) => {
          if (!old.content) return [];
          return [{
            id: crypto.randomUUID(),
            content: (old.content as string) || '',
            x: 50,
            y: posMap[(old.position as string) || 'bottom'] ?? 90,
            size: (old.size as TextSize) || 'md',
            color: (old.color as TextColor) || 'white',
            font: (old.font as TextFont) || 'sans',
            showBg: old.showBg !== false,
          }];
        });
        // Pad to 8 if needed
        while (pageTexts.value.length < MAX_PHOTOS) {
          pageTexts.value.push([]);
        }
        persistMeta();
      } else {
        pageTexts.value = raw as PageText[][];
      }
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

    // Swap corresponding page text arrays
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
    persistMeta();
    return newText;
  }

  function removePageText(pageIndex: number, textId: string): void {
    if (pageIndex < 0 || pageIndex >= MAX_PHOTOS) return;
    const texts = [...pageTexts.value];
    const pageArr = (texts[pageIndex] || []).filter(t => t.id !== textId);
    texts[pageIndex] = pageArr;
    pageTexts.value = texts;
    persistMeta();
  }

  function updatePageText(pageIndex: number, textId: string, updates: Partial<PageText>, skipPersist?: boolean): void {
    if (pageIndex < 0 || pageIndex >= MAX_PHOTOS) return;
    const texts = [...pageTexts.value];
    const pageArr = [...(texts[pageIndex] || [])];
    const idx = pageArr.findIndex(t => t.id === textId);
    if (idx === -1) return;
    pageArr[idx] = { ...pageArr[idx]!, ...updates };
    texts[pageIndex] = pageArr;
    pageTexts.value = texts;

    if (!skipPersist) {
      persistMeta();
    }
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
    persistMeta,
    isFull,
    count,
    MAX_PHOTOS,
    MAX_TEXTS_PER_PAGE,
  };
}
