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
    throw createError({ statusCode: 400, message: 'No files uploaded' });
  }

  const fileParts = formData.filter((part) => part.filename && part.type);

  if (fileParts.length > MAX_FILES) {
    throw createError({
      statusCode: 400,
      message: `Too many files. Maximum is ${MAX_FILES}.`,
    });
  }

  const results: { id: string; url: string }[] = [];

  for (const part of fileParts) {
    if (!part.type || !ALLOWED_TYPES.has(part.type)) {
      throw createError({
        statusCode: 400,
        message: `Unsupported file type: ${part.type}. Allowed: JPEG, PNG, WebP, GIF.`,
      });
    }

    const id = crypto.randomUUID();
    const ext = part.filename?.split('.').pop() ?? 'bin';
    const pathname = `photos/${id}.${ext}`;

    await blob.put(pathname, part.data, {
      contentType: part.type,
      customMetadata: {
        originalFilename: part.filename ?? 'unknown',
      },
    });

    results.push({
      id: pathname,
      url: `/api/photos/${pathname}`,
    });
  }

  return { photos: results };
});
