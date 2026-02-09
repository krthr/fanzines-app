import type { ConfigDefaults } from "posthog-js";

import { defineNuxtPlugin } from "#app";
import posthog from "posthog-js";

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig();
  const posthogClient = posthog.init(runtimeConfig.public.posthogPublicKey, {
    api_host: runtimeConfig.public.posthogHost,
    defaults: runtimeConfig.public.posthogDefaults as ConfigDefaults,
    loaded: (posthog) => {
      if (import.meta.env.MODE === "development") posthog.debug();
    },
    autocapture: true,
    capture_pageleave: true,
  });

  return {
    provide: {
      posthog: () => posthogClient,
    },
  };
});
