<!--
  AppLoading.vue - 加载状态组件
  功能：inline spinner / 全屏遮罩加载
-->
<template>
  <div v-if="variant === 'overlay'" class="app-loading-overlay">
    <div class="app-loading-inner">
      <span class="app-loading-spinner" />
      <p v-if="text" class="app-loading-text">{{ text }}</p>
    </div>
  </div>
  <div v-else class="app-loading-inline">
    <span class="app-loading-spinner app-loading-spinner--sm" />
    <span v-if="text" class="app-loading-text-inline">{{ text }}</span>
    <span v-else>加载中...</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text?: string
  variant?: 'inline' | 'overlay'
}>()
</script>

<style scoped>
/* Inline */
.app-loading-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: var(--spacing-md);
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}

/* Overlay */
.app-loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 160;
}

.app-loading-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.app-loading-spinner {
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-bg-dark);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.app-loading-spinner--sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.app-loading-text {
  color: var(--color-text-light);
  font-size: var(--font-size-base);
}

.app-loading-text-inline {
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
