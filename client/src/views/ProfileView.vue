<!--
  ProfileView.vue - 个人中心页
  功能：头像+等级+经验条、战绩统计、历史对局列表、最近成就
  路由：/profile
  权限：登录
-->
<template>
  <div class="profile-view">
    <div v-if="loading" class="pv-state">
      <AppLoading text="加载中..." />
    </div>
    <div v-else-if="error" class="pv-state">
      <p class="pv-error">{{ error }}</p>
      <AppButton variant="primary" size="sm" @click="fetchAll">重试</AppButton>
    </div>

    <template v-else>
      <!-- 个人信息卡片 -->
      <div class="pv-header">
        <div class="pv-avatar">{{ avatarLetter }}</div>
        <div class="pv-names">
          <h2 class="pv-nickname">{{ stats?.nickname || authStore.user?.nickname || '玩家' }}</h2>
          <span class="pv-username">@{{ authStore.user?.username }}</span>
        </div>
        <LevelProgress
          :level="authStore.user?.level || 1"
          :exp="authStore.user?.exp || 0"
          variant="full"
          class="pv-level"
        />
      </div>

      <!-- 战绩统计 -->
      <div class="pv-stats">
        <div class="pv-stat-item">
          <span class="pv-stat-num">{{ stats?.totalGames || 0 }}</span>
          <span class="pv-stat-label">总局数</span>
        </div>
        <div class="pv-stat-item">
          <span class="pv-stat-num">{{ winRate(stats?.wins || 0, stats?.totalGames || 0) }}</span>
          <span class="pv-stat-label">胜率</span>
        </div>
        <div class="pv-stat-item">
          <span class="pv-stat-num">{{ stats?.mvpCount || 0 }}</span>
          <span class="pv-stat-label">MVP</span>
        </div>
        <div class="pv-stat-item">
          <span class="pv-stat-num">{{ stats?.score || 0 }}</span>
          <span class="pv-stat-label">积分</span>
        </div>
      </div>

      <!-- 历史对局 -->
      <div class="pv-section">
        <h3 class="pv-section-title">历史对局</h3>
        <div v-if="historyList.length === 0" class="pv-empty">
          还没有对局记录，快去大厅开一局吧
        </div>
        <div v-else class="pv-history-list">
          <div v-for="h in historyList" :key="h.gameId" class="pv-history-item">
            <div class="pv-h-left">
              <span :class="['pv-h-role', h.role === 'undercover' ? 'is-undercover' : 'is-civilian']">
                {{ h.role === 'undercover' ? '卧底' : '平民' }}
              </span>
              <span class="pv-h-words">{{ h.wordPair }}</span>
            </div>
            <div class="pv-h-mid">
              <span class="pv-h-round">{{ h.totalRounds }} 轮</span>
              <span v-if="h.isMvp" class="pv-h-mvp">MVP</span>
            </div>
            <div class="pv-h-right">
              <span :class="['pv-h-result', h.winner === h.role ? 'is-win' : 'is-lose']">
                {{ h.winner === h.role ? '胜' : '负' }}
              </span>
              <span class="pv-h-exp">+{{ h.expGained }}</span>
              <span class="pv-h-time">{{ timeAgo(h.finishedAt) }}</span>
            </div>
          </div>
        </div>
        <AppButton v-if="historyHasMore" variant="ghost" size="sm" class="pv-load-more" :loading="loadingMore" @click="loadMore">
          加载更多
        </AppButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getUserStats, getUserHistory } from '@/services/statsService'
import { getAchievements, getUserAchievements } from '@/services/achievementService'
import LevelProgress from '@/components/profile/LevelProgress.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import { timeAgo, winRate } from '@/utils/formatters'

const authStore = useAuthStore()
const loading = ref(true)
const error = ref('')
const loadingMore = ref(false)

const stats = ref<any>(null)
const historyList = ref<any[]>([])
let historyPage = 1
const historyHasMore = ref(false)

const avatarLetter = computed(() => {
  const name = authStore.user?.nickname || authStore.user?.username || '?'
  return name.charAt(0).toUpperCase()
})

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    const userId = authStore.user!.id
    const [statsRes, histRes] = await Promise.all([
      getUserStats(userId).catch(() => null),
      getUserHistory(userId, { page: 1, pageSize: 10 }).catch(() => null),
    ])

    if (statsRes && statsRes.code === 0) {
      stats.value = statsRes.data
    }

    if (histRes && histRes.code === 0) {
      historyList.value = histRes.data.list || []
      historyHasMore.value = (histRes.data.list || []).length >= 10
    }
    historyPage = 1
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    const userId = authStore.user!.id
    const res: any = await getUserHistory(userId, { page: historyPage + 1, pageSize: 10 })
    if (res.code === 0) {
      const list = res.data.list || []
      historyList.value = [...historyList.value, ...list]
      historyHasMore.value = list.length >= 10
      historyPage++
    }
  } catch {
    // ignore
  } finally {
    loadingMore.value = false
  }
}

onMounted(() => { fetchAll() })
</script>

<style scoped>
.profile-view {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-md);
}

.pv-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl) 0;
}

.pv-error {
  color: var(--color-danger);
  font-size: var(--font-size-base);
}

/* ===== 个人信息卡片 ===== */
.pv-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-radius: var(--radius-lg);
  color: #fff;
  margin-bottom: var(--spacing-lg);
}

.pv-avatar {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-round);
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  flex-shrink: 0;
}

.pv-names {
  flex: 1;
  min-width: 0;
}

.pv-nickname {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin: 0;
}

.pv-username {
  font-size: var(--font-size-sm);
  opacity: 0.8;
}

.pv-level {
  width: 100%;
  margin-top: var(--spacing-sm);
}

/* ===== 战绩统计 ===== */
.pv-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.pv-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-sm);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-bg-dark);
}

.pv-stat-num {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-primary);
}

.pv-stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-top: 2px;
}

/* ===== 历史对局 ===== */
.pv-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-bg-dark);
  overflow: hidden;
}

.pv-section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-bg-dark);
  margin: 0;
}

.pv-empty {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}

.pv-history-list {
  display: flex;
  flex-direction: column;
}

.pv-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-bottom: 1px solid var(--color-bg-dark);
  gap: var(--spacing-sm);
}

.pv-history-item:last-child {
  border-bottom: none;
}

.pv-h-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 0;
}

.pv-h-role {
  padding: 2px 8px;
  border-radius: var(--radius-round);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.pv-h-role.is-civilian {
  background: #e8f5e9;
  color: #2e7d32;
}

.pv-h-role.is-undercover {
  background: #fce4ec;
  color: #c62828;
}

.pv-h-words {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv-h-mid {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.pv-h-round {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.pv-h-mvp {
  padding: 1px 6px;
  border-radius: var(--radius-round);
  background: #fff3e0;
  color: #f9a826;
  font-size: 11px;
  font-weight: 600;
}

.pv-h-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.pv-h-result {
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-round);
}

.pv-h-result.is-win {
  background: #e8f5e9;
  color: #2e7d32;
}

.pv-h-result.is-lose {
  background: #fce4ec;
  color: #c62828;
}

.pv-h-exp {
  font-size: 12px;
  color: var(--color-success);
  font-weight: 600;
}

.pv-h-time {
  font-size: 12px;
  color: var(--color-text-light);
  white-space: nowrap;
}

.pv-load-more {
  width: 100%;
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-bg-dark);
}
</style>
