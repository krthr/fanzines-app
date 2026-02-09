const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILES = 8;

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);

  if (!formData || formData.length === 0) {
    throw createError({statusCode: 400, message: 'No files uploaded'});
  }

  const fileParts = formData.filter((part) => part.filename && part.type);

  if (fileParts.length > MAX_FILES) {
    throw createError({
      statusCode: 400,
      message: `Too many files. Maximum is ${MAX_FILES}.`,
    });
  }

  const storage = useStorage('photos');
  const results: {id: string; url: string}[] = [];

  for (const part of fileParts) {
    if (!part.type || !ALLOWED_TYPES.has(part.type)) {
      throw createError({
        statusCode: 400,
        message: `Unsupported file type: ${part.type}. Allowed: JPEG, PNG, WebP, GIF.`,
      });
    }

    const id = crypto.randomUUID();

    await storage.setItemRaw(id, part.data);
    await storage.setItem(`${id}_meta`, {
      filename: part.filename,
      type: part.type,
      size: part.data.length,
      uploadedAt: Date.now(),
    });

    results.push({
      id,
      url: `/api/photos/${id}`,
    });
  }

  return {photos: results};
});
