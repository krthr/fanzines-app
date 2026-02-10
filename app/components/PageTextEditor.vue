<template>
  <div class="p-3 space-y-3 w-64">
    <!-- Page role label -->
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-muted uppercase tracking-wide">
        {{ $t(labelKey) }}
      </span>
    </div>

    <!-- Text box tabs -->
    <div class="flex items-center gap-1">
      <button
        v-for="(text, i) in texts"
        :key="text.id"
        class="px-2 py-0.5 text-xs font-semibold border-2 transition-colors"
        :class="activeTextId === text.id
          ? 'border-primary text-primary bg-primary/10'
          : 'border-zinc-300 dark:border-zinc-600 text-muted hover:border-zinc-400'"
        @click="emit('select:text', text.id)"
      >
        {{ i + 1 }}
      </button>
      <button
        v-if="texts.length < maxTexts"
        class="px-2 py-0.5 text-xs font-semibold border-2 border-dashed border-zinc-300 dark:border-zinc-600 text-muted hover:border-primary hover:text-primary transition-colors"
        :title="$t('text.addTextBox')"
        @click="emit('add:text')"
      >
        +
      </button>
      <span
        v-if="texts.length >= maxTexts"
        class="text-[10px] text-muted ml-1"
      >
        {{ $t('text.maxReached') }}
      </span>
    </div>

    <!-- Active text editor -->
    <template v-if="activeText">
      <!-- Text input -->
      <UTextarea
        :model-value="activeText.content"
        :placeholder="placeholderText"
        :rows="2"
        :maxlength="60"
        autoresize
        size="sm"
        @update:model-value="
          emit('update:text', activeText!.id, { content: $event })
        "
      />

      <!-- Drag hint -->
      <p class="text-[10px] text-muted italic">
        {{ $t('text.dragHint') }}
      </p>

      <!-- Font picker -->
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted">{{
          $t('text.font')
        }}</label>
        <div class="flex gap-1">
          <UButton
            v-for="f in fonts"
            :key="f.value"
            :label="$t(f.labelKey)"
            size="xs"
            :class="f.fontClass"
            :variant="activeText.font === f.value ? 'soft' : 'ghost'"
            :color="activeText.font === f.value ? 'primary' : 'neutral'"
            @click="emit('update:text', activeText!.id, { font: f.value })"
          />
        </div>
      </div>

      <!-- Size presets -->
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted">{{
          $t('text.size')
        }}</label>
        <div class="flex gap-1">
          <UButton
            v-for="s in sizes"
            :key="s.value"
            :label="s.label"
            size="xs"
            :variant="activeText.size === s.value ? 'soft' : 'ghost'"
            :color="activeText.size === s.value ? 'primary' : 'neutral'"
            @click="emit('update:text', activeText!.id, { size: s.value })"
          />
        </div>
      </div>

      <!-- Color presets -->
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted">{{
          $t('text.color')
        }}</label>
        <div class="flex gap-1.5">
          <button
            v-for="c in colors"
            :key="c.value"
            class="size-6 border-2"
            :class="[
              c.bg,
              activeText.color === c.value
                ? 'border-primary scale-110 ring-2 ring-primary/30'
                : 'border-zinc-300 dark:border-zinc-600',
            ]"
            :title="c.label"
            @click="emit('update:text', activeText!.id, { color: c.value })"
          />
        </div>
      </div>

      <!-- Background toggle -->
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium text-muted">{{
          $t('text.background')
        }}</label>
        <USwitch
          :model-value="activeText.showBg"
          size="xs"
          @update:model-value="
            emit('update:text', activeText!.id, { showBg: $event })
          "
        />
      </div>

      <!-- Remove button -->
      <div class="pt-1 border-t border-zinc-200 dark:border-zinc-700">
        <UButton
          :label="$t('text.removeTextBox')"
          icon="i-lucide-trash-2"
          size="xs"
          variant="ghost"
          color="error"
          class="w-full"
          @click="emit('remove:text', activeText!.id)"
        />
      </div>
    </template>

    <!-- Empty state: no texts yet -->
    <div v-else class="text-center py-2">
      <p class="text-xs text-muted mb-2">{{ $t('text.addTextBox') }}</p>
      <UButton
        v-if="texts.length < maxTexts"
        :label="$t('text.add')"
        icon="i-lucide-plus"
        size="xs"
        variant="soft"
        @click="emit('add:text')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  PageText,
  TextSize,
  TextColor,
  TextFont,
} from '~/composables/usePhotoStore';

interface PageTextEditorProps {
  texts: PageText[];
  activeTextId: string | null;
  maxTexts: number;
  labelKey: string;
  pageRole: string;
}

const props = defineProps<PageTextEditorProps>();

const emit = defineEmits<{
  'update:text': [textId: string, updates: Partial<PageText>];
  'add:text': [];
  'remove:text': [textId: string];
  'select:text': [textId: string];
}>();

const { t } = useI18n();

const activeText = computed(() =>
  props.texts.find(t => t.id === props.activeTextId) ?? null,
);

const placeholderText = computed(() => {
  if (props.pageRole === 'frontCover') return t('text.placeholder.frontCover');
  if (props.pageRole === 'backCover') return t('text.placeholder.backCover');
  return t('text.placeholder.page');
});

const fonts: { value: TextFont; labelKey: string; fontClass: string }[] = [
  { value: 'sans', labelKey: 'text.fontSans', fontClass: 'font-sans' },
  { value: 'serif', labelKey: 'text.fontSerif', fontClass: 'font-serif' },
  { value: 'mono', labelKey: 'text.fontMono', fontClass: 'font-mono' },
  {
    value: 'handwritten',
    labelKey: 'text.fontHandwritten',
    fontClass: 'font-handwritten',
  },
];

const sizes: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];

const colors: { value: TextColor; label: string; bg: string }[] = [
  { value: 'white', label: 'White', bg: 'bg-white' },
  { value: 'black', label: 'Black', bg: 'bg-zinc-900' },
  { value: 'rose', label: 'Fuchsia', bg: 'bg-fuchsia-500' },
];
</script>
