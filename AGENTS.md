# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

- **App name:** fanzine-app
- **Framework:** Nuxt 4 (Vue 3 meta-framework with SSR/SSG/SPA support)
- **Language:** TypeScript (ES Modules, `"type": "module"`)
- **UI library:** Nuxt UI 4 (`@nuxt/ui`) with Tailwind CSS 4
- **Package manager:** Yarn 4 (Berry) with `node-modules` linker
- **Monorepo:** No -- single-package repository

## Project Structure

```
app/                  # Application source code (Nuxt 4 app directory)
  app.vue             # Root component (UApp shell + NuxtPage)
  assets/css/         # Global stylesheets (Tailwind + Nuxt UI imports)
  pages/              # File-based routing (Vue components -> routes)
  components/         # Auto-imported Vue components (create as needed)
  composables/        # Auto-imported composables/hooks (create as needed)
  layouts/            # Layout components (create as needed)
  middleware/         # Route middleware (create as needed)
  plugins/            # Nuxt plugins (create as needed)
  utils/              # Auto-imported utility functions (create as needed)
public/               # Static assets served at root (favicon, robots.txt)
server/               # Server-side code: API routes, middleware (create as needed)
nuxt.config.ts        # Nuxt configuration
tsconfig.json         # TypeScript config (delegates to .nuxt/ generated configs)
```

## Build / Dev / Preview Commands

All commands use `yarn` (never `npm` or `npx`).

```bash
yarn dev              # Start dev server with HMR (http://localhost:3000)
yarn build            # Production build (SSR by default)
yarn generate         # Static site generation (pre-renders all routes)
yarn preview          # Preview the production build locally
yarn postinstall      # Runs `nuxt prepare` (generates .nuxt/ types)
```

## Installing Dependencies

```bash
yarn add <package>            # Add a runtime dependency
yarn add -D <package>         # Add a dev dependency
```

## Type Checking

```bash
yarn nuxi typecheck           # Run full TypeScript type-checking
```

No explicit `tsc` script exists; use `nuxi typecheck` for standalone checks.
The `tsconfig.json` at root delegates to auto-generated configs in `.nuxt/`.

## Linting and Formatting

No linter or formatter is currently configured. If adding one, prefer:
- **ESLint:** Use `@nuxt/eslint` module (add to `nuxt.config.ts` modules array)
- **Prettier:** Not currently installed; if added, use a `.prettierrc` at root

Until a linter is set up, follow the style conventions below manually.

## Testing

No test runner is currently configured. If adding one, prefer:
- **Vitest** for unit/component tests (first-class Nuxt support via `@nuxt/test-utils`)
- **Playwright** for end-to-end tests

When a test runner is set up, document single-test commands here:
```bash
# Example (not yet configured):
# yarn vitest run path/to/file.test.ts          # Run a single test file
# yarn vitest run -t "test name"                 # Run a single test by name
# yarn playwright test path/to/file.spec.ts      # Run a single e2e test
```

## Code Style Guidelines

### Vue Single-File Components (SFCs)

- Use `<script setup lang="ts">` for all components (Composition API only).
- Template section comes first (`<template>`), then `<script setup>`, then `<style>`.
- Exception: `app.vue` uses template-only format when no script logic is needed.
- Use Nuxt auto-imports: do NOT manually import Vue APIs (`ref`, `computed`, `watch`,
  `onMounted`, etc.), composables from `composables/`, components from `components/`,
  or utilities from `utils/`. Nuxt auto-imports all of these.

### TypeScript

- Use TypeScript for all `.ts` files and `<script setup lang="ts">` blocks.
- Prefer `interface` over `type` for object shapes.
- Use explicit return types on exported functions and composables.
- Use `defineProps<T>()` and `defineEmits<T>()` with type-only generics (no runtime declaration).
- Avoid `any`; use `unknown` and narrow with type guards when the type is uncertain.
- Use absolute path aliases: `~/` resolves to the `app/` directory (e.g., `~/components/Foo.vue`).

### Naming Conventions

- **Components:** PascalCase filenames (`UserProfile.vue`), used as `<UserProfile />` in templates.
- **Composables:** camelCase filenames prefixed with `use` (`useAuth.ts` -> `useAuth()`).
- **Pages:** kebab-case filenames matching URL segments (`user-profile.vue` -> `/user-profile`).
- **API routes:** kebab-case in `server/api/` (`server/api/user-list.get.ts`).
- **Variables/functions:** camelCase.
- **Constants:** UPPER_SNAKE_CASE for true compile-time constants; camelCase otherwise.
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
- Use Nuxt UI components (`UButton`, `UInput`, `UCard`, `UPage`, etc.) as the primary UI primitives.
- Global CSS lives in `app/assets/css/main.css`; keep it minimal.
- For component-scoped styles, use `<style scoped>` with Tailwind `@apply` sparingly.
- Tailwind CSS 4 uses CSS-native `@import` and `@theme` -- no `tailwind.config.ts` file.

### Imports

- Rely on Nuxt auto-imports for Vue APIs, components, composables, and utils.
- Only add explicit imports for third-party libraries or non-auto-imported modules.
- Group explicit imports: (1) Vue/Nuxt, (2) third-party, (3) local modules -- separated by blank lines.
- Use named exports; avoid default exports except for page/layout/plugin files that Nuxt expects.

### Error Handling

- In composables: return error state via reactive refs or throw typed errors.
- In server API routes (`server/api/`): use `createError({ statusCode, message })` from Nuxt.
- In components: use `<NuxtErrorBoundary>` for graceful error UI.
- Never silently swallow errors; always log or surface them.

### Nuxt-Specific Patterns

- Use `useFetch` or `useAsyncData` for data fetching (SSR-compatible, auto-deduped).
- Use `useState` for SSR-safe shared state (not plain `ref` at module scope).
- Use `definePageMeta()` for page-level metadata (layout, middleware, etc.).
- Use `useHead()` or `useSeoMeta()` for document head management.
- Server API routes go in `server/api/` with HTTP method suffixes (`.get.ts`, `.post.ts`).
- Middleware goes in `app/middleware/`; use `defineNuxtRouteMiddleware`.
- Environment variables: use `runtimeConfig` in `nuxt.config.ts`, access via `useRuntimeConfig()`.
  Never read `process.env` directly in app code.

## Git Conventions

- `.nuxt/`, `.output/`, `node_modules/`, and `.env*` files are gitignored.
- Do not commit generated files or lock file changes unrelated to dependency updates.

## Key Config Files

| File              | Purpose                                      |
|-------------------|----------------------------------------------|
| `nuxt.config.ts`  | Nuxt modules, CSS, devtools, runtime config  |
| `tsconfig.json`   | TS project references (delegates to `.nuxt/`)|
| `.yarnrc.yml`     | Yarn Berry config (`nodeLinker: node-modules`)|
| `package.json`    | Dependencies, scripts, package manager field |
