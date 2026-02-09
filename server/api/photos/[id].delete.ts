export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing photo ID' });
  }

  const storage = useStorage('photos');

  const meta = await storage.getItem(`${id}:meta`);
  if (!meta) {
    throw createError({ statusCode: 404, message: 'Photo not found' });
  }

  await storage.removeItem(id);
  await storage.removeItem(`${id}:meta`);

  return { ok: true };
});
