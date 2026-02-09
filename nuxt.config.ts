import type { ConfigDefaults } from "posthog-js";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "@nuxthub/core",
    "@nuxt/fonts",
    "@nuxtjs/i18n",
    "@nuxtjs/seo",
    "@vite-pwa/nuxt",
  ],

  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Fanzine",
      short_name: "Fanzine",
      theme_color: "#ffffff",
      icons: [
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: "module",
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/", "/es"],
    },
  },

  sitemap: {
    zeroRuntime: true,
  },

  site: {
    url: "https://fanzines.app",
    name: "Fanzine",
    description:
      "Upload 8 photos, arrange them in a beautiful layout, and export a print-ready A4 PDF -- all in your browser.",
    defaultLocale: "en",
  },

  ogImage: false,

  fonts: {
    families: [
      {
        name: "Space Grotesk",
        provider: "google",
        weights: [400, 500, 600, 700],
      },
    ],
  },

  i18n: {
    locales: [
      {
        code: "en",
        name: "English",
        file: "en.json",
      },
      {
        code: "es",
        name: "Español",
        file: "es.json",
      },
    ],
    defaultLocale: "en",
    strategy: "prefix_except_default",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_locale",
      fallbackLocale: "en",
      alwaysRedirect: false,
    },
  },

  runtimeConfig: {
    public: {
      posthogPublicKey: "phc_2q7YqkDc6YWCcKbABw17og6q1BKTSV00hTpmkGLLuV7",
      posthogHost: "https://us.i.posthog.com",
      posthogDefaults: "2025-11-30" satisfies ConfigDefaults,
    },
  },
});
