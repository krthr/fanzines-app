# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

See `AGENTS.md` for full code style guidelines, naming conventions, and Nuxt-specific patterns.

## Commands

All commands use `yarn` (never `npm` or `npx`).

```bash
yarn dev              # Dev server at http://localhost:3000
yarn build            # Production build
yarn generate         # Static site generation (pre-renders / and /es)
yarn preview          # Preview production build
yarn nuxi typecheck   # TypeScript type-checking
```

No linter or test runner is configured yet. If adding: `@nuxt/eslint` for linting, Vitest with `@nuxt/test-utils` for testing.

## Architecture

**Nuxt 4 + Vue 3 + TypeScript** single-page app that creates printable 8-page photo zines entirely client-side. Photos never leave the browser.

### Core Workflow (3-step stepper in `app/pages/index.vue`)
1. **Upload** — User selects 8 photos → resized/compressed client-side (`useImageProcessor`)
2. **Arrange** — Interactive 4×2 grid with reorder and text overlay modes (`FanzineGrid.vue`)
3. **Export** — Renders to canvas at 300 DPI and generates A4 PDF (`useExportPdf` + jspdf)

### State Management
State lives in module-scoped reactive refs in `app/composables/usePhotoStore.ts` — not Pinia, not `useState`. This is intentional: all data is client-only (photos as blob URLs, text overlays, layout config). Other composables (`useFanzineLayout`, `useExportPdf`, `useImageProcessor`, `useDragText`) consume this state.

### Fanzine Layout (domain knowledge)
The A4 landscape page is a 4×2 grid. The **top row is printed upside-down** (rotated 180°) so that when the sheet is folded into a booklet, all pages read correctly. The mapping from grid position to booklet page order is defined in `app/composables/useFanzineLayout.ts`.

### Styling
- **Tailwind CSS 4** with native CSS `@theme` — no `tailwind.config.ts` file
- Custom theme defined in `app/assets/css/main.css` (paper grain, harsh shadows, brutalist aesthetic)
- UI theme colors in `app/app.config.ts`: primary=fuchsia, neutral=zinc, zero border radius
- Icons: Lucide via `<UIcon name="i-lucide-{name}" />`

### i18n
English (`/`) and Spanish (`/es`). Locale files at `i18n/locales/{en,es}.json`. All user-facing strings must go through `$t()` / `useI18n()`. Keep both locale files in sync.

### Deployment
NuxtHub on Cloudflare Workers. Config in `wrangler.jsonc`.

## Key Conventions

- `<script setup lang="ts">` for all components; template-first section order
- Nuxt auto-imports: do NOT manually import Vue APIs, composables, components, or utils
- `~/` path alias resolves to `app/` directory
- 2-space indent, single quotes, trailing commas, semicolons
- Use Nuxt UI components (`UButton`, `UCard`, `UStepper`, etc.) as primary building blocks
