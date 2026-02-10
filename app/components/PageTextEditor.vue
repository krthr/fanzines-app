<template>
  <div class="p-3 space-y-3 w-64">
    <!-- Page role label -->
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-muted uppercase tracking-wide">
        {{ $t(labelKey) }}
      </span>
      <UButton
        v-if="modelValue.content"
        :label="$t('text.clear')"
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        color="error"
        @click="emit('update:modelValue', {...modelValue, content: ''})" />
    </div>

    <!-- Text input -->
    <UTextarea
      :model-value="modelValue.content"
      :placeholder="placeholderText"
      :rows="2"
      :maxlength="60"
      autoresize
      size="sm"
      @update:model-value="
        emit('update:modelValue', {...modelValue, content: $event})
      " />

    <!-- Position toggle -->
    <div class="space-y-1">
      <label class="text-xs font-medium text-muted">{{
        $t('text.position')
      }}</label>
      <div class="flex gap-1">
        <UButton
          :label="$t('text.positionTop')"
          icon="i-lucide-arrow-up"
          size="xs"
          :variant="modelValue.position === 'top' ? 'soft' : 'ghost'"
          :color="modelValue.position === 'top' ? 'primary' : 'neutral'"
          @click="
            emit('update:modelValue', {...modelValue, position: 'top'})
          " />
        <UButton
          :label="$t('text.positionCenter')"
          icon="i-lucide-minus"
          size="xs"
          :variant="modelValue.position === 'center' ? 'soft' : 'ghost'"
          :color="modelValue.position === 'center' ? 'primary' : 'neutral'"
          @click="
            emit('update:modelValue', {...modelValue, position: 'center'})
          " />
        <UButton
          :label="$t('text.positionBottom')"
          icon="i-lucide-arrow-down"
          size="xs"
          :variant="modelValue.position === 'bottom' ? 'soft' : 'ghost'"
          :color="modelValue.position === 'bottom' ? 'primary' : 'neutral'"
          @click="
            emit('update:modelValue', {...modelValue, position: 'bottom'})
          " />
      </div>
    </div>

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
          :variant="modelValue.font === f.value ? 'soft' : 'ghost'"
          :color="modelValue.font === f.value ? 'primary' : 'neutral'"
          @click="emit('update:modelValue', {...modelValue, font: f.value})" />
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
          :variant="modelValue.size === s.value ? 'soft' : 'ghost'"
          :color="modelValue.size === s.value ? 'primary' : 'neutral'"
          @click="emit('update:modelValue', {...modelValue, size: s.value})" />
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
            modelValue.color === c.value
              ? 'border-primary scale-110 ring-2 ring-primary/30'
              : 'border-zinc-300 dark:border-zinc-600',
          ]"
          :title="c.label"
          @click="emit('update:modelValue', {...modelValue, color: c.value})" />
      </div>
    </div>

    <!-- Background toggle -->
    <div class="flex items-center justify-between">
      <label class="text-xs font-medium text-muted">{{
        $t('text.background')
      }}</label>
      <USwitch
        :model-value="modelValue.showBg"
        size="xs"
        @update:model-value="
          emit('update:modelValue', {...modelValue, showBg: $event})
        " />
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
  modelValue: PageText;
  labelKey: string;
  pageRole: string;
}

const props = defineProps<PageTextEditorProps>();

const emit = defineEmits<{
  'update:modelValue': [value: PageText];
}>();

const {t} = useI18n();

const placeholderText = computed(() => {
  if (props.pageRole === 'frontCover') return t('text.placeholder.frontCover');
  if (props.pageRole === 'backCover') return t('text.placeholder.backCover');
  return t('text.placeholder.page');
});

const fonts: {value: TextFont; labelKey: string; fontClass: string}[] = [
  {value: 'sans', labelKey: 'text.fontSans', fontClass: 'font-sans'},
  {value: 'serif', labelKey: 'text.fontSerif', fontClass: 'font-serif'},
  {value: 'mono', labelKey: 'text.fontMono', fontClass: 'font-mono'},
  {
    value: 'handwritten',
    labelKey: 'text.fontHandwritten',
    fontClass: 'font-handwritten',
  },
];

const sizes: {value: TextSize; label: string}[] = [
  {value: 'sm', label: 'S'},
  {value: 'md', label: 'M'},
  {value: 'lg', label: 'L'},
];

const colors: {value: TextColor; label: string; bg: string}[] = [
  {value: 'white', label: 'White', bg: 'bg-white'},
  {value: 'black', label: 'Black', bg: 'bg-zinc-900'},
  {value: 'rose', label: 'Fuchsia', bg: 'bg-fuchsia-500'},
];
</script>
