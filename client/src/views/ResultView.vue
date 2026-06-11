<!--
  ResultView.vue - 游戏结算页
  路由：/result/:gameId
  功能：胜负动画、词语翻牌揭示、玩家身份列表、MVP、经验、按钮
-->
<template>
  <div class="result-view">
    <template v-if="loading">
      <div class="result-loading">加载结算数据...</div>
    </template>

    <template v-else-if="data">
      <!-- ===== 胜负标题 ===== -->
      <h1 class="result-title" :class="data.winner">
        {{ data.winner === 'civilian' ? '🎉 平民胜利！' : '🕵️ 卧底逆袭！' }}
      </h1>
      <p class="result-subtitle">
        第 {{ data.totalRounds }} 轮结束
      </p>

      <!-- ===== 词语揭示 ===== -->
      <WordReveal
        :civilian-word="data.civilianWord"
        :undercover-word="data.undercoverWord"
        :revealed="showWords"
      />

      <!-- ===== 对局回顾 ===== -->
      <div class="section">
        <h3 class="section-title">对局回顾</h3>
        <div class="player-result-list">
          <div
            v-for="p in data.players"
            :key="p.slotIndex"
            class="player-result-item"
            :class="{
              'is-mvp': p.isMvp,
              'is-undercover': p.role === 'undercover',
            }"
          >
            <div class="pri-avatar">
              <span class="pri-avatar-text">{{ playerName(p).charAt(0) }}</span>
              <span v-if="p.isMvp" class="pri-mvp-badge">🏆</span>
            </div>
            <span class="pri-name">{{ playerName(p) }}</span>
            <span class="pri-role-tag" :class="p.role">
              {{ p.role === 'undercover' ? '卧底' : '平民' }}
            </span>
            <span class="pri-status">{{ p.isAlive ? '存活' : '淘汰' }}</span>
            <span class="pri-exp">+{{ p.expGained }}exp</span>
          </div>
        </div>
      </div>

      <!-- ===== 成就解锁 ===== -->
      <Transition name="ach-toast">
        <div v-if="achList.length > 0" class="achievement-banner">
          <span class="ach-banner-icon">{{ achList[0].icon }}</span>
          <div class="ach-banner-text">
            <span class="ach-banner-title">🎉 新成就解锁！</span>
            <span class="ach-banner-names">{{ achList.map(a => a.name).join('、') }}</span>
          </div>
        </div>
      </Transition>

      <!-- ===== MVP ===== -->
      <div class="mvp-highlight" v-if="mvpPlayer">
        🏆 本局 MVP：{{ playerName(mvpPlayer) }}
        <span v-if="mvpPlayer.type === 'human'">（你）</span>
      </div>

      <!-- ===== 经验值区域 ===== -->
      <div v-if="myExp > 0" class="exp-section">
        <div class="exp-header">
          <span class="exp-label">经验值获取</span>
          <span class="exp-count">+{{ displayedExp }}</span>
        </div>
        <div class="exp-bar-track">
          <div class="exp-bar-fill" :style="{ width: expBarPct + '%' }" />
          <div class="exp-bar-glow" v-if="expAnimating" />
        </div>
        <p class="exp-level-text">Lv.{{ startLevel }} → Lv.{{ endLevel }}</p>
      </div>

      <!-- ===== 底部按钮 ===== -->
      <div class="result-actions">
        <button class="btn btn-primary" @click="goToLobby">再来一局</button>
        <button class="btn btn-outline" @click="goToReplay">查看回放</button>
        <button class="btn btn-outline" @click="goToRoom">返回房间</button>
        <button class="btn btn-text" @click="goToRooms">返回列表</button>
      </div>
    </template>

    <template v-else>
      <div class="result-error">加载失败：{{ error || '未知错误' }}</div>
      <button class="btn btn-primary" @click="goToRooms">返回房间列表</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGameResult } from '@/services/gameService'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import WordReveal from '@/components/game/WordReveal.vue'

const PERSONA_NAMES: Record<string, string> = {
  default: '默认', humor: '幽默达人', logic: '逻辑大师',
  newbie: '萌新小白', literary: '文艺青年', grumpy: '暴躁老哥',
}

function resolvePersonaName(id?: string): string {
  if (!id) return ''
  try {
    const raw = sessionStorage.getItem('personaNameMap')
    if (raw) {
      const map = JSON.parse(raw)
      if (map[id]) return map[id]
    }
  } catch { /* ignore */ }
  return PERSONA_NAMES[id] || ''
}

function playerName(p: any): string {
  return p.customName || (p.type === 'ai' ? resolvePersonaName(p.aiPersona) || `AI-${p.slotIndex + 1}` : `玩家${p.slotIndex + 1}`)
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()

const loading = ref(true)
const error = ref('')
const data = ref<any>(null)
const showWords = ref(false)

// ===== 经验动画 =====
const displayedExp = ref(0)
const expAnimating = ref(false)
const startLevel = ref(1)
const endLevel = ref(1)
const expBarPct = ref(0)

const myExp = computed(() => {
  if (!data.value) return 0
  const me = data.value.players?.find((p: any) => p.type === 'human')
  return me?.expGained || 0
})

// 数字跳动动画（count-up）
function animateNumber(from: number, to: number, duration: number, cb: (v: number) => void) {
  const start = performance.now()
  function tick(now: number) {
    const elapsed = now - start
    const p = Math.min(elapsed / duration, 1)
    // ease-out
    const eased = 1 - Math.pow(1 - p, 3)
    cb(Math.round(from + (to - from) * eased))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function runExpAnimation() {
  const gained = myExp.value
  if (gained <= 0) return

  expAnimating.value = true

  const oldLevel = authStore.user?.level || 1
  const oldExp = authStore.user?.exp || 0
  startLevel.value = oldLevel

  authStore.addExp(gained)

  const newLevel = Math.floor(((oldExp + gained) / 100)) + 1
  endLevel.value = newLevel
  const targetPct = ((oldExp + gained) % 100) / 100 * 100
  expBarPct.value = (oldExp % 100) / 100 * 100

  // 数字跳动 1.5s
  animateNumber(0, gained, 1500, (v) => { displayedExp.value = v })

  // 进度条增长 1.2s
  setTimeout(() => {
    expBarPct.value = targetPct
    setTimeout(() => { expAnimating.value = false }, 800)
  }, 200)
}

onMounted(async () => {
  const gameId = route.params.gameId as string
  if (!gameId) {
    error.value = '缺少游戏 ID'
    loading.value = false
    return
  }

  try {
    const res: any = await getGameResult(gameId)
    if (res.code !== 0) throw new Error(res.message || '加载失败')
    data.value = res.data

    // 动画序列（runExpAnimation 内部会调 addExp）
    setTimeout(() => { showWords.value = true }, 600)
    setTimeout(() => { runExpAnimation() }, 1000)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const mvpPlayer = computed(() => data.value?.players?.find((p: any) => p.isMvp) || null)
const achList = computed(() => gameStore.newAchievements || [])

function goToLobby() {
  router.push('/rooms')
}

function goToReplay() {
  router.push(`/replay/${route.params.gameId}`)
}

function goToRoom() {
  router.push(`/room/${route.params.gameId}`)
}

function goToRooms() {
  router.push('/rooms')
}
</script>

<style scoped>
.result-view {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-md) var(--spacing-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.result-loading {
  text-align: center;
  padding: var(--spacing-2xl);
  font-size: var(--font-size-lg);
  color: var(--color-text-light);
}

.result-error {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-danger);
  font-size: var(--font-size-lg);
}

/* ===== 胜负标题 ===== */
.result-title {
  text-align: center;
  font-size: 32px;
  font-weight: 800;
  animation: title-scale-in 0.5s ease-out;
}

.result-title.civilian {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.result-title.undercover {
  background: linear-gradient(135deg, #f9a826, #e67e22);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@keyframes title-scale-in {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.result-subtitle {
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-light);
  margin-top: -var(--spacing-sm);
}

/* ===== 分区 ===== */
.section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  animation: fade-in-up 0.5s ease-out 1s both;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-bg-dark);
}

/* ===== 玩家结果列表 ===== */
.player-result-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.player-result-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  transition: background var(--transition-fast);
}

.player-result-item.is-mvp {
  background: linear-gradient(135deg, #fff9e6, #fff3cd);
  border: 1px solid #f9a826;
}

.player-result-item.is-undercover {
  border-left: 3px solid var(--color-accent);
}

.player-result-item:nth-child(1) { animation-delay: 1.1s; }
.player-result-item:nth-child(2) { animation-delay: 1.2s; }
.player-result-item:nth-child(3) { animation-delay: 1.3s; }
.player-result-item:nth-child(4) { animation-delay: 1.4s; }
.player-result-item:nth-child(5) { animation-delay: 1.5s; }
.player-result-item:nth-child(6) { animation-delay: 1.6s; }

.pri-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.pri-avatar-text {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.pri-mvp-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 14px;
  animation: mvp-spin 2s linear infinite;
}

@keyframes mvp-spin {
  from { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(15deg) scale(1.2); }
  to { transform: rotate(0deg) scale(1); }
}

.pri-name {
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
}

.pri-role-tag {
  padding: 2px 10px;
  border-radius: var(--radius-round);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.pri-role-tag.civilian {
  background: #e3f2fd;
  color: var(--color-primary-dark);
}

.pri-role-tag.undercover {
  background: #fff3e0;
  color: #e67e22;
}

.pri-status {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  min-width: 32px;
  text-align: center;
}

.pri-exp {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-success);
  min-width: 56px;
  text-align: right;
}

/* ===== 成就解锁横幅 ===== */
.achievement-banner {
  background: linear-gradient(135deg, #fff9e6, #ffe082);
  border: 1px solid #f9a826;
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  animation: fade-in-up 0.5s ease-out 0.8s both;
}

.ach-banner-icon { font-size: 32px; }
.ach-banner-text { display: flex; flex-direction: column; }
.ach-banner-title { font-size: var(--font-size-base); font-weight: 700; color: #c17d0a; }
.ach-banner-names { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text); }

/* ===== MVP 高亮 ===== */
.mvp-highlight {
  text-align: center;
  padding: var(--spacing-md);
  background: linear-gradient(135deg, #fff9e6, #fff3cd);
  border: 1px solid #f9a826;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: #c17d0a;
  animation: fade-in-up 0.5s ease-out 1.7s both;
}

/* ===== 经验值区域 ===== */
.exp-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  animation: fade-in-up 0.5s ease-out 2s both;
}

.exp-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--spacing-sm);
}

.exp-label {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.exp-count {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-success);
  font-variant-numeric: tabular-nums;
}

.exp-bar-track {
  position: relative;
  height: 10px;
  background: var(--color-bg-dark);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), #27ae60);
  border-radius: 5px;
  transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.exp-bar-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: exp-shimmer 0.8s ease-in-out infinite;
}

@keyframes exp-shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

.exp-level-text {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin: 0;
}

/* ===== 底部按钮 ===== */
.result-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  animation: fade-in-up 0.5s ease-out 1.8s both;
}

.btn {
  padding: 12px 28px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.btn-outline:hover {
  background: var(--color-primary);
  color: #fff;
}

.btn-text {
  background: transparent;
  color: var(--color-text-light);
}

.btn-text:hover {
  color: var(--color-text);
}
</style>
