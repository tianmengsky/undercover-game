<!--
  GameLobbyView.vue - 游戏大厅页（已废弃）
  功能：角色配置区域（6槽位）+ 词语生成区域 + 开始按钮
  路由：/lobby
  权限：登录
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { createGame } from '@/services/gameService'
import { getMyPersonas } from '@/services/personaService'

const router = useRouter()
const authStore = useAuthStore()

// ========== 人设选项（6 个内置 + API 加载的官方/自定义） ==========
const personaOptions = ref([
  { id: 'default', name: '默认', emoji: '🤖', desc: '中性理性，正常描述词语' },
  { id: 'humor', name: '幽默达人', emoji: '😄', desc: '搞笑夸张，喜欢玩梗' },
  { id: 'logic', name: '逻辑大师', emoji: '🧠', desc: '严谨推理，喜欢拆解词语' },
  { id: 'newbie', name: '萌新小白', emoji: '😇', desc: '天真懵懂，偶尔跑题' },
  { id: 'literary', name: '文艺青年', emoji: '🎨', desc: '诗意浪漫，喜欢比喻' },
  { id: 'grumpy', name: '暴躁老哥', emoji: '😤', desc: '不耐烦直接，说话冲' },
])

// ========== 角色槽位 ==========
interface SlotConfig {
  slotIndex: number
  type: 'human' | 'ai'
  customName: string
  persona: string
}

const slots = reactive<SlotConfig[]>([
  { slotIndex: 0, type: 'human', customName: authStore.user?.nickname || '你', persona: '' },
  { slotIndex: 1, type: 'ai', customName: '小默', persona: 'default' },
  { slotIndex: 2, type: 'ai', customName: '幽默达人', persona: 'humor' },
  { slotIndex: 3, type: 'ai', customName: '逻辑大师', persona: 'logic' },
  { slotIndex: 4, type: 'ai', customName: '萌新小白', persona: 'newbie' },
  { slotIndex: 5, type: 'ai', customName: '文艺青年', persona: 'literary' },
])

const editingSlotIndex = ref(-1)

function startEditName(index: number) {
  editingSlotIndex.value = index
}

function finishEditName() {
  editingSlotIndex.value = -1
}

function getPersonaInfo(personaId: string) {
  return personaOptions.value.find((p) => p.id === personaId) || personaOptions.value[0] || { id: '', name: '未知', emoji: '🤖', desc: '' }
}

function onPersonaChange(slot: SlotConfig, personaId: string) {
  slot.persona = personaId
  const info = getPersonaInfo(personaId)
  slot.customName = info.name
}

// ========== 加载我创建的 + localStorage 选用的人设 ==========
onMounted(async () => {
  // 1. 我创建的自定义人设
  try {
    const res: any = await getMyPersonas()
    if (res.code === 0 && res.data?.list?.length > 0) {
      for (const p of res.data.list) {
        if (!personaOptions.value.some((opt) => opt.id === p.id)) {
          personaOptions.value.push({
            id: p.id,
            name: p.name,
            emoji: '🧩',
            desc: p.description.slice(0, 30),
          })
        }
      }
    }
  } catch { /* ignore */ }

  if (authStore.isAuthenticated) {
    // 2. 从 localStorage 读取已选用的人设（按 userId 隔离）
    try {
      const uid = authStore.user?.id
      if (uid) {
        // 旧 key 迁移一次
        const oldRaw = localStorage.getItem('adoptedPersonas')
        if (oldRaw && !localStorage.getItem(`adoptedPersonas_${uid}`)) {
          localStorage.setItem(`adoptedPersonas_${uid}`, oldRaw)
          localStorage.removeItem('adoptedPersonas')
        }
        const raw = localStorage.getItem(`adoptedPersonas_${uid}`)
        if (raw) {
          const adopted: Array<{ id: string; name: string; emoji: string; desc: string }> = JSON.parse(raw)
          for (const p of adopted) {
            if (!personaOptions.value.some((opt) => opt.id === p.id)) {
              personaOptions.value.push(p)
            }
          }
        }
      }
    } catch { /* ignore */ }
  }
})

// ========== 词语设置 ==========
// 模式: 'ai' = AI自动生成, 'custom' = 自定义输入
const wordMode = ref<'ai' | 'custom'>('ai')
const difficulty = ref('适中')

// 自定义模式下的词语（仅在 wordMode='custom' 时使用）
const civilianWord = ref('苹果')
const undercoverWord = ref('梨子')
const customEqual = computed(() =>
  wordMode.value === 'custom' &&
  civilianWord.value.trim() && undercoverWord.value.trim() &&
  civilianWord.value.trim() === undercoverWord.value.trim()
)

// 播放开始→在 GameView.onMounted 时调 startGame，词语在服务端生成
// 这里不需预先调用 words/generate

// ========== 开始游戏 ==========
const starting = ref(false)
const errorMsg = ref('')

async function handleStart() {
  errorMsg.value = ''

  if (wordMode.value === 'custom') {
    if (!civilianWord.value.trim() || !undercoverWord.value.trim()) {
      errorMsg.value = '请输入平民词和卧底词'
      return
    }
    if (civilianWord.value.trim() === undercoverWord.value.trim()) {
      errorMsg.value = '两个词不能相同'
      return
    }
  }

  starting.value = true
  try {
    // 1. 创建游戏房间
    const players = slots.map((s) => ({
      slotIndex: s.slotIndex,
      type: s.type,
      persona: s.type === 'ai' ? s.persona : undefined,
      customName: s.customName,
    }))

    const createRes: any = await createGame({
      players,
      // AI 模式：不给词，start 时后端自动生成
      civilianWord: wordMode.value === 'custom' ? civilianWord.value : '',
      undercoverWord: wordMode.value === 'custom' ? undercoverWord.value : '',
    })
    if (createRes.code !== 0) throw new Error(createRes.message || '创建游戏失败')
    const gameId = createRes.data.gameId

    // 2. 记录人类玩家 slotIndex
    const humanSlot = slots.find((s) => s.type === 'human')?.slotIndex
    if (humanSlot !== undefined) {
      sessionStorage.setItem(`humanSlot_${gameId}`, String(humanSlot))
    }

    // 3. 跳转 → GameView.onMounted 调 startGame + 连接 WS
    const query = wordMode.value === 'ai' ? `?difficulty=${encodeURIComponent(difficulty.value)}` : ''
    router.push(`/game/${gameId}${query}`)
  } catch (e: any) {
    errorMsg.value = e.message || '启动游戏失败'
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div class="lobby-view">
    <!-- 标题 -->
    <div class="lobby-header">
      <h1 class="lobby-title">AI 谁是卧底大乱斗</h1>
      <p class="lobby-subtitle">配置你的 AI 对手，准备开始推理对决</p>
    </div>

    <!-- 角色配置区 -->
    <section class="section">
      <h2 class="section-title">角色配置</h2>
      <div class="slot-grid">
        <div
          v-for="(slot, i) in slots"
          :key="i"
          :class="['slot-card', { 'slot-human': slot.type === 'human' }]"
        >
          <!-- 标签 -->
          <span v-if="slot.type === 'human'" class="slot-tag">你</span>
          <span v-else class="slot-tag slot-tag-ai">AI</span>

          <!-- 头像 -->
          <div class="slot-avatar">
            {{ slot.type === 'human' ? '👤' : getPersonaInfo(slot.persona).emoji }}
          </div>

          <!-- 昵称 -->
          <div class="slot-name" @click="startEditName(i)">
            <template v-if="editingSlotIndex === i">
              <input
                v-model="slot.customName"
                class="slot-name-input"
                maxlength="10"
                @blur="finishEditName"
                @keyup.enter="finishEditName"
              />
            </template>
            <template v-else>
              <span class="slot-name-text">{{ slot.customName }}</span>
              <span class="slot-name-edit-icon">✎</span>
            </template>
          </div>

          <!-- AI 人设选择 -->
          <div v-if="slot.type === 'ai'" class="slot-persona">
            <select
              v-model="slot.persona"
              class="persona-select"
              @change="($event) => onPersonaChange(slot, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="p in personaOptions" :key="p.id" :value="p.id">
                {{ p.emoji }} {{ p.name }}
              </option>
            </select>
          </div>
          <div v-else class="slot-persona-placeholder">
            人类玩家
          </div>
        </div>
      </div>
    </section>

    <!-- 词语设置区 -->
    <section class="section">
      <h2 class="section-title">词语设置</h2>

      <!-- 模式切换 -->
      <div class="mode-tabs">
        <button
          :class="['mode-tab', { active: wordMode === 'ai' }]"
          @click="wordMode = 'ai'"
        >
          🤖 AI 自动生成
        </button>
        <button
          :class="['mode-tab', { active: wordMode === 'custom' }]"
          @click="wordMode = 'custom'"
        >
          ✏️ 自定义输入
        </button>
      </div>

      <!-- AI 模式：选难度 + 说明 -->
      <div v-if="wordMode === 'ai'" class="mode-ai-panel">
        <div class="difficulty-row">
          <label class="diff-label">词汇难度</label>
          <select v-model="difficulty" class="diff-select">
            <option value="入门"> 入门（日常物品）</option>
            <option value="简单">⭐ 简单（易区分）</option>
            <option value="适中">⭐⭐ 适中（需推理）</option>
            <option value="稍难">⭐⭐⭐ 稍难（较接近）</option>
            <option value="困难">⭐⭐⭐⭐ 困难（极易混淆）</option>
            <option value="超难">⭐⭐⭐⭐⭐ 超难（地狱难度）</option>
          </select>
        </div>
        <p class="ai-mode-hint">
          游戏开始时 AI 自动生成词语，所有人都不知道答案，保证公平对决
        </p>
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
            />
          </div>
        </div>
        <p v-if="customEqual" class="custom-error">⚠️ 两个词不能相同</p>
        <p v-else class="custom-hint">提示：两个词应相似但不同，例如"苹果/梨子"</p>
      </div>
    </section>

    <!-- 错误提示 -->
    <p v-if="errorMsg" class="lobby-error">{{ errorMsg }}</p>

    <!-- 开始按钮 -->
    <button class="btn-start" :disabled="starting" @click="handleStart">
      {{ starting ? '正在分配身份...' : '开始游戏' }}
    </button>
  </div>
</template>

<style scoped>
.lobby-view {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-md) var(--spacing-2xl);
}

/* 标题 */
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

/* 分区 */
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

/* ====== 角色槽位 ====== */
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
  border-color: var(--color-primary);
  background: rgba(79, 172, 254, 0.04);
}

.slot-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: var(--color-text-inverse);
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
}

.persona-select {
  width: 100%;
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

.slot-persona-placeholder {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  height: 32px;
  display: flex;
  align-items: center;
}

/* ====== 词语设置 ====== */
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

/* ====== 模式切换 tabs ====== */
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

.mode-tab.active {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: 600;
}

.mode-tab:first-child {
  border-right: 1px solid var(--color-bg-dark);
}

/* ====== AI 模式 ====== */
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

.ai-mode-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  text-align: center;
  padding: var(--spacing-xs) 0;
}

/* ====== 自定义模式 ====== */
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

/* ====== 错误 ====== */
.lobby-error {
  text-align: center;
  color: var(--color-danger);
  font-size: var(--font-size-base);
  margin-bottom: var(--spacing-md);
}

/* ====== 开始按钮 ====== */
.btn-start {
  display: block;
  width: 240px;
  height: 48px;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-text-inverse);
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

/* ====== 响应式 ====== */
@media (max-width: 600px) {
  .slot-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .word-row {
    flex-direction: column;
  }
}
</style>
