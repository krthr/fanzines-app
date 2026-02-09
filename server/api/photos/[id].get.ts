interface PhotoMeta {
  filename: string;
  type: string;
  size: number;
  uploadedAt: number;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({statusCode: 400, message: 'Missing photo ID'});
  }

  const storage = useStorage('photos');

  const meta = await storage.getItem<PhotoMeta>(`${id}_meta`);
  if (!meta) {
    throw createError({statusCode: 404, message: 'Photo not found'});
  }

  const data = await storage.getItemRaw(id);
  if (!data) {
    throw createError({statusCode: 404, message: 'Photo data not found'});
  }

  setResponseHeaders(event, {
    'Content-Type': meta.type,
    'Content-Length': String(meta.size),
    'Cache-Control': 'private, max-age=86400',
  });

  return data;
});
