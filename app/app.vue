<template>
  <NuxtRouteAnnouncer />

  <UApp>
    <UHeader title="Fanzine" to="/">
      <template #title>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-book-image" class="size-6 text-primary" />
          <span class="text-lg font-bold tracking-tight">Fanzine</span>
        </div>
      </template>

      <template #right>
        <UTooltip text="Toggle dark mode">
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
          Create print-ready photo zines
        </p>
      </template>

      <template #right>
        <p class="text-muted text-xs">
          &copy; {{ new Date().getFullYear() }} Fanzine
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
