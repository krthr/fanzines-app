<template>
  <NuxtRouteAnnouncer />

  <UApp :locale="uiLocale">
    <UHeader title="Fanzine" to="/">
      <template #title>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-book-image" class="size-6 text-primary" />
          <span class="text-lg font-bold tracking-tight">Fanzine</span>
        </div>
      </template>

      <template #right>
        <ULocaleSelect
          :model-value="locale"
          :locales="availableLocales"
          class="w-40"
          @update:model-value="setLocale($event as 'en' | 'es')"
        />

        <UTooltip :text="$t('app.toggleDarkMode')">
          <UColorModeButton />
        </UTooltip>
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <USeparator icon="i-lucide-scissors" type="dashed" class="mt-12" />

    <UFooter>
      <template #left>
        <p class="text-muted text-sm">
          {{ $t('app.tagline') }}
        </p>
      </template>

      <template #right>
        <p class="text-muted text-xs">
          &copy; {{ new Date().getFullYear() }} {{ $t('app.copyright') }}
        </p>
      </template>
    </UFooter>
  </UApp>
</template>

<script setup lang="ts">
import { en, es } from '@nuxt/ui/locale';

const uiLocaleMap: Record<string, typeof en> = { en, es };

const { locale, setLocale } = useI18n();

const uiLocale = computed(() => uiLocaleMap[locale.value] ?? en);

const availableLocales = [en, es];

useHead({
  htmlAttrs: {
    lang: locale,
  },
});

useSchemaOrg([
  defineWebSite({
    name: 'Fanzine',
  }),
  defineWebPage(),
]);
</script>
