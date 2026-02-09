// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxthub/core', '@nuxt/fonts'],
  hub: {
    blob: true,
  },
  fonts: {
    families: [
      {
        name: 'Space Grotesk',
        provider: 'google',
        weights: [400, 500, 600, 700],
      },
    ],
  },
});
