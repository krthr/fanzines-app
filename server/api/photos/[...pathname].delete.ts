export default defineEventHandler(async (event) => {
  const pathname = getRouterParam(event, 'pathname');

  if (!pathname) {
    throw createError({ statusCode: 400, message: 'Missing photo pathname' });
  }

  await blob.del(pathname);

  return sendNoContent(event);
});
