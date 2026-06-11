<!--
  LevelProgress.vue - 等级进度条组件
  功能：紧凑型/完整型经验进度条，显示等级+exp百分比
-->
<template>
  <div class="level-area" :class="`level-area--${variant}`">
    <span class="level-badge">Lv.{{ level }}</span>
    <div class="exp-bar">
      <div class="exp-bar-fill" :style="{ width: percent + '%' }" />
    </div>
    <span v-if="variant === 'full'" class="exp-text">{{ exp }} / 100</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  level: number
  exp: number
  variant?: 'mini' | 'full'
}>()

const percent = computed(() => ((props.exp || 0) / 100) * 100)
</script>

<style scoped>
.level-area {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Mini variant (AppHeader) */
.level-area--mini .level-badge {
  padding: 2px 8px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.level-area--mini .exp-bar {
  width: 48px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-bg-dark);
  overflow: hidden;
}

.level-area--mini .exp-bar-fill {
  height: 100%;
  background: var(--color-success);
  border-radius: 2px;
  transition: width 0.5s ease;
}

/* Full variant (ProfileView) */
.level-area--full {
  flex-wrap: wrap;
}

.level-area--full .level-badge {
  padding: 4px 14px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-base);
  font-weight: 700;
}

.level-area--full .exp-bar {
  flex: 1;
  min-width: 120px;
  height: 10px;
  border-radius: 5px;
  background: var(--color-bg-dark);
  overflow: hidden;
}

.level-area--full .exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: 5px;
  transition: width 0.8s ease;
}

.exp-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  white-space: nowrap;
}
</style>
