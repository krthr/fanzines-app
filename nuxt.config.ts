import type {ConfigDefaults} from 'posthog-js';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: {enabled: true},
  modules: [
    '@nuxt/ui',
    '@nuxthub/core',
    '@nuxt/fonts',
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
  ],

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/es'],
    },
  },

  sitemap: {
    zeroRuntime: true,
    urls: ['/', '/es'],
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
        name: 'Special Elite',
        provider: 'google',
        weights: [400],
      },
      {
        name: 'Libre Baskerville',
        provider: 'google',
        weights: [400, 700],
      },
      {
        name: 'Courier Prime',
        provider: 'google',
        weights: [400, 700],
      },
      {
        name: 'Caveat',
        provider: 'google',
        weights: [400, 500, 700],
      },
      {
        name: 'Bebas Neue',
        provider: 'google',
        weights: [400],
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

  runtimeConfig: {
    public: {
      posthogPublicKey: 'phc_2q7YqkDc6YWCcKbABw17og6q1BKTSV00hTpmkGLLuV7',
      posthogHost: 'https://us.i.posthog.com',
      posthogDefaults: '2025-11-30' satisfies ConfigDefaults,
    },
  },
});
