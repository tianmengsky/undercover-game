<!--
  AchievementBadge.vue - 成就徽章组件
  功能：显示成就图标+名称+描述+奖励，已解锁/未解锁两种状态
-->
<template>
  <div class="ach-card" :class="{ unlocked }">
    <span class="ach-icon">{{ icon }}</span>
    <div class="ach-info">
      <span class="ach-name">{{ name }}</span>
      <span class="ach-desc">{{ description }}</span>
      <span class="ach-reward">+{{ rewardExp }}exp</span>
    </div>
    <span v-if="unlocked" class="ach-check">✓</span>
    <span v-else class="ach-locked">🔒</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  name: string
  description: string
  rewardExp: number
  unlocked: boolean
}>()
</script>

<style scoped>
.ach-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 2px solid var(--color-bg-dark);
  position: relative;
  opacity: 0.5;
  transition: all var(--transition-fast);
}

.ach-card.unlocked {
  opacity: 1;
  border-color: var(--color-success);
  background: linear-gradient(135deg, #f0faf3, #e8f5e9);
}

.ach-icon { font-size: 32px; }

.ach-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.ach-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.ach-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-top: 2px;
}

.ach-reward {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-success);
  margin-top: 4px;
}

.ach-check {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-round);
  background: var(--color-success);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ach-locked {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 12px;
  opacity: 0.6;
}
</style>
