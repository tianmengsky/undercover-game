<!--
  ReplayView.vue - 游戏回放页
  路由：/replay/:gameId
  功能：逐事件播放回放（发言气泡、投票、淘汰、游戏结束）
-->
<template>
  <div class="replay-view">
    <template v-if="loading">
      <div class="rp-status">加载回放数据...</div>
    </template>

    <template v-else-if="error">
      <div class="rp-status rp-error">{{ error }}</div>
      <button class="btn btn-primary" @click="goToLobby">返回大厅</button>
    </template>

    <template v-else-if="data">
      <!-- ===== 顶部信息 ===== -->
      <div class="rp-header">
        <h1 class="rp-title">
          {{ data.winner === 'civilian' ? '🎉 平民胜利' : '🕵️ 卧底胜利' }}
        </h1>
        <p class="rp-words">
          <span class="rp-word-tag civilian">{{ data.civilianWord }}</span>
          <span class="rp-vs">vs</span>
          <span class="rp-word-tag undercover">{{ data.undercoverWord }}</span>
        </p>
        <p class="rp-rounds">共 {{ data.totalRounds }} 轮 · {{ data.events?.length || 0 }} 个事件</p>
      </div>

      <!-- ===== 播放器控制条 ===== -->
      <div class="rp-controls">
        <button class="rp-btn" @click="isPlaying ? pause() : play()">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <div class="rp-progress" ref="progressRef" @click="seekByClick">
          <div class="rp-progress-track">
            <div
              class="rp-progress-fill"
              :style="{ width: progressPct + '%' }"
            />
          </div>
          <span
            v-for="(ev, i) in data.events"
            :key="i"
            class="rp-event-dot"
            :class="ev.type"
            :style="{ left: (Number(i) / Math.max(data.events.length - 1, 1)) * 100 + '%' }"
          />
        </div>
        <div class="rp-speed-btns">
          <button
            v-for="s in speeds"
            :key="s"
            :class="['rp-speed-btn', { active: speed === s }]"
            @click="speed = s"
          >
            {{ s }}x
          </button>
        </div>
        <span class="rp-event-counter">
          {{ Math.min(currentIndex + 1, events.length) }} / {{ events.length }}
        </span>
      </div>

      <!-- ===== 事件展示区 ===== -->
      <div class="rp-event-area" ref="eventAreaRef">
        <div
          v-for="(ev, i) in events"
          :key="i"
          class="rp-event"
          :class="{ 'is-current': Number(i) === currentIndex, 'is-past': Number(i) < currentIndex }"
        >
          <!-- 发言事件 -->
          <div v-if="ev.type === 'speech'" class="rp-speech-bubble">
            <span class="rp-speech-name">{{ playerName(ev.payload.slotIndex) }}</span>
            <span v-if="ev.payload.persona" class="rp-persona-tag">{{ ev.payload.persona }}</span>
            <span v-if="ev.payload.isAI" class="rp-ai-tag">AI</span>
            <p class="rp-speech-content">{{ ev.payload.content }}</p>
            <div v-if="ev.aiInnerThought" class="rp-thought-bubble">
              <span class="rp-thought-icon">💭</span>
              <span class="rp-thought-text">{{ displayedThought(ev) }}</span>
              <button
                v-if="ev._fullThink"
                class="rp-thought-expand"
                @click="toggleThought(ev)"
              >{{ ev._expanded ? '收起' : '展开全部' }}</button>
            </div>
          </div>

          <!-- 投票事件 -->
          <div v-else-if="ev.type === 'vote_cast'" class="rp-vote-event">
            🗳 {{ ev.payload.voterName }}
            →
            {{ ev.payload.targetName }}
            <div v-if="ev.aiInnerThought" class="rp-thought-bubble rp-thought-vote">
              <span class="rp-thought-icon">💭</span>
              <span class="rp-thought-text">{{ displayedThought(ev) }}</span>
              <button
                v-if="ev._fullThink"
                class="rp-thought-expand"
                @click="toggleThought(ev)"
              >{{ ev._expanded ? '收起' : '展开全部' }}</button>
            </div>
          </div>

          <!-- 淘汰事件：角色揭示翻牌动画 -->
          <div
            v-else-if="ev.type === 'elimination'"
            class="rp-elimination-event"
            :class="{
              'is-undercover': ev.payload.wasUndercover,
              'is-active': i === currentIndex,
            }"
          >
            <div class="elim-card" :class="{ flipped: Number(i) <= currentIndex }">
              <div class="elim-card-inner">
                <div class="elim-card-front">
                  <span class="elim-avatar">{{ playerName(ev.payload.slotIndex).charAt(0) }}</span>
                  <span class="elim-name">{{ ev.payload.playerName }}</span>
                </div>
                <div class="elim-card-back" :class="{ undercover: ev.payload.wasUndercover }">
                  <span class="elim-role-icon">{{ ev.payload.wasUndercover ? '🕵️' : '👤' }}</span>
                  <span class="elim-role-text">{{ ev.payload.wasUndercover ? '卧底' : '平民' }}</span>
                </div>
              </div>
            </div>
            <p class="elim-caption">
              {{ ev.payload.playerName }} 被淘汰
              <span v-if="ev.payload.wasUndercover" class="elim-reveal-tag">卧底身份暴露！</span>
            </p>
            <div v-if="ev.aiInnerThought" class="rp-thought-bubble rp-thought-elim">
              <span class="rp-thought-icon">💭</span>
              <span class="rp-thought-text">{{ displayedThought(ev) }}</span>
              <button
                v-if="ev._fullThink"
                class="rp-thought-expand"
                @click="toggleThought(ev)"
              >{{ ev._expanded ? '收起' : '展开全部' }}</button>
            </div>
          </div>

          <!-- 轮次开始 -->
          <div v-else-if="ev.type === 'round_start'" class="rp-round-event">
            ── 第 {{ ev.payload.round }} 轮开始 ──
          </div>

          <!-- 游戏开始 -->
          <div v-else-if="ev.type === 'game_start'" class="rp-round-event">
            ── 游戏开始（{{ ev.payload.totalPlayers }} 名玩家）──
          </div>

          <!-- 游戏结束 -->
          <div v-else-if="ev.type === 'game_over'" class="rp-round-event">
            ── 游戏结束：{{ ev.payload.winner === 'civilian' ? '平民胜利' : '卧底胜利' }} ──
          </div>
        </div>

        <!-- 完结提示 -->
        <div v-if="currentIndex >= events.length && events.length > 0" class="rp-end">
          回放结束
        </div>
      </div>

      <!-- ===== 玩家状态栏 ===== -->
      <div class="rp-players">
        <div
          v-for="p in playerStates"
          :key="p.slotIndex"
          class="rp-player-chip"
          :class="{ dead: !p.alive }"
        >
          <span class="rp-player-avatar">{{ p.name.charAt(0) }}</span>
          <span>{{ p.name }}</span>
        </div>
      </div>

      <!-- ===== 底部按钮 ===== -->
      <div class="rp-actions">
        <button class="btn btn-primary" @click="goToLobby">返回大厅</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getReplay } from '@/services/gameService'

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

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const data = ref<any>(null)
const currentIndex = ref(-1)
const isPlaying = ref(false)
const speed = ref(1)
const speeds = [1, 2, 4]
const progressRef = ref<HTMLElement | null>(null)
const eventAreaRef = ref<HTMLElement | null>(null)

let _playTimer: ReturnType<typeof setTimeout> | null = null

const events = computed(() => data.value?.events || [])
const progressPct = computed(() => {
  if (events.value.length <= 1) return 0
  return (currentIndex.value / (events.value.length - 1)) * 100
})

const playerStates = computed(() => {
  if (!data.value?.players) return []
  return data.value.players.map((p: any) => {
    // 根据事件推算状态
    let alive = true
    for (let i = 0; i <= currentIndex.value && i < events.value.length; i++) {
      const ev = events.value[i]
      if (ev.type === 'elimination' && ev.payload.slotIndex === p.slotIndex) {
        alive = false
      }
    }
    return { slotIndex: p.slotIndex, name: p.customName || (p.type === 'ai' ? resolvePersonaName(p.aiPersona) || `AI-${p.slotIndex + 1}` : `玩家${p.slotIndex + 1}`), alive }
  })
})

function playerName(slotIndex: number): string {
  const p = data.value?.players?.find((p: any) => p.slotIndex === slotIndex)
  if (!p) return `玩家${slotIndex + 1}`
  return p.customName || (p.type === 'ai' ? resolvePersonaName(p.aiPersona) || `AI-${slotIndex + 1}` : `玩家${slotIndex + 1}`)
}

function displayedThought(ev: any): string {
  return ev._expanded && ev._fullThink ? ev._fullThink : ev.aiInnerThought
}

function toggleThought(ev: any) {
  ev._expanded = !ev._expanded
}

function play() {
  if (currentIndex.value >= events.value.length) {
    currentIndex.value = -1
  }
  isPlaying.value = true
  tick()
}

function pause() {
  isPlaying.value = false
  if (_playTimer) { clearTimeout(_playTimer); _playTimer = null }
}

function tick() {
  if (!isPlaying.value) return
  const next = currentIndex.value + 1
  if (next >= events.value.length) {
    currentIndex.value = events.value.length
    isPlaying.value = false
    return
  }

  currentIndex.value = next
  scrollToCurrent()

  const evType = events.value[next].type
  const interval =
    evType === 'elimination' ? 3500   // 淘汰翻牌动画需要更长时间
    : evType === 'speech' ? 2500
    : 1200
  _playTimer = setTimeout(tick, interval / speed.value)
}

function scrollToCurrent() {
  setTimeout(() => {
    const el = eventAreaRef.value?.querySelector('.is-current')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 50)
}

function seekByClick(e: MouseEvent) {
  const el = progressRef.value
  if (!el || events.value.length <= 1) return
  const rect = el.getBoundingClientRect()
  const pct = (e.clientX - rect.left) / rect.width
  currentIndex.value = Math.round(pct * (events.value.length - 1))
  scrollToCurrent()
}

function goToLobby() {
  router.push('/rooms')
}

onMounted(async () => {
  const gameId = route.params.gameId as string
  if (!gameId) {
    error.value = '缺少游戏 ID'
    loading.value = false
    return
  }

  try {
    const res: any = await getReplay(gameId)
    if (res.code !== 0) throw new Error(res.message || '加载失败')
    data.value = res.data
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  pause()
})
</script>

<style scoped>
.replay-view {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.rp-status {
  text-align: center;
  padding: var(--spacing-3xl);
  font-size: var(--font-size-lg);
  color: var(--color-text-light);
}
.rp-error { color: var(--color-danger); }

/* ===== 顶部信息 ===== */
.rp-header {
  text-align: center;
  padding: var(--spacing-md) 0;
}

.rp-title {
  font-size: 28px;
  font-weight: 800;
}

.rp-words {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.rp-word-tag {
  padding: 4px 16px;
  border-radius: var(--radius-round);
  font-weight: 600;
  color: #fff;
}
.rp-word-tag.civilian { background: var(--color-primary); }
.rp-word-tag.undercover { background: var(--color-accent); }
.rp-vs { font-weight: 700; color: var(--color-text-light); }
.rp-rounds { font-size: var(--font-size-sm); color: var(--color-text-light); margin-top: 4px; }

/* ===== 控制条 ===== */
.rp-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 8px var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 56px;
  z-index: 50;
}

.rp-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.rp-progress {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.rp-progress-track {
  width: 100%;
  height: 6px;
  background: var(--color-bg-dark);
  border-radius: 3px;
  overflow: hidden;
}

.rp-progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.rp-event-dot {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-round);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.rp-event-dot.speech { background: var(--color-primary); }
.rp-event-dot.vote_cast { background: var(--color-accent); }
.rp-event-dot.elimination { background: var(--color-danger); }
.rp-event-dot.game_start,
.rp-event-dot.round_start,
.rp-event-dot.game_over { background: var(--color-text-light); }

.rp-speed-btns {
  display: flex;
  gap: 2px;
}

.rp-speed-btn {
  padding: 2px 8px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: var(--font-size-sm);
  cursor: pointer;
  color: var(--color-text-light);
  transition: all var(--transition-fast);
}

.rp-speed-btn.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.rp-event-counter {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  min-width: 48px;
  text-align: right;
}

/* ===== 事件区 ===== */
.rp-event-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-md);
}

.rp-event {
  opacity: 0.35;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.rp-event.is-current {
  opacity: 1;
  background: rgba(79, 172, 254, 0.06);
  border: 1px solid rgba(79, 172, 254, 0.2);
}

.rp-event.is-past { opacity: 0.7; }

/* 发言气泡 */
.rp-speech-bubble {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.rp-speech-name { font-weight: 600; color: var(--color-text); }
.rp-persona-tag {
  font-size: var(--font-size-sm);
  padding: 0 6px;
  border-radius: var(--radius-round);
  background: #e3f2fd;
  color: var(--color-primary-dark);
  margin-left: 4px;
}
.rp-ai-tag {
  font-size: var(--font-size-sm);
  padding: 0 6px;
  border-radius: var(--radius-round);
  background: #f3e5f5;
  color: #7b1fa2;
  margin-left: 4px;
}
.rp-speech-content {
  margin: var(--spacing-sm) 0 0;
  color: var(--color-text);
  line-height: 1.6;
}

/* AI 心理旁白气泡 */
.rp-thought-bubble {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-top: 4px;
  margin-left: var(--spacing-md);
  border-left: 3px solid #b0bec5;
  background: rgba(176, 190, 197, 0.08);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  animation: thought-in 0.5s ease-out both;
  animation-delay: 0.3s;
}

.rp-thought-bubble.rp-thought-vote {
  margin-left: 0;
  margin-top: 6px;
  justify-content: center;
  border-left: none;
  border-top: 1px solid rgba(176, 190, 197, 0.3);
  border-radius: 0;
  padding-top: 6px;
}

.rp-thought-bubble.rp-thought-elim {
  margin-left: 0;
  margin-top: var(--spacing-xs);
  justify-content: center;
}

.rp-thought-icon {
  font-size: var(--font-size-sm);
  opacity: 0.6;
  flex-shrink: 0;
  margin-top: 1px;
}

.rp-thought-text {
  font-size: var(--font-size-sm);
  color: #78909c;
  font-style: italic;
  line-height: 1.5;
}

.rp-thought-expand {
  display: block;
  margin-top: 4px;
  padding: 0;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  align-self: flex-start;
}

.rp-thought-expand:hover {
  color: var(--color-primary-dark);
}

@keyframes thought-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 投票 */
.rp-vote-event {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-accent);
  font-weight: 500;
}

/* 淘汰 → 角色揭示翻牌 */
.rp-elimination-event {
  text-align: center;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.elim-card {
  width: 120px;
  height: 80px;
  perspective: 600px;
}

.elim-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.elim-card.flipped .elim-card-inner {
  transform: rotateY(180deg);
}

.elim-card-front,
.elim-card-back {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
}

.elim-card-back {
  transform: rotateY(180deg);
}

.elim-card-front {
  background: #eceff1;
  border: 2px solid var(--color-bg-dark);
}

.elim-card-back {
  border: 2px solid var(--color-primary);
  color: #fff;
}

.elim-card-back.undercover {
  background: linear-gradient(135deg, #f9a826, #e74c3c);
  border-color: #e67e22;
  animation: elim-reveal-pulse 0.6s ease-in-out 0.7s;
}

.elim-card-back:not(.undercover) {
  background: linear-gradient(135deg, #4facfe, #00d2ff);
}

@keyframes elim-reveal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 168, 38, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(249, 168, 38, 0); }
}

.elim-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.elim-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}

.elim-role-icon {
  font-size: 24px;
}

.elim-role-text {
  font-size: var(--font-size-base);
  font-weight: 800;
  margin-top: 2px;
}

.elim-caption {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-danger);
  margin: 0;
}

.elim-reveal-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--radius-round);
  background: #fff3e0;
  color: #e67e22;
  font-size: var(--font-size-sm);
  margin-left: 4px;
  animation: elim-tag-pop 0.4s ease-out 0.9s both;
}

@keyframes elim-tag-pop {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 轮次/开始/结束 */
.rp-round-event {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-weight: 500;
  padding: 4px 0;
}

.rp-end {
  text-align: center;
  padding: var(--spacing-lg);
  font-size: var(--font-size-lg);
  color: var(--color-text-light);
  font-weight: 600;
}

/* ===== 玩家状态栏 ===== */
.rp-players {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.rp-player-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: var(--radius-round);
  background: var(--color-surface);
  border: 1px solid var(--color-bg-dark);
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.rp-player-chip.dead {
  opacity: 0.4;
  text-decoration: line-through;
  transition: all 0.5s ease;
}

.rp-player-avatar {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 底部按钮 ===== */
.rp-actions {
  display: flex;
  justify-content: center;
  padding-top: var(--spacing-sm);
}

.btn {
  padding: 12px 28px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}
</style>
