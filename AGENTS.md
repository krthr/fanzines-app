# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

- **App name:** fanzine-app -- a client-side photo zine creator (8 photos -> printable A4 PDF)
- **Framework:** Nuxt 4 (Vue 3 meta-framework with SSR/SSG/SPA support)
- **Language:** TypeScript (ES Modules, `"type": "module"`)
- **UI library:** Nuxt UI 4 (`@nuxt/ui`) with Tailwind CSS 4
- **Package manager:** Yarn 4 (Berry) with `node-modules` linker
- **Deployment:** NuxtHub on Cloudflare (`@nuxthub/core` + `wrangler.jsonc`)
- **Monorepo:** No -- single-package repository

## Project Structure

```
app/                  # Nuxt 4 app directory (all application source code)
  app.vue             # Root component (UApp shell with header, main, footer)
  app.config.ts       # App config (UI theme colors: primary=rose, neutral=zinc)
  assets/css/         # Global stylesheets (Tailwind + Nuxt UI imports)
  pages/              # File-based routing (single page: index.vue)
  components/         # Auto-imported Vue components
  composables/        # Auto-imported composables (usePhotoStore, useFanzineLayout, useExportPdf)
  plugins/            # Nuxt plugins (posthog.client.ts)
  layouts/            # Layout components (create as needed)
  middleware/         # Route middleware (create as needed)
  utils/              # Auto-imported utility functions (create as needed)
i18n/locales/         # Locale JSON files (en.json, es.json)
public/               # Static assets served at root (favicon, PWA icons)
server/               # Server-side code: API routes, middleware (create as needed)
nuxt.config.ts        # Nuxt configuration (modules, PWA, i18n, fonts, SEO, runtimeConfig)
tsconfig.json         # TypeScript config (delegates to .nuxt/ generated configs)
wrangler.jsonc        # Cloudflare Workers config
```

## Build / Dev / Lint / Test Commands

All commands use `yarn` (never `npm` or `npx`).

```bash
yarn dev              # Start dev server with HMR (http://localhost:3000)
yarn build            # Production build (SSR by default)
yarn generate         # Static site generation (pre-renders / and /es)
yarn preview          # Preview the production build locally
yarn postinstall      # Runs `nuxt prepare` (generates .nuxt/ types)
yarn nuxi typecheck   # Full TypeScript type-checking (no tsc script)
```

**Linting:** No linter configured. If adding one, use `@nuxt/eslint` module.
**Testing:** No test runner configured. If adding one, use Vitest (`@nuxt/test-utils`).

```bash
# When configured:
# yarn vitest run path/to/file.test.ts    # Single test file
# yarn vitest run -t "test name"          # Single test by name
```

## Nuxt Modules (in `nuxt.config.ts`)

`@nuxt/ui`, `@nuxthub/core`, `@nuxt/fonts`, `@nuxtjs/i18n`, `@nuxtjs/seo`, `@vite-pwa/nuxt`

## Code Style Guidelines

### Vue Single-File Components (SFCs)

- Use `<script setup lang="ts">` for all components (Composition API only).
- Section order: `<template>`, then `<script setup>`, then `<style>`.
- Rely on Nuxt auto-imports: do NOT manually import Vue APIs (`ref`, `computed`, `watch`,
  `onMounted`, etc.), composables from `composables/`, components from `components/`,
  or utilities from `utils/`. Only import third-party packages and type-only imports explicitly.
- Group explicit imports: (1) type imports, (2) third-party -- separated by blank lines.

### TypeScript

- Use TypeScript for all `.ts` files and `<script setup lang="ts">` blocks.
- Prefer `interface` over `type` for object shapes.
- Use explicit return types on exported functions and composables.
- Use `defineProps<T>()` and `defineEmits<T>()` with type-only generics (no runtime declaration).
- Avoid `any`; use `unknown` and narrow with type guards when the type is uncertain.
- Path alias: `~/` resolves to the `app/` directory (e.g., `~/components/Foo.vue`).

### Naming Conventions

- **Components:** PascalCase filenames (`UserProfile.vue`), used as `<UserProfile />`.
- **Composables:** camelCase prefixed with `use` (`useAuth.ts` -> `useAuth()`).
- **Pages:** kebab-case matching URL segments (`user-profile.vue` -> `/user-profile`).
- **API routes:** kebab-case in `server/api/` with method suffix (`user-list.get.ts`).
- **Variables/functions:** camelCase. **Constants:** UPPER_SNAKE_CASE.
- **Types/Interfaces:** PascalCase (`interface UserProfile { ... }`).
- **Events:** kebab-case in templates (`@update-value`), camelCase in `defineEmits`.

### Formatting

- 2-space indentation in all files (`.vue`, `.ts`, `.css`, `.json`).
- Single quotes for JS/TS string literals.
- Trailing commas in multiline objects, arrays, and function parameters.
- Semicolons at end of statements.
- Max line length: aim for 100 characters, hard limit 120.

### Styling with Tailwind CSS 4 and Nuxt UI

- Use Tailwind utility classes directly in templates; avoid custom CSS when possible.
- Use Nuxt UI components (`UButton`, `UInput`, `UCard`, `UStepper`, etc.) as primary primitives.
- Icons use Lucide via UIcon: `<UIcon name="i-lucide-arrow-right" class="size-4" />`.
- Global CSS lives in `app/assets/css/main.css`; keep it minimal.
- Tailwind CSS 4 uses CSS-native `@import` and `@theme` -- no `tailwind.config.ts`.
- UI theme colors are set in `app/app.config.ts` (primary: rose, neutral: zinc).

### Internationalization (i18n)

- All user-facing strings go through i18n. Never hardcode display text.
- Use `$t('key')` in templates, `const { t } = useI18n()` in script setup.
- Locale files: `i18n/locales/en.json` (default) and `i18n/locales/es.json`.
- Strategy: `prefix_except_default` (English at `/`, Spanish at `/es`).
- Keep both locale files in sync -- every key in `en.json` must exist in `es.json`.

### Error Handling

- In composables: return error state via reactive refs or throw typed errors.
- In server API routes: use `createError({ statusCode, message })` from Nuxt.
- In components: use `<NuxtErrorBoundary>` for graceful error UI.
- Never silently swallow errors; always log or surface them.

### Nuxt-Specific Patterns

- Use `useFetch` or `useAsyncData` for data fetching (SSR-compatible, auto-deduped).
- Use `useState` for SSR-safe shared state (not plain `ref` at module scope).
- Use `definePageMeta()` for page-level metadata (layout, middleware).
- Use `useSeoMeta()` for SEO/OG tags (see `index.vue` for the pattern).
- Server API routes go in `server/api/` with method suffixes (`.get.ts`, `.post.ts`).
- Environment variables: use `runtimeConfig` in `nuxt.config.ts`, access via `useRuntimeConfig()`.
  Never read `process.env` directly in app code.

## Installing Dependencies

```bash
yarn add <package>            # Runtime dependency
yarn add -D <package>         # Dev dependency
```

## Git Conventions

- `.nuxt/`, `.output/`, `.data/`, `node_modules/`, and `.env*` are gitignored.
- Do not commit generated files or lock file changes unrelated to dependency updates.

## Key Config Files

| File              | Purpose                                          |
|-------------------|--------------------------------------------------|
| `nuxt.config.ts`  | Modules, CSS, PWA, i18n, fonts, SEO, runtimeConfig |
| `app/app.config.ts` | UI theme (Nuxt UI color palette)               |
| `tsconfig.json`   | TS project references (delegates to `.nuxt/`)    |
| `.yarnrc.yml`     | Yarn Berry config (`nodeLinker: node-modules`)   |
| `wrangler.jsonc`  | Cloudflare Workers deployment settings           |
| `package.json`    | Dependencies, scripts, package manager field     |
