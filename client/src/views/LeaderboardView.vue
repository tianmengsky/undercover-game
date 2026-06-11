<!--
  LeaderboardView.vue - 排行榜页面
  路由：/leaderboard
  功能：总榜/周榜/月榜筛选、排名列表、当前用户高亮、前三名特殊样式
-->
<template>
  <div class="leaderboard-view">
    <h1 class="lb-title">🏆 排行榜</h1>

    <!-- 筛选标签 -->
    <div class="lb-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['lb-tab', { active: currentTab === t.key }]"
        @click="switchTab(t.key)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 加载 / 错误 -->
    <div v-if="loading" class="lb-status">加载中...</div>
    <div v-else-if="error" class="lb-status lb-error">{{ error }}</div>

    <!-- 空状态 -->
    <div v-else-if="list.length === 0" class="lb-empty">
      还没有玩家数据，快去玩一局吧！
    </div>

    <!-- 排行列表 -->
    <div v-else class="lb-list">
      <div
        v-for="item in list"
        :key="item.userId"
        class="lb-row"
        :class="{
          'is-me': authStore.user && item.userId === authStore.user.id,
          'is-top1': item.rank === 1,
          'is-top2': item.rank === 2,
          'is-top3': item.rank === 3,
        }"
      >
        <span class="lb-rank">
          <span v-if="item.rank === 1" class="rank-medal">🥇</span>
          <span v-else-if="item.rank === 2" class="rank-medal">🥈</span>
          <span v-else-if="item.rank === 3" class="rank-medal">🥉</span>
          <span v-else class="rank-num">{{ item.rank }}</span>
        </span>

        <div class="lb-avatar">{{ item.nickname?.charAt(0) || '?' }}</div>

        <div class="lb-info">
          <span class="lb-name">{{ item.nickname }}</span>
          <span class="lb-level">Lv.{{ item.level }}</span>
        </div>

        <span class="lb-stat lb-wins">{{ item.wins }}胜</span>
        <span class="lb-stat lb-rate">{{ formatRate(item.winRate) }}</span>
        <span class="lb-score">{{ item.score }}分</span>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="list.length > 0" class="lb-pagination">
      <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页</span>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getLeaderboard } from '@/services/statsService'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const tabs = [
  { key: 'total' as const, label: '总榜' },
  { key: 'weekly' as const, label: '周榜' },
  { key: 'monthly' as const, label: '月榜' },
]
const currentTab = ref<'total' | 'weekly' | 'monthly'>('total')
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const error = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await getLeaderboard({
      type: currentTab.value,
      page: page.value,
      pageSize,
    })
    if (res.code === 0) {
      list.value = res.data.list || []
      total.value = res.data.total || 0
    } else {
      error.value = res.message || '加载失败'
    }
  } catch (e: any) {
    error.value = e.message || '网络错误'
  } finally {
    loading.value = false
  }
}

function switchTab(key: 'total' | 'weekly' | 'monthly') {
  currentTab.value = key
  page.value = 1
  fetchData()
}

function goPage(p: number) {
  page.value = p
  fetchData()
}

function formatRate(rate: number): string {
  return Math.round(rate * 100) + '%'
}

onMounted(fetchData)
watch(() => authStore.isAuthenticated, (v) => { if (v) authStore.fetchProfile() })
</script>

<style scoped>
.leaderboard-view {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-md);
}

.lb-title {
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: var(--spacing-lg);
}

/* ===== 筛选标签 ===== */
.lb-tabs {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
}

.lb-tab {
  padding: 8px 24px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-round);
  background: var(--color-surface);
  color: var(--color-text-light);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lb-tab.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* ===== 状态 ===== */
.lb-status {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-light);
  font-size: var(--font-size-base);
}

.lb-error {
  color: var(--color-danger);
}

.lb-empty {
  text-align: center;
  padding: var(--spacing-3xl) var(--spacing-md);
  color: var(--color-text-light);
  font-size: var(--font-size-lg);
}

/* ===== 排行列表 ===== */
.lb-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 12px var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: background var(--transition-fast);
}

.lb-row.is-me {
  background: #e3f2fd;
  border: 1px solid var(--color-primary);
}

.lb-row.is-top1 { background: linear-gradient(135deg, #fff9e6, #fff3cd); }
.lb-row.is-top2 { background: linear-gradient(135deg, #f5f5f5, #eceff1); }
.lb-row.is-top3 { background: linear-gradient(135deg, #fff3e0, #ffe0b2); }

.lb-rank {
  width: 36px;
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-light);
  flex-shrink: 0;
}

.rank-medal {
  font-size: 22px;
}

.rank-num {
  font-size: var(--font-size-base);
}

.lb-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.lb-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.lb-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.lb-level {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.lb-stat {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  min-width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.lb-score {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-primary-dark);
  min-width: 56px;
  text-align: right;
  flex-shrink: 0;
}

/* ===== 分页 ===== */
.lb-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
}

.lb-pagination button {
  padding: 8px 20px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lb-pagination button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.lb-pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lb-pagination span {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}
</style>
