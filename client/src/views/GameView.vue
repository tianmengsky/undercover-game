<!--
  GameView.vue - 游戏主页面
  功能：三栏布局 + 顶部信息栏，WebSocket/MouseEvent 实时通信
  路由：/game/:gameId
-->
<template>
  <div class="game-view">
    <!-- 淘汰动画弹层 -->
    <Transition name="elim-fade">
      <div v-if="elimAnim.show" class="elim-overlay" @click="skipElimAnim">
        <div class="elim-scene">
          <div class="elim-card-main" :class="{ flipped: elimAnim.flipped }">
            <div class="elim-card-inner">
              <div class="elim-card-front">
                <span class="elim-avatar-big">{{ elimAnim.avatarLetter }}</span>
                <span class="elim-player-name">{{ elimAnim.playerName }}</span>
              </div>
              <div class="elim-card-back" :class="{ undercover: elimAnim.wasUndercover }">
                <span class="elim-role-icon">{{ elimAnim.wasUndercover ? '🕵️' : '👤' }}</span>
                <span class="elim-role-label">{{ elimAnim.wasUndercover ? '卧底' : '平民' }}</span>
              </div>
            </div>
          </div>
          <p class="elim-verdict">
            {{ elimAnim.playerName }} 被投票淘汰
            <span v-if="elimAnim.wasUndercover" class="elim-undercover-tag">卧底身份暴露！</span>
          </p>
        </div>
      </div>
    </Transition>

    <!-- 阶段过渡倒计时 -->
    <Transition name="phase-trans">
      <div v-if="phaseTransition.visible" class="phase-transition-overlay">
        <div class="phase-trans-card">
          <p class="phase-trans-label">第 {{ phaseTransition.round }} 轮发言结束</p>
          <p class="phase-trans-title">即将进入投票阶段</p>
          <p class="phase-trans-count">{{ phaseTransition.remaining }}</p>
        </div>
      </div>
    </Transition>

    <!-- 顶部信息栏 -->
    <GameHeader
      :current-round="gameStore.currentRound"
      :max-rounds="gameStore.maxRounds"
      :alive-count="gameStore.alivePlayers.length"
      :total-count="gameStore.players.length"
      :tts-enabled="tts.enabled.value"
      :your-word="gameStore.yourWord"
      :your-role="gameStore.yourRole"
      @toggle-tts="toggleTTS"
      @exit-room="confirmExit"
    />

    <!-- 主内容区：三栏布局 -->
    <div class="game-body">
      <!-- 左侧玩家列表 -->
      <aside class="side-panel left-panel">
        <PlayerList
          :players="leftPlayers"
          :current-speaker-index="gameStore.currentSpeakerIndex"
          :is-speaking="gameStore.status === 'speaking'"
          :is-voting="false"
          :voted-players="votedTargetSet"
        />
      </aside>

      <!-- 中央发言 / 投票区 -->
      <main class="center-panel">
        <AppCountdown
          v-if="remaining > 0"
          :remaining="remaining"
          :is-urgent="isUrgent"
          :is-expired="isExpired"
          :progress="progress"
        />
        <SpeechArea
          v-if="gameStore.status !== 'voting'"
          :speeches="gameStore.speeches"
          :players="gameStore.players"
          :game-status="gameStore.status"
          :current-speaker-index="gameStore.currentSpeakerIndex"
          :is-speaking="gameStore.status === 'speaking'"
          :is-voting="false"
          :is-typing="isTyping"
          :current-typing-speech="typingSpeech"
          :can-speak="canSpeak"
          :can-vote="false"
          :my-slot-index="humanSlotIndex"
          @send-speech="handleSendSpeech"
        />
        <VotePanel
          v-else
          :candidates="gameStore.alivePlayers"
          :my-slot-index="humanSlotIndex"
          :my-vote="myVoteTarget"
          :has-voted="hasVoted"
          :vote-tally="gameStore.voteTally"
          :voted-count="gameStore.votedCount"
          :total-voters="gameStore.aliveCount"
          :is-tie="false"
          :is-my-turn="gameStore.currentVoterIndex < 0 || gameStore.currentVoterIndex === humanSlotIndex"
          @vote="handleVote"
        />
      </main>

      <!-- 右侧玩家列表 -->
      <aside class="side-panel right-panel">
        <PlayerList
          :players="rightPlayers"
          :current-speaker-index="gameStore.currentSpeakerIndex"
          :is-speaking="gameStore.status === 'speaking'"
          :is-voting="false"
          :voted-players="votedTargetSet"
        />
      </aside>
    </div>

    <!-- 重连横幅 -->
    <Transition name="banner-fade">
      <div v-if="reconnectBanner.show" class="reconnect-banner" :class="reconnectBanner.type">
        {{ reconnectBanner.text }}
      </div>
    </Transition>

    <!-- 房间关闭弹层 -->
    <div v-if="roomClosed" class="game-over-overlay">
      <div class="game-over-card">
        <h2 class="result-title">房间已关闭</h2>
        <p class="result-rounds">所有玩家已离开，房间已关闭</p>
        <div class="result-actions">
          <button class="action-btn primary" @click="goToRooms">返回房间列表</button>
        </div>
      </div>
    </div>

    <!-- 游戏结束弹层 -->
    <div v-if="gameStore.isFinished" class="game-over-overlay">
      <div class="game-over-card">
        <h2 class="result-title">
          {{ gameStore.winner === 'civilian' ? '🎉 平民胜利！' : '🕵️ 卧底胜利！' }}
        </h2>
        <div class="word-reveal">
          <div class="word-item">
            <span class="word-label">平民词</span>
            <span class="word-value">{{ gameStore.civilianWord }}</span>
          </div>
          <div class="word-item">
            <span class="word-label">卧底词</span>
            <span class="word-value">{{ gameStore.undercoverWord }}</span>
          </div>
        </div>
        <p class="result-rounds">共 {{ gameStore.currentRound }} 轮</p>
        <div class="result-actions">
          <button class="action-btn primary" @click="goToRooms">返回房间列表</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useWebSocket } from '@/composables/useWebSocket'
import { useTTS } from '@/composables/useTTS'
import { useTimer } from '@/composables/useTimer'
import { startGame, getGameResult } from '@/services/gameService'
import GameHeader from '@/components/game/GameHeader.vue'
import PlayerList from '@/components/game/PlayerList.vue'
import SpeechArea from '@/components/game/SpeechArea.vue'
import VotePanel from '@/components/game/VotePanel.vue'
import AppCountdown from '@/components/common/AppCountdown.vue'
import { showAchievementUnlock } from '@/composables/useAchievement'
import type { Speech } from '@/types/game'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const { isConnected, connect, send, disconnect, on } = useWebSocket()
const { remaining, isUrgent, isExpired, progress, start: startTimer, stop: stopTimer } = useTimer()

// ── 本地状态 ──
const tts = useTTS()
const isTyping = ref(false)
const typingSpeech = ref<Speech | null>(null)
const votedTargetSet = ref<Set<number>>(new Set())
const humanSlotIndex = ref(-1) // 当前人类玩家的 slotIndex

// 退出确认
const showExitConfirm = ref(false)

// 房间关闭
const roomClosed = ref(false)

// 重连横幅
const reconnectBanner = ref({ show: false, text: '', type: 'info' })
let _bannerTimer: ReturnType<typeof setTimeout> | null = null

function showBanner(text: string, type: 'info' | 'warning' = 'info') {
  if (_bannerTimer) clearTimeout(_bannerTimer)
  reconnectBanner.value = { show: true, text, type }
  _bannerTimer = setTimeout(() => {
    reconnectBanner.value.show = false
  }, 3000)
}

// 淘汰动画状态
const elimAnim = ref({
  show: false,
  flipped: false,
  playerName: '',
  avatarLetter: '',
  wasUndercover: false,
  slotIndex: -1,
})
let _elimTimer: ReturnType<typeof setTimeout> | null = null
let _pendingRedirect = false

// 阶段过渡倒计时
const phaseTransition = ref({ visible: false, nextPhase: '', remaining: 0, round: 0 })

function skipElimAnim() {
  if (_elimTimer) { clearTimeout(_elimTimer); _elimTimer = null }
  elimAnim.value = { show: false, flipped: false, playerName: '', avatarLetter: '', wasUndercover: false, slotIndex: -1 }
  if (_pendingRedirect) {
    _pendingRedirect = false
    router.push(`/result/${gameStore.gameId}`)
  }
}

function playElimAnimation(payload: { slotIndex: number; playerName: string; wasUndercover: boolean }, onDone: () => void) {
  elimAnim.value = {
    show: true,
    flipped: false,
    playerName: payload.playerName,
    avatarLetter: payload.playerName.charAt(0),
    wasUndercover: payload.wasUndercover,
    slotIndex: payload.slotIndex,
  }

  // 0.2s 后翻牌
  setTimeout(() => {
    elimAnim.value.flipped = true
  }, 200)

  // 2.5s 后关闭动画
  _elimTimer = setTimeout(() => {
    elimAnim.value.show = false
    const doRedirectNow = _pendingRedirect
    _pendingRedirect = false
    setTimeout(() => {
      onDone()
      if (doRedirectNow) {
        router.push(`/result/${gameStore.gameId}`)
      }
    }, 400)
  }, 2500)
}

// 人类是否已投票（从 store votes 派生）
const hasVoted = computed(() =>
  gameStore.votes.some(v => v.voterSlot === humanSlotIndex.value),
)

// ── 计算：左右玩家分栏 ──
const leftPlayers = computed(() =>
  gameStore.players.filter(p => p.slotIndex < 3),
)

const rightPlayers = computed(() =>
  gameStore.players.filter(p => p.slotIndex >= 3),
)

// 是否可以发言：轮到人类玩家发言且状态为 speaking
const canSpeak = computed(() => {
  if (gameStore.status !== 'speaking') return false
  if (humanSlotIndex.value < 0) return false
  const human = gameStore.players.find(p => p.slotIndex === humanSlotIndex.value)
  return (
    gameStore.currentSpeakerIndex === humanSlotIndex.value &&
    human?.isAlive &&
    !human?.hasSpokenThisRound
  )
})

// 人类玩家的投票目标
const myVoteTarget = computed(() => {
  const myVote = gameStore.votes.find(v => v.voterSlot === humanSlotIndex.value)
  return myVote ? myVote.targetSlot : null
})

// ── WS 消息监听 ──
function setupWSListeners() {
  // 初始游戏状态快照（store 更新由 useWebSocket 负责，这里只取 humanSlotIndex）
  on('game_state', (p: unknown) => {
    const payload = p as any
    if (payload.yourSlotIndex !== undefined) humanSlotIndex.value = payload.yourSlotIndex
  })

  // 发言请求：启动倒计时
  on('request_speech', (p: unknown) => {
    const payload = p as { slotIndex: number; deadline: number }
    if (payload.slotIndex === humanSlotIndex.value) {
      startTimer(payload.deadline)
    }
  })

  // 发言超时
  on('speech_timeout', () => {
    stopTimer()
  })

  // AI 发言流式动画
  on('ai_speech_chunk', (p: unknown) => {
    const payload = p as { slotIndex: number; chunk: string }
    isTyping.value = true
    const last = gameStore.speeches[gameStore.speeches.length - 1]
    if (last && last.slotIndex === payload.slotIndex) {
      typingSpeech.value = last
    }
  })

  on('ai_speech_end', (p: unknown) => {
    const payload = p as { slotIndex: number; content: string; voicePitch?: number; voiceRate?: number; voiceVolume?: number }
    tts.speak(payload.content, {
      pitch: payload.voicePitch ?? 100,
      rate: payload.voiceRate ?? 150,
      volume: payload.voiceVolume ?? 100,
    })
    // 延迟关闭打字光标
    setTimeout(() => {
      isTyping.value = false
      typingSpeech.value = null
    }, 300)
  })

  // 投票请求：启动倒计时
  on('request_vote', (p: unknown) => {
    tts.stopAll() // 进入投票阶段停止朗读
    const payload = p as { slotIndex: number; deadline: number }
    if (payload.slotIndex === humanSlotIndex.value) {
      startTimer(payload.deadline)
    }
  })

  // 投票结果（player_speech_broadcast 的 addSpeech 由 useWebSocket 负责）
  on('vote_cast', (p: unknown) => {
    const payload = p as { voterSlot: number; targetSlot: number }
    votedTargetSet.value = new Set([...votedTargetSet.value, payload.targetSlot])
  })

  // 投票超时
  on('vote_timeout', () => {
    stopTimer()
  })

  // 淘汰事件 → 先播放动画, 再更新状态
  on('player_eliminated', (p: unknown) => {
    const payload = p as { slotIndex: number; playerName: string; wasUndercover: boolean }
    stopTimer()

    playElimAnimation(payload, () => {
      gameStore.eliminatePlayer(payload.slotIndex)
      // 如果是卧底被淘汰 → 标记
      if (payload.wasUndercover) {
        gameStore.isUndercoverEliminated = true
      }
    })
  })

  // 新轮次
  on('next_round', () => {
    votedTargetSet.value = new Set()
    isTyping.value = false
    typingSpeech.value = null
    stopTimer()
  })

  // 成就解锁通知
  on('achievement_unlocked', (p: unknown) => {
    const payload = p as { achievements: Array<{ name: string; icon: string }> }
    showAchievementUnlock(payload.achievements)
  })

  // 阶段过渡倒计时
  on('phase_transition', (p: unknown) => {
    const payload = p as { nextPhase: string; remaining: number; round: number }
    phaseTransition.value = { visible: true, ...payload }
    if (payload.remaining <= 1) {
      setTimeout(() => { phaseTransition.value.visible = false }, 900)
    }
  })

  // 游戏结束 → 等淘汰动画播完再跳转
  on('game_over', () => {
    stopTimer()
    if (elimAnim.value.show) {
      _pendingRedirect = true
    } else {
      setTimeout(() => {
        router.push(`/result/${gameStore.gameId}`)
      }, 800)
    }
  })

  // ── 多人管理事件 ──

  on('player_disconnected', (p: unknown) => {
    const payload = p as { nickname: string; slotIndex: number }
    showBanner(`⚠️ 玩家「${payload.nickname}」断开连接，30秒后AI接管`, 'warning')
  })

  on('ai_takeover', (p: unknown) => {
    const payload = p as { nickname: string; slotIndex: number }
    showBanner(`🤖 玩家「${payload.nickname}」已由AI托管`, 'warning')
    // 更新 players 列表中的 type
    gameStore.players = gameStore.players.map((pl) =>
      pl.slotIndex === payload.slotIndex ? { ...pl, type: 'ai' as any } : pl,
    )
  })

  on('player_reconnected', (p: unknown) => {
    const payload = p as { nickname: string; slotIndex: number }
    showBanner(`✅ 玩家「${payload.nickname}」重新连接，AI托管已解除`, 'info')
    gameStore.players = gameStore.players.map((pl) =>
      pl.slotIndex === payload.slotIndex ? { ...pl, type: 'human' as any } : pl,
    )
  })

  on('room_deleted', () => {
    roomClosed.value = true
    disconnect()
  })
}

// ── 交互方法 ──
function handleSendSpeech(content: string) {
  send('player_speech', { gameId: gameStore.gameId, content })
  stopTimer()
}

function handleVote(targetSlot: number) {
  if (hasVoted.value) return
  if (gameStore.currentVoterIndex >= 0 && gameStore.currentVoterIndex !== humanSlotIndex.value) return
  send('cast_vote', { gameId: gameStore.gameId, targetSlotIndex: targetSlot })
  stopTimer()
}

function toggleTTS() {
  tts.toggle()
}

function goToRooms() {
  disconnect()
  gameStore.reset()
  router.push('/rooms')
}

function goToLobby() {
  disconnect()
  gameStore.reset()
  router.push('/rooms')
}

function confirmExit() {
  if (confirm('退出后你的角色将由默认AI托管。\n你可以随时重新加入房间。\n\n确定退出吗？')) {
    send('leave_game')
    disconnect()
    gameStore.reset()
    router.push('/rooms')
  }
}

// ── 生命周期 ──
onMounted(async () => {
  // 先清空上一局的残留数据
  gameStore.reset()

  const gameId = route.params.gameId as string
  if (!gameId) {
    router.push('/rooms')
    return
  }

  gameStore.gameId = gameId

  // 恢复人类玩家 slotIndex
  const savedSlot = sessionStorage.getItem(`humanSlot_${gameId}`)
  if (savedSlot) {
    humanSlotIndex.value = parseInt(savedSlot, 10)
  }

  setupWSListeners()

  // 1. 先调用 start API 启动游戏
  try {
    const startRes: any = await startGame(gameId, {
      difficulty: (route.query.difficulty as string) || undefined,
    })
    if (startRes.code !== 0 && startRes.code !== 40904) throw new Error(startRes.message || '启动失败')
  } catch (e: any) {
    console.error('[GameView] 启动游戏失败:', e)
  }

  // 2. 连接 WebSocket（传 slotIndex 让后端返回个人词语）
  connect(gameId, humanSlotIndex.value)
})

onUnmounted(() => {
  disconnect()
})
</script>

<style scoped>
.game-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg);
}

.game-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.side-panel {
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--color-bg);
  border-right: 1px solid var(--color-bg-dark);
}

.right-panel {
  border-right: none;
  border-left: 1px solid var(--color-bg-dark);
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 游戏结束弹层 */
.game-over-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fade-in 0.4s ease;
}

/* ===== 淘汰动画弹层 ===== */
.elim-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
  cursor: pointer;
}

.elim-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
}

.elim-card-main {
  width: 180px;
  height: 130px;
  perspective: 800px;
}

.elim-card-main .elim-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.elim-card-main.flipped .elim-card-inner {
  transform: rotateY(180deg);
}

.elim-card-main .elim-card-front,
.elim-card-main .elim-card-back {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
}

.elim-card-main .elim-card-back {
  transform: rotateY(180deg);
}

.elim-card-main .elim-card-front {
  background: #eceff1;
  border: 3px solid var(--color-bg-dark);
}

.elim-avatar-big {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  margin-bottom: var(--spacing-sm);
}

.elim-player-name {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

.elim-card-main .elim-card-back {
  color: #fff;
  border: 3px solid transparent;
}

.elim-card-main .elim-card-back.undercover {
  background: linear-gradient(135deg, #f9a826, #e74c3c);
  border-color: #e67e22;
  animation: elim-reveal-pulse 0.8s ease-in-out 0.9s;
}

.elim-card-main .elim-card-back:not(.undercover) {
  background: linear-gradient(135deg, #4facfe, #00d2ff);
  border-color: #3d8ed5;
}

@keyframes elim-reveal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 168, 38, 0.5); }
  50% { box-shadow: 0 0 0 20px rgba(249, 168, 38, 0); }
}

.elim-role-icon {
  font-size: 40px;
}

.elim-role-label {
  font-size: var(--font-size-xl);
  font-weight: 800;
  margin-top: 4px;
}

.elim-verdict {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: #fff;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  animation: elim-text-in 0.4s ease-out 0.4s both;
}

@keyframes elim-text-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.elim-undercover-tag {
  display: inline-block;
  padding: 2px 12px;
  border-radius: var(--radius-round);
  background: #ffe082;
  color: #e65100;
  font-size: var(--font-size-base);
  font-weight: 800;
  margin-left: var(--spacing-sm);
  animation: elim-tag-pop 0.4s ease-out 1s both;
  vertical-align: middle;
}

@keyframes elim-tag-pop {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.elim-fade-enter-active { animation: fade-in 0.3s ease-out; }
.elim-fade-leave-active { animation: fade-in 0.3s ease-in reverse; }

/* ===== 阶段过渡倒计时 ===== */
.phase-transition-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 12vh;
  z-index: 140;
  pointer-events: none;
}

.phase-trans-card {
  text-align: center;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.phase-trans-label {
  font-size: var(--font-size-base);
  opacity: 0.75;
  margin-bottom: var(--spacing-sm);
}

.phase-trans-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--spacing-md);
}

.phase-trans-count {
  font-size: 72px;
  font-weight: 800;
  animation: count-pop 0.9s ease-out;
}

@keyframes count-pop {
  0% { transform: scale(1.8); opacity: 0; }
  40% { transform: scale(0.95); opacity: 1; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.phase-trans-enter-active { animation: fade-in 0.2s ease-out; }
.phase-trans-leave-active { animation: fade-in 0.3s ease-in reverse; }

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== 重连横幅 ===== */
.reconnect-banner {
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  padding: 8px var(--spacing-lg);
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  z-index: 160;
}

.reconnect-banner.info {
  background: var(--color-success);
  color: #fff;
}

.reconnect-banner.warning {
  background: var(--color-accent);
  color: #fff;
}

.banner-fade-enter-active { animation: slide-down 0.3s ease-out; }
.banner-fade-leave-active { animation: slide-down 0.3s ease-in reverse; }

@keyframes slide-down {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.game-over-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl);
  text-align: center;
  max-width: 420px;
  width: 90%;
  box-shadow: var(--shadow-lg);
  animation: slide-up 0.4s ease;
}

@keyframes slide-up {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.result-title {
  font-size: var(--font-size-2xl);
  margin-bottom: var(--spacing-lg);
}

.word-reveal {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
}

.word-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.word-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.word-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text);
}

.result-rounds {
  color: var(--color-text-light);
  margin-bottom: var(--spacing-lg);
}

.result-actions {
  display: flex;
  justify-content: center;
}

.action-btn {
  padding: 12px 32px;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn.primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.action-btn.primary:hover {
  background: var(--color-primary-dark);
}

/* 响应式：小屏幕改单列 */
@media (max-width: 768px) {
  .side-panel {
    width: 60px;
  }
}

/* ===== 成就解锁 Toast ===== */
.achievement-toast {
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

.ach-toast-icon {
  font-size: 28px;
}

.ach-toast-text {
  display: flex;
  flex-direction: column;
}

.ach-toast-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: #c17d0a;
}

.ach-toast-names {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.ach-toast-enter-active { animation: ach-toast-in 0.4s ease-out; }
.ach-toast-leave-active { animation: ach-toast-out 0.3s ease-in; }

@keyframes ach-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes ach-toast-out {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(-8px); }
}
</style>
