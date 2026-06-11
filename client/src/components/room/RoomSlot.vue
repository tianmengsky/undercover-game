<!-- RoomSlot.vue - 房间槽位卡片（玩家 / AI / 空位） -->
<template>
  <div class="room-slot" :class="slotClass">
    <!-- 头像 -->
    <div class="slot-avatar">
      <span class="avatar-text">{{ avatarLetter }}</span>
    </div>

    <!-- 昵称 -->
    <div class="slot-name" v-if="!isEmpty">
      <span v-if="!editing" @click="canEdit && startEdit()" class="name-text">{{ displayName }}</span>
      <input
        v-else
        ref="nameInput"
        v-model="editName"
        class="name-input"
        maxlength="8"
        @blur="confirmEdit"
        @keyup.enter="confirmEdit"
      />
    </div>

    <!-- 标签行 -->
    <div class="slot-tags" v-if="!isEmpty">
      <span v-if="isMe" class="tag you">你</span>
      <span v-if="isHost" class="tag host">房主⭐</span>
      <span v-if="isOtherPlayer" class="tag joined">已加入</span>
      <DisconnectBadge v-if="isOtherPlayer && playerStatus && playerStatus !== 'normal'" :status="playerStatus" />
    </div>

    <!-- 人设选择器（AI 槽位） -->
    <div v-if="isAI" class="persona-select">
      <select v-model="selectedPersona" @change="onPersonaChange" :disabled="!canManage">
        <option v-for="p in personas" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
    </div>

    <!-- AI 移除按钮（房主可见） -->
    <button v-if="isAI && canManage" class="remove-ai-btn" @click="$emit('removeAI')" title="移除AI">×</button>

    <!-- 踢人按钮（房主可见，非自己） -->
    <button v-if="isOtherPlayer && canManage" class="kick-btn" @click="$emit('kick')" title="踢出玩家">×</button>

    <!-- 空位提示 -->
    <span v-if="isEmpty" class="empty-text">等待加入</span>
    <!-- 空位点击填充 AI -->
    <button v-if="isEmpty && canManage" class="fill-ai-btn" @click="$emit('fillAI')">+ AI</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import DisconnectBadge from '@/components/game/DisconnectBadge.vue'

const props = defineProps<{
  slotIndex: number
  type: 'human' | 'ai' | 'empty'
  nickname?: string
  persona?: string
  isMe: boolean
  isHost: boolean
  canManage: boolean  // 房主权限
  playerStatus?: 'normal' | 'disconnected' | 'ai_takeover'
}>()

const emit = defineEmits<{
  updateNickname: [name: string]
  setPersona: [persona: string]
  kick: []
  removeAI: []
  fillAI: []
}>()

const personas = [
  { value: 'default', label: '默认' },
  { value: 'humor', label: '幽默达人' },
  { value: 'logic', label: '逻辑大师' },
  { value: 'newbie', label: '萌新小白' },
  { value: 'literary', label: '文艺青年' },
  { value: 'grumpy', label: '暴躁老哥' },
]

const selectedPersona = ref(props.persona || 'default')
const editing = ref(false)
const editName = ref(props.nickname || '')
const nameInput = ref<HTMLInputElement>()

const isEmpty = computed(() => props.type === 'empty')
const isAI = computed(() => props.type === 'ai')
const isOtherPlayer = computed(() => props.type === 'human' && !props.isMe)
const canEdit = computed(() => props.isMe)
const displayName = computed(() => {
  if (props.type === 'empty') return ''
  if (props.type === 'ai') return props.nickname || `AI-${props.slotIndex + 1}`
  return props.nickname || `玩家${props.slotIndex + 1}`
})
const avatarLetter = computed(() => {
  if (props.type === 'ai') return '🤖'
  return (props.nickname || '?')[0]
})

const slotClass = computed(() => ({
  'is-human-me': props.isMe,
  'is-human-other': props.type === 'human' && !props.isMe,
  'is-ai': props.type === 'ai',
  'is-empty': props.type === 'empty',
  'is-disconnected': props.playerStatus === 'disconnected',
  'is-takeover': props.playerStatus === 'ai_takeover',
}))

function startEdit() {
  editName.value = props.nickname || ''
  editing.value = true
  nextTick(() => nameInput.value?.focus())
}

function confirmEdit() {
  editing.value = false
  if (editName.value && editName.value !== props.nickname) {
    emit('updateNickname', editName.value)
  }
}

function onPersonaChange() {
  emit('setPersona', selectedPersona.value)
}

watch(() => props.persona, (val) => {
  if (val) selectedPersona.value = val
})
</script>

<style scoped>
.room-slot {
  width: 110px;
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-bg-dark);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  background: var(--color-surface);
  transition: all var(--transition-fast);
  position: relative;
}

.room-slot.is-human-me { border-color: var(--color-primary); border-style: solid; }
.room-slot.is-human-other { border-color: var(--color-success); border-style: solid; }
.room-slot.is-ai { border-color: var(--color-bg-dark); border-style: solid; }
.room-slot.is-empty { border-style: dashed; border-color: var(--color-bg-dark); }
.room-slot.is-disconnected { border-color: var(--color-accent); animation: blink-border 1s infinite; }
.room-slot.is-takeover { border-color: var(--color-text-light); opacity: 0.7; }

@keyframes blink-border {
  0%, 100% { border-color: var(--color-accent); }
  50% { border-color: transparent; }
}

.slot-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-round);
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.slot-name {
  min-height: 20px;
}

.name-text {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}

.name-input {
  width: 80px;
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  outline: none;
}

.slot-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.tag {
  padding: 1px 6px;
  border-radius: var(--radius-round);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.tag.you { background: var(--color-primary); color: #fff; }
.tag.host { background: #ffe082; color: #e65100; }
.tag.joined { background: var(--color-success); color: #fff; }

.persona-select select {
  font-size: var(--font-size-xs);
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}

.persona-select select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-ai-btn,
.kick-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-round);
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

.empty-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.fill-ai-btn {
  font-size: var(--font-size-xs);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-round);
  padding: 1px 8px;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
}
</style>
