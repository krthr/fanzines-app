# Fanzine UI Improvement Plan

## Overview
Modernize the Fanzine photo-zine creator with a DIY zine aesthetic using rose/pink primary color,
proper app layout (header/footer), improved component polish, and dark mode support.

## Steps

### 1. Create `app/app.config.ts`
Set theme colors: primary=rose, neutral=zinc

### 2. Install `@nuxt/fonts` ✅ (already done)
Add to nuxt.config.ts modules array

### 3. Edit `nuxt.config.ts`
Add @nuxt/fonts module

### 4. Edit `app/assets/css/main.css`
Add font family overrides, CSS variable tweaks, body styling

### 5. Edit `app/app.vue`
Add UHeader + UMain + UFooter layout

### 6. Edit `app/pages/index.vue`
Hero section, UCard wrapping, improved stepper

### 7. Edit `app/components/PhotoUploader.vue`
Better drop zone, progress bar, toast notifications

### 8. Edit `app/components/FanzineGrid.vue`
Swap animation, improved selection state

### 9. Edit `app/components/FanzinePreview.vue`
Card wrapper, paper effect, prominent download
