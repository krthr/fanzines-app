const DB_NAME = 'fanzine-drafts';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
): IDBTransaction {
  return db.transaction(stores, mode);
}

export async function savePhoto(id: string, blob: Blob, order: number): Promise<void> {
  const db = await openDB();
  const t = tx(db, 'photos', 'readwrite');
  t.objectStore('photos').put({ id, blob, order });
  return new Promise((resolve, reject) => {
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB();
  const t = tx(db, 'photos', 'readwrite');
  t.objectStore('photos').delete(id);
  return new Promise((resolve, reject) => {
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export async function clearPhotos(): Promise<void> {
  const db = await openDB();
  const t = tx(db, 'photos', 'readwrite');
  t.objectStore('photos').clear();
  return new Promise((resolve, reject) => {
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export async function saveMeta(gap: number, pageTexts: unknown[]): Promise<void> {
  const db = await openDB();
  const t = tx(db, 'meta', 'readwrite');
  t.objectStore('meta').put({ gap, pageTexts }, 'session');
  return new Promise((resolve, reject) => {
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export interface StoredPhoto {
  id: string;
  blob: Blob;
  order: number;
}

export interface StoredMeta {
  gap: number;
  pageTexts: unknown[];
}

export async function loadSession(): Promise<{
  photos: StoredPhoto[];
  meta: StoredMeta | null;
}> {
  const db = await openDB();

  const photos = await new Promise<StoredPhoto[]>((resolve, reject) => {
    const t = tx(db, 'photos', 'readonly');
    const req = t.objectStore('photos').getAll();
    req.onsuccess = () => resolve(req.result as StoredPhoto[]);
    req.onerror = () => reject(req.error);
  });

  const meta = await new Promise<StoredMeta | null>((resolve, reject) => {
    const t = tx(db, 'meta', 'readonly');
    const req = t.objectStore('meta').get('session');
    req.onsuccess = () => resolve((req.result as StoredMeta) ?? null);
    req.onerror = () => reject(req.error);
  });

  db.close();

  photos.sort((a, b) => a.order - b.order);
  return { photos, meta };
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  const t = tx(db, ['photos', 'meta'], 'readwrite');
  t.objectStore('photos').clear();
  t.objectStore('meta').clear();
  return new Promise((resolve, reject) => {
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}
