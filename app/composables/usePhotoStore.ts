export interface PhotoItem {
  id: string;
  url: string;
}

export interface UploadingItem {
  id: string;
  previewUrl: string;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
}

const MAX_PHOTOS = 8;
const MAX_CONCURRENT = 3;

// Module-scoped state (client-only)
const photos = shallowRef<PhotoItem[]>([]);
const gap = ref<number>(0);
const isUploading = ref(false);
const uploadQueue = shallowRef<UploadingItem[]>([]);

function updateQueueItem(id: string, patch: Partial<UploadingItem>): void {
  uploadQueue.value = uploadQueue.value.map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  );
}

async function uploadSingleFile(file: File, queueId: string): Promise<PhotoItem> {
  // Compress client-side to avoid blowing the worker memory limit
  updateQueueItem(queueId, { status: 'compressing' });
  const compressed = await compressImage(file);

  updateQueueItem(queueId, { status: 'uploading' });
  const formData = new FormData();
  formData.append('file', compressed);

  const { photo } = await $fetch<{ photo: PhotoItem }>('/api/photos', {
    method: 'POST',
    body: formData,
  });

  return photo;
}

/**
 * Processes an array of async tasks with a concurrency limit.
 * Calls `onSettled` after each task completes (success or failure)
 * so the caller can react progressively.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onSettled?: (result: PromiseSettledResult<T>, index: number) => void,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      try {
        const value = await tasks[idx]!();
        const result: PromiseFulfilledResult<T> = { status: 'fulfilled', value };
        results[idx] = result;
        onSettled?.(result, idx);
      }
      catch (reason) {
        const result: PromiseRejectedResult = { status: 'rejected', reason };
        results[idx] = result;
        onSettled?.(result, idx);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function usePhotoStore() {
  async function addPhotos(files: File[]): Promise<void> {
    const remaining = MAX_PHOTOS - photos.value.length;
    const toAdd = files.slice(0, remaining);

    if (toAdd.length === 0) return;

    isUploading.value = true;

    // Build queue items with local preview URLs
    const queueItems: UploadingItem[] = toAdd.map((file) => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      status: 'pending' as const,
    }));

    uploadQueue.value = [...uploadQueue.value, ...queueItems];

    // Create one upload task per file
    const tasks = toAdd.map((file, i) => {
      const queueItem = queueItems[i]!;
      return () => uploadSingleFile(file, queueItem.id);
    });

    await runWithConcurrency<PhotoItem>(tasks, MAX_CONCURRENT, (result, index) => {
      const queueItem = queueItems[index]!;
      if (result.status === 'fulfilled') {
        updateQueueItem(queueItem.id, { status: 'done' });
        photos.value = [...photos.value, result.value];
      }
      else {
        updateQueueItem(queueItem.id, { status: 'error' });
      }
    });

    // Revoke preview object URLs to free memory
    for (const item of queueItems) {
      URL.revokeObjectURL(item.previewUrl);
    }

    uploadQueue.value = [];
    isUploading.value = false;
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
    uploadQueue,
    addPhotos,
    removePhoto,
    reorder,
    clear,
    isFull,
    count,
    MAX_PHOTOS,
  };
}
