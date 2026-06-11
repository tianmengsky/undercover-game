<!--
  AchievementUnlock.vue - 成就解锁弹窗动画组件
  功能：新成就解锁时弹出 toast，自动消失
-->
<template>
  <Transition name="ach-toast">
    <div v-if="list.length > 0" class="ach-unlock-toast">
      <span class="ach-unlock-icon">{{ list[0].icon }}</span>
      <div class="ach-unlock-text">
        <span class="ach-unlock-title">🏆 成就解锁！</span>
        <span class="ach-unlock-names">{{ list.map((a) => a.name).join('、') }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  list: Array<{ name: string; icon: string }>
}>()
</script>

<style scoped>
.ach-unlock-toast {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 12px 24px;
  background: linear-gradient(135deg, #fff9e6, #ffe082);
  border: 1px solid #f9a826;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 200;
  pointer-events: none;
}

.ach-unlock-icon { font-size: 28px; }

.ach-unlock-text {
  display: flex;
  flex-direction: column;
}

.ach-unlock-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: #c17d0a;
}

.ach-unlock-names {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

/* Transition */
.ach-toast-enter-active { animation: ach-in 0.35s ease-out; }
.ach-toast-leave-active { animation: ach-in 0.3s ease-in reverse; }

@keyframes ach-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
