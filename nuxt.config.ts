// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: {enabled: true},
  modules: ['@nuxt/ui', '@nuxthub/core', '@nuxt/fonts', '@nuxtjs/i18n', '@nuxtjs/seo', '@nuxt/scripts'],

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/es'],
    },
  },

  sitemap: {
    zeroRuntime: true,
  },

  site: {
    url: 'https://fanzines.app',
    name: 'Fanzine',
    description:
      'Upload 8 photos, arrange them in a beautiful layout, and export a print-ready A4 PDF -- all in your browser.',
    defaultLocale: 'en',
  },

  ogImage: false,

  fonts: {
    families: [
      {
        name: 'Space Grotesk',
        provider: 'google',
        weights: [400, 500, 600, 700],
      },
    ],
  },

  i18n: {
    locales: [
      {
        code: 'en',
        name: 'English',
        file: 'en.json',
      },
      {
        code: 'es',
        name: 'Español',
        file: 'es.json',
      },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      fallbackLocale: 'en',
      alwaysRedirect: false,
    },
  },
});