export default defineEventHandler(async (event) => {
  const pathname = getRouterParam(event, 'pathname');

  if (!pathname) {
    throw createError({ statusCode: 400, message: 'Missing photo pathname' });
  }

  setHeader(event, 'Content-Security-Policy', "default-src 'none';");

  return blob.serve(event, pathname);
});
