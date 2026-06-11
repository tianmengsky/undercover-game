<!--
  AppModal.vue - 弹窗组件
  功能：遮罩层 + 标题 + 内容插槽 + 关闭按钮 + 过渡动画
-->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="app-modal-overlay" @click.self="onClose">
        <div class="app-modal-card" :class="contentClass">
          <div v-if="$slots.header || title" class="app-modal-header">
            <slot name="header">
              <span class="app-modal-title">{{ title }}</span>
            </slot>
            <button v-if="closable !== false" class="app-modal-close" @click="onClose">&times;</button>
          </div>
          <div class="app-modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="app-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  title?: string
  closable?: boolean
  contentClass?: string
}>()

const emit = defineEmits<{
  close: []
}>()

function onClose() {
  emit('close')
}
</script>

<style scoped>
.app-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
}

.app-modal-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  width: 90%;
  max-width: 420px;
  max-height: 80vh;
  overflow-y: auto;
}

.app-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-bg-dark);
}

.app-modal-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}

.app-modal-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-round);
  background: transparent;
  font-size: 20px;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.app-modal-close:hover {
  background: var(--color-bg-dark);
  color: var(--color-text);
}

.app-modal-body {
  padding: var(--spacing-lg);
}

.app-modal-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-bg-dark);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

/* Transition */
.modal-fade-enter-active { animation: modal-in 0.25s ease-out; }
.modal-fade-leave-active { animation: modal-in 0.2s ease-in reverse; }

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
