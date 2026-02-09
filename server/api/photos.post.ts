const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No files uploaded' });
  }

  const fileParts = formData.filter((part) => part.filename && part.type);

  if (fileParts.length !== 1) {
    throw createError({
      statusCode: 400,
      message: 'Exactly one file per request is required.',
    });
  }

  const part = fileParts[0]!;

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

  return {
    photo: {
      id: pathname,
      url: `/api/photos/${pathname}`,
    },
  };
});
