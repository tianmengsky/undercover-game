<!--
  AppCountdown.vue - 倒计时条，显示在发言/投票区上方
-->
<template>
  <div class="app-countdown" :class="{ urgent: isUrgent, expired: isExpired }">
    <span class="countdown-label">{{ label }}</span>
    <div class="countdown-bar">
      <div class="bar-fill" :style="{ width: progress * 100 + '%' }" />
    </div>
    <span class="countdown-text">{{ remaining }}s</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  remaining: number
  isUrgent: boolean
  isExpired: boolean
  progress: number
}>()

const label = computed(() => {
  if (props.isExpired) return '⏰ 时间到'
  if (props.isUrgent) return '⏰ 快超时'
  return '⏰ 倒计时'
})
</script>

<style scoped>
.app-countdown {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px var(--spacing-md);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-bg-dark);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.app-countdown.urgent {
  background: #fff8e1;
}

.app-countdown.expired {
  background: #fce4ec;
}

.countdown-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-light);
  white-space: nowrap;
  flex-shrink: 0;
}

.countdown-bar {
  flex: 1;
  height: 6px;
  background: var(--color-bg-dark);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.urgent .bar-fill {
  background: var(--color-accent);
  animation: urgent-pulse 0.5s ease-in-out infinite;
}

@keyframes urgent-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.expired .bar-fill {
  background: var(--color-danger);
}

.countdown-text {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.urgent .countdown-text {
  color: var(--color-accent);
}

.expired .countdown-text {
  color: var(--color-danger);
}
</style>
