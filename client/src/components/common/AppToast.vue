<!--
  AppToast.vue - 消息提示组件
  功能：success/error/warning/info 四种类型，自动消失，堆叠显示
  用法：在 App.vue 中放入 <AppToast /> 即可全局生效
-->
<template>
  <Teleport to="body">
    <TransitionGroup name="toast-slide" tag="div" class="app-toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['app-toast', `app-toast--${t.type}`]"
      >
        <span class="app-toast-icon">{{ iconMap[t.type] }}</span>
        <span class="app-toast-msg">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import type { ToastItem } from '@/composables/useToast'

const { toasts } = useToast()

const iconMap: Record<ToastItem['type'], string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}
</script>

<style scoped>
.app-toast-container {
  position: fixed;
  top: 64px;
  right: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.app-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  font-size: var(--font-size-base);
  color: var(--color-text);
  pointer-events: auto;
  min-width: 200px;
  max-width: 360px;
}

.app-toast--success { border-left: 3px solid var(--color-success); }
.app-toast--error   { border-left: 3px solid var(--color-danger); }
.app-toast--warning { border-left: 3px solid var(--color-accent); }
.app-toast--info    { border-left: 3px solid var(--color-primary); }

.app-toast-icon { flex-shrink: 0; font-size: 16px; }
.app-toast-msg  { flex: 1; line-height: 1.4; }

/* Transition */
.toast-slide-enter-active { animation: toast-in 0.3s ease-out; }
.toast-slide-leave-active { animation: toast-in 0.2s ease-in reverse; }
.toast-slide-move { transition: transform 0.3s ease; }

@keyframes toast-in {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
