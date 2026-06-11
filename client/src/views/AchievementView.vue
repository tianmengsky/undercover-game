<!--
  AchievementView.vue - 成就展示页面
  路由：/achievements
  功能：12个成就网格、分类筛选、已解锁/未解锁状态
-->
<template>
  <div class="achievement-view">
    <h1 class="ach-title">🎖 成就系统</h1>

    <!-- 进度统计 -->
    <div class="ach-progress">
      已解锁 <strong>{{ unlockedCount }}</strong> / {{ totalCount }}
    </div>

    <!-- 分类筛选 -->
    <div class="ach-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['ach-tab', { active: filter === t.key }]"
        @click="setFilter(t.key)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 加载 / 错误 -->
    <div v-if="loading" class="ach-status">加载中...</div>
    <div v-else-if="error" class="ach-status ach-error">{{ error }}</div>

    <!-- 成就网格 -->
    <div v-else class="ach-grid">
      <AchievementBadge
        v-for="ach in filteredAchievements"
        :key="ach.id"
        :icon="ach.icon"
        :name="ach.name"
        :description="ach.description"
        :reward-exp="ach.rewardExp"
        :unlocked="ach._unlocked"
      />
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && !error && filteredAchievements.length === 0" class="ach-empty">
      该分类没有成就
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAchievement } from '@/composables/useAchievement'
import AchievementBadge from '@/components/achievements/AchievementBadge.vue'

const {
  allAchievements,
  unlockedIds,
  loading,
  error,
  filter,
  totalCount,
  unlockedCount,
  filteredAchievements,
  fetch,
} = useAchievement()

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'battle', label: '战斗' },
  { key: 'collect', label: '收集' },
  { key: 'social', label: '社交' },
]

function setFilter(key: string) {
  filter.value = key
}

onMounted(() => { fetch() })
</script>

<style scoped>
.achievement-view {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-md);
}

.ach-title {
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

/* ===== 进度 ===== */
.ach-progress {
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-lg);
}

.ach-progress strong {
  color: var(--color-primary-dark);
  font-size: var(--font-size-lg);
}

/* ===== 筛选 ===== */
.ach-tabs {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
}

.ach-tab {
  padding: 6px 20px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-round);
  background: var(--color-surface);
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ach-tab.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* ===== 状态 ===== */
.ach-status {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-light);
  font-size: var(--font-size-base);
}

.ach-error { color: var(--color-danger); }

.ach-empty {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-light);
}

/* ===== 网格 ===== */
.ach-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

@media (max-width: 600px) {
  .ach-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
