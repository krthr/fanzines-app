const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default defineNitroPlugin(async () => {
  const storage = useStorage('photos');

  let keys: string[];
  try {
    keys = await storage.getKeys();
  }
  catch {
    // Storage may not be initialized yet on first run
    return;
  }

  const metaKeys = keys.filter(k => k.endsWith(':meta'));

  if (metaKeys.length === 0) return;

  let cleaned = 0;
  const now = Date.now();

  for (const metaKey of metaKeys) {
    const meta = await storage.getItem<{ uploadedAt: number }>(metaKey);

    if (meta && now - meta.uploadedAt > THIRTY_DAYS_MS) {
      const id = metaKey.replace(':meta', '');
      await storage.removeItem(id);
      await storage.removeItem(metaKey);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[cleanup] Removed ${cleaned} photo(s) older than 30 days`);
  }
});
