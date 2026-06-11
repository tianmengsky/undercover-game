<!-- RoomView.vue - 房间等待页 /room/:roomId -->
<template>
  <div class="lobby-view">
    <!-- 返回按钮 -->
    <button class="back-btn" @click="handleLeave">← 返回房间列表</button>

    <!-- 标题 -->
    <div class="lobby-header">
      <h1 class="lobby-title">{{ roomName || '房间' }}</h1>
      <p class="lobby-subtitle">
        房间号: <span class="room-code-inline">{{ roomInfo.roomCode }}</span>
        <button class="copy-btn" @click="copyRoomCode">📋 复制</button>
      </p>
    </div>

    <!-- 角色配置区 -->
    <section class="section">
      <h2 class="section-title">角色配置</h2>
      <div class="slot-grid">
        <div
          v-for="(slot, i) in slots"
          :key="i"
          :class="['slot-card', {
            'slot-human': slot.type === 'human',
            'slot-human-me': slot.isMe,
            'slot-empty': slot.type === 'empty',
            'slot-disconnected': slot.playerStatus === 'disconnected',
          }]"
        >
          <!-- 标签 -->
          <span v-if="slot.type === 'human' && slot.isMe" class="slot-tag">你</span>
          <span v-else-if="slot.type === 'human' && !slot.isMe" class="slot-tag" style="opacity:0.65">已加入</span>
          <span v-else-if="slot.type === 'ai'" class="slot-tag slot-tag-ai">AI</span>

          <!-- 头像 -->
          <div class="slot-avatar">
            {{ slot.type === 'human' ? '👤' : slot.type === 'ai' ? getPersonaEmoji(slot.persona) : '?' }}
          </div>

          <!-- 昵称 -->
          <div class="slot-name" @click="isHost && slot.isMe && startEditName(i)">
            <template v-if="editingSlotIndex === i">
              <input
                v-model="editNickname"
                class="slot-name-input"
                maxlength="8"
                @blur="finishEditName(i)"
                @keyup.enter="finishEditName(i)"
              />
            </template>
            <template v-else>
              <span class="slot-name-text">{{ slot.nickname || (slot.type === 'human' ? '玩家' : slot.type === 'empty' ? '' : 'AI') }}</span>
              <span v-if="slot.isMe && isHost" class="slot-name-edit-icon">✎</span>
            </template>
          </div>

          <!-- AI 人设选择 / 人类标识 / 空位按钮 -->
          <div v-if="slot.type === 'ai'" class="slot-persona">
            <select
              v-model="slot.persona"
              class="persona-select"
              :disabled="!isHost"
              @change="(e) => handleSetPersona(slot.slotIndex, (e.target as HTMLSelectElement).value)"
            >
              <option v-for="p in personaOptions" :key="p.id" :value="p.id">{{ p.emoji }} {{ p.name }}</option>
            </select>
            <button v-if="isHost" class="remove-ai-btn" @click="handleRemoveAI(slot.slotIndex)" title="移除AI">×</button>
          </div>
          <div v-else-if="slot.type === 'human' && !slot.isMe" class="slot-persona-placeholder">
            已加入
            <button v-if="isHost" class="kick-btn" @click="handleKick(slot)" title="踢出">×</button>
          </div>
          <div v-else-if="slot.type === 'human' && slot.isMe" class="slot-persona-placeholder">
            {{ isHost ? '房主' : '你' }}
          </div>
          <div v-else class="slot-persona-placeholder">
            <button v-if="isHost" class="add-ai-circle" @click="handleFillAI(slot.slotIndex)" title="添加AI玩家">+</button>
            <span v-else>等待加入</span>
          </div>
        </div>
      </div>
      <p class="room-hint">请填满所有 6 个槽位才能开始游戏</p>
    </section>

    <!-- 词语设置区 -->
    <section class="section">
      <h2 class="section-title">词语设置</h2>

      <!-- 模式切换 -->
      <div class="mode-tabs">
        <button
          :class="['mode-tab', { active: wordMode === 'ai' }]"
          :disabled="!isHost"
          @click="wordMode = 'ai'"
        >🤖 AI 自动生成</button>
        <button
          :class="['mode-tab', { active: wordMode === 'custom' }]"
          :disabled="!isHost"
          @click="wordMode = 'custom'"
        >✏️ 自定义输入</button>
      </div>

      <!-- AI 模式：选难度 + 说明 -->
      <div v-if="wordMode === 'ai'" class="mode-ai-panel">
        <div class="difficulty-row">
          <label class="diff-label">词汇难度</label>
          <select v-model="difficulty" class="diff-select" :disabled="!isHost">
            <option value="入门">  入门（日常物品）</option>
            <option value="简单">⭐ 简单（易区分）</option>
            <option value="适中">⭐⭐ 适中（需推理）</option>
            <option value="稍难">⭐⭐⭐ 稍难（较接近）</option>
            <option value="困难">⭐⭐⭐⭐ 困难（极易混淆）</option>
            <option value="超难">⭐⭐⭐⭐⭐ 超难（地狱难度）</option>
          </select>
        </div>
        <p class="ai-mode-hint">游戏开始时 AI 自动生成词语，所有人都不知道答案，保证公平对决</p>
      </div>

      <!-- 自定义模式：两个输入框 -->
      <div v-else class="mode-custom-panel">
        <div class="word-row">
          <div class="word-input-group word-civilian">
            <label class="word-label">平民词</label>
            <input
              v-model="civilianWord"
              type="text"
              class="word-input civilian-input"
              placeholder="输入平民词语"
              maxlength="10"
              :disabled="!isHost"
            />
          </div>
          <div class="word-input-group word-undercover">
            <label class="word-label">卧底词</label>
            <input
              v-model="undercoverWord"
              type="text"
              class="word-input undercover-input"
              placeholder="输入卧底词语"
              maxlength="10"
              :disabled="!isHost"
            />
          </div>
        </div>
        <p v-if="customEqual" class="custom-error">⚠️ 两个词不能相同</p>
        <p v-else class="custom-hint">提示：两个词应相似但不同，例如"苹果/梨子"</p>
      </div>
    </section>

    <!-- 开始按钮 -->
    <button
      v-if="isHost"
      class="btn-start"
      :disabled="filledCount < 6"
      @click="handleStart"
    >开始游戏</button>
    <p v-if="!isHost" class="waiting-text">等待房主开始游戏<span class="dots"></span></p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWebSocket } from '@/composables/useWebSocket'
import { getMyPersonas, getPublicPersonas } from '@/services/personaService'
import { startGame } from '@/services/gameService'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { connect, disconnect, send, on } = useWebSocket()

const roomId = route.params.roomId as string

const roomInfo = ref({ roomCode: '', roomName: '' })
const roomName = ref('')

const slots = ref<Array<{
  slotIndex: number
  type: 'human' | 'ai' | 'empty'
  nickname?: string
  persona?: string
  isMe: boolean
  isHost: boolean
  playerStatus?: 'normal' | 'disconnected' | 'ai_takeover'
}>>([])

const isHost = ref(false)
const mySlotIndex = ref(parseInt(sessionStorage.getItem(`humanSlot_${roomId}`) || '0', 10))
const myUserId = computed(() => authStore.user?.id || '')
const filledCount = computed(() => slots.value.filter((s) => s.type !== 'empty').length)

// ── 人设选项（6 内置 + API 加载） ──
interface PersonaOption { id: string; name: string; emoji: string }
const personaOptions = ref<PersonaOption[]>([
  { id: 'default', name: '默认', emoji: '🤖' },
  { id: 'humor', name: '幽默达人', emoji: '😄' },
  { id: 'logic', name: '逻辑大师', emoji: '🧠' },
  { id: 'newbie', name: '萌新小白', emoji: '😇' },
  { id: 'literary', name: '文艺青年', emoji: '🎨' },
  { id: 'grumpy', name: '暴躁老哥', emoji: '😤' },
])

function getPersonaEmoji(id?: string): string {
  return personaOptions.value.find((p) => p.id === id)?.emoji || '🤖'
}

function getPersonaName(id?: string): string {
  return personaOptions.value.find((p) => p.id === id)?.name || ''
}

// 昵称编辑
const editingSlotIndex = ref(-1)
const editNickname = ref('')

function startEditName(i: number) {
  editingSlotIndex.value = i
  editNickname.value = slots.value[i]?.nickname || ''
}

function finishEditName(i: number) {
  editingSlotIndex.value = -1
  if (editNickname.value.trim() && slots.value[i]) {
    slots.value[i].nickname = editNickname.value.trim()
  }
}

// ── 词语设置 ──
const wordMode = ref<'ai' | 'custom'>('ai')
const difficulty = ref('适中')
const civilianWord = ref('苹果')
const undercoverWord = ref('梨子')
const customEqual = computed(() =>
  wordMode.value === 'custom' &&
  civilianWord.value.trim() && undercoverWord.value.trim() &&
  civilianWord.value.trim() === undercoverWord.value.trim(),
)

function initEmptySlots() {
  slots.value = Array.from({ length: 6 }, (_, i) => ({
    slotIndex: i, type: 'empty' as const,
    isMe: i === mySlotIndex.value, isHost: i === mySlotIndex.value,
    playerStatus: 'normal' as const,
  }))
}

function buildSlotsFromPlayers(players: any[], hostUserId: string) {
  slots.value = Array.from({ length: 6 }, (_, i) => {
    const p = players[i]
    if (p && p.type !== 'empty') {
      const isMySlot = i === mySlotIndex.value
      return {
        slotIndex: i, type: p.type,
        nickname: getPersonaName(p.persona || p.aiPersona) || p.customName || (p.type === 'ai' ? getPersonaName('default') : ''),
        persona: p.persona || p.aiPersona,
        isMe: isMySlot, isHost: isMySlot && hostUserId === myUserId.value,
        playerStatus: 'normal' as const,
      }
    }
    return { slotIndex: i, type: 'empty' as const, isMe: i === mySlotIndex.value, isHost: false, playerStatus: 'normal' as const }
  })
  isHost.value = myUserId.value === hostUserId
}

function handleSetPersona(slotIndex: number, persona: string) {
  // 立即更新本地昵称（避免等服务端广播回来覆盖）
  const name = getPersonaName(persona)
  const slot = slots.value[slotIndex]
  if (slot) slot.nickname = name || slot.nickname
  send('set_persona', { slotIndex, persona })
}
function handleKick(slot: any) {
  if (confirm(`确定要踢出玩家「${slot.nickname}」吗？`)) send('kick_player', { targetSlotIndex: slot.slotIndex })
}
function handleRemoveAI(slotIndex: number) { handleSetPersona(slotIndex, 'empty') }
function handleFillAI(slotIndex: number) { handleSetPersona(slotIndex, 'default') }
function copyRoomCode() { navigator.clipboard.writeText(roomInfo.value.roomCode) }

async function handleStart() {
  try {
    const res: any = await startGame(roomId, { difficulty: difficulty.value })
    if (res.code === 0) router.push(`/game/${roomId}`)
  } catch { /* GameView 也会调一次 */ }
}

function handleLeave() { send('leave_room'); router.push('/rooms') }

onMounted(async () => {
  initEmptySlots()
  connect(roomId, mySlotIndex.value)

  // 加载人设列表（内置 6 个 + API 加载工坊人设）
  try {
    const [publicRes, myRes] = await Promise.all([
      getPublicPersonas({ pageSize: 50 }),
      getMyPersonas(),
    ])
    const merge = (res: any) => {
      for (const p of (res.data?.list || [])) {
        if (!personaOptions.value.some((opt) => opt.id === p.id)) {
          personaOptions.value.push({ id: p.id, name: p.name, emoji: '🧩' })
        }
      }
    }
    if (publicRes.code === 0) merge(publicRes)
    if (myRes.code === 0) merge(myRes)
    // 持久化人设名映射（供 game store 使用）
    const map: Record<string, string> = {}
    for (const p of personaOptions.value) map[p.id] = p.name
    sessionStorage.setItem('personaNameMap', JSON.stringify(map))
  } catch { /* ignore */ }

  // WS 事件
  on('game_state', (p: any) => {
    // 重连进入已开始的游戏 → 跳转
    if (p.status && p.status !== 'waiting') {
      disconnect()
      router.push(`/game/${roomId}`)
    }
  })
  on('room_state', (p: any) => {
    roomInfo.value = { roomCode: p.roomCode || '', roomName: p.roomName || '' }
    roomName.value = p.roomName || ''
    if (p.players) buildSlotsFromPlayers(p.players, p.hostUserId || '')
  })
  on('room_updated', (p: any) => {
    roomInfo.value = { roomCode: p.roomCode || '', roomName: p.roomName || '' }
    roomName.value = p.roomName || ''
    if (p.players) buildSlotsFromPlayers(p.players, p.hostUserId || '')
  })
  on('player_joined', (p: any) => {
    const idx = slots.value.findIndex((s) => s.slotIndex === p.slotIndex)
    if (idx >= 0) slots.value[idx] = { ...slots.value[idx], type: 'human', nickname: p.nickname, isMe: false, isHost: false }
  })
  on('player_left', (p: any) => {
    const idx = slots.value.findIndex((s) => s.slotIndex === p.slotIndex)
    if (idx >= 0) { slots.value[idx] = { slotIndex: p.slotIndex, type: 'empty', isMe: false, isHost: false } }
  })
  on('host_changed', (p: any) => { isHost.value = p.newHostId === myUserId.value })
  on('words_updated', (p: any) => { civilianWord.value = p.civilianWord; undercoverWord.value = p.undercoverWord })
  on('kicked_from_room', (p: any) => { if (p.slotIndex === mySlotIndex.value) { disconnect(); router.push('/rooms') } })
  on('game_started', () => { router.push(`/game/${roomId}`) })
})

onUnmounted(() => disconnect())
</script>

<style scoped>
/* ── 与 GameLobbyView 完全一致的页面容器和标题 ── */
.lobby-view {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-md) var(--spacing-2xl);
}

.back-btn {
  display: inline-block;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  margin-bottom: var(--spacing-xs);
  padding: 4px 0;
}

.lobby-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.lobby-title {
  font-size: var(--font-size-2xl);
  color: var(--color-primary);
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
}

.lobby-subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-light);
}

.room-code-inline {
  font-family: monospace;
  font-weight: 700;
  color: var(--color-text);
}

.copy-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--font-size-base);
  margin-left: 4px;
}

/* ── 与 GameLobbyView 完全一致的 section 卡片 ── */
.section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-bg-dark);
}

/* ── 与 GameLobbyView 完全一致的槽位卡片 ── */
.slot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.slot-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-bg-dark);
  background: var(--color-surface);
  transition: all var(--transition-fast);
  position: relative;
}

.slot-card:hover {
  border-color: #c8d6e5;
  box-shadow: var(--shadow-sm);
}

.slot-human {
  border-color: var(--color-success);
}

.slot-human-me {
  border-color: var(--color-primary);
  background: rgba(79, 172, 254, 0.04);
}

.slot-empty {
  border-style: dashed;
}

.slot-disconnected {
  border-color: var(--color-accent);
}

/* ── 与 GameLobbyView 完全一致的标签 ── */
.slot-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
}

.slot-tag-ai {
  background: var(--color-text-light);
}

.slot-avatar {
  font-size: 36px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-bg);
  flex-shrink: 0;
}

.slot-name {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.slot-name:hover {
  background: var(--color-bg);
}

.slot-name-text {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-name-edit-icon {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.slot-name:hover .slot-name-edit-icon {
  opacity: 1;
}

.slot-name-input {
  width: 80px;
  height: 26px;
  padding: 2px 6px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-weight: 600;
  text-align: center;
  outline: none;
  box-sizing: border-box;
}

.slot-persona {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
}

.persona-select {
  flex: 1;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-bg);
  cursor: pointer;
  outline: none;
}

.persona-select:focus {
  border-color: var(--color-primary);
}

.persona-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slot-persona-placeholder {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.remove-ai-btn,
.kick-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--color-danger);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-ai-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-primary);
  background: var(--color-primary);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.add-ai-circle:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
  transform: scale(1.1);
}

.room-hint {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-top: var(--spacing-md);
}

/* ── 与 GameLobbyView 完全一致的词语设置区 ── */
.word-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.word-input-group {
  flex: 1;
}

.word-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.word-input {
  width: 100%;
  height: 44px;
  padding: 0 var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-lg);
  text-align: center;
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.civilian-input {
  border: 2px solid var(--color-primary);
  color: var(--color-primary-dark);
}

.civilian-input:focus {
  border-color: var(--color-primary-dark);
  box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.15);
}

.undercover-input {
  border: 2px solid var(--color-accent);
  color: #c17d0a;
}

.undercover-input:focus {
  border-color: #c17d0a;
  box-shadow: 0 0 0 3px rgba(249, 168, 38, 0.15);
}

.word-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 模式切换 tabs */
.mode-tabs {
  display: flex;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-bg-dark);
  margin-bottom: var(--spacing-md);
}

.mode-tab {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: var(--color-surface);
  color: var(--color-text-light);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-tab.active {
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
}

.mode-tab:first-child {
  border-right: 1px solid var(--color-bg-dark);
}

.mode-ai-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.difficulty-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.diff-label {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  flex-shrink: 0;
}

.diff-select {
  flex: 1;
  height: 44px;
  padding: 0 var(--spacing-md);
  border: 2px solid var(--color-bg-dark);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
}

.diff-select:focus {
  border-color: var(--color-primary);
}

.diff-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-mode-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  text-align: center;
  padding: var(--spacing-xs) 0;
}

.mode-custom-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.custom-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  text-align: center;
}

.custom-error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  text-align: center;
  font-weight: 600;
}

/* ── 与 GameLobbyView 完全一致的开始按钮 ── */
.btn-start {
  display: block;
  width: 240px;
  height: 48px;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  border: none;
  border-radius: var(--radius-round);
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 14px rgba(79, 172, 254, 0.35);
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 172, 254, 0.45);
}

.btn-start:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.waiting-text {
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-light);
  padding-top: var(--spacing-lg);
}

.dots::after {
  content: '';
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}

@media (max-width: 600px) {
  .slot-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .word-row {
    flex-direction: column;
  }
}
</style>
