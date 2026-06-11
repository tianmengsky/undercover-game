<!--
  AppButton.vue - 通用按钮组件
  功能：多 variant（primary/secondary/danger/ghost），尺寸变体，loading/disabled 状态
-->
<template>
  <button
    :class="['app-btn', `app-btn--${variant}`, `app-btn--${size}`, { 'is-loading': loading }]"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <span v-if="loading" class="app-btn-spinner" />
    <span :class="{ 'app-btn-text--loading': loading }">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-round);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
  line-height: 1;
  white-space: nowrap;
}

/* Sizes */
.app-btn--sm  { padding: 4px 14px; font-size: var(--font-size-sm); height: 30px; }
.app-btn--md  { padding: 8px 20px; font-size: var(--font-size-base); height: 38px; }
.app-btn--lg  { padding: 10px 28px; font-size: var(--font-size-lg); height: 44px; }

/* Variants */
.app-btn--primary {
  background: var(--color-primary);
  color: #fff;
}
.app-btn--primary:hover:not(:disabled) { background: var(--color-primary-dark); }

.app-btn--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-bg-dark);
}
.app-btn--secondary:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }

.app-btn--danger {
  background: var(--color-surface);
  color: var(--color-danger);
  border-color: var(--color-danger);
}
.app-btn--danger:hover:not(:disabled) { background: #fce4ec; }

.app-btn--ghost {
  background: transparent;
  color: var(--color-text-light);
}
.app-btn--ghost:hover:not(:disabled) { color: var(--color-primary); }

/* States */
.app-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: btn-spin 0.6s linear infinite;
}

.app-btn-text--loading { opacity: 0.7; }

@keyframes btn-spin {
  to { transform: rotate(360deg); }
}
</style>
