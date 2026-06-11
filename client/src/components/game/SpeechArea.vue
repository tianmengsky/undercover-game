<!--
  SpeechArea.vue - 发言区域组件
  功能：可滚动发言气泡流、AI打字机动画、玩家发言输入框、发送按钮
-->
<template>
  <div class="speech-area">
    <!-- 发言气泡流 -->
    <div class="speech-stream" ref="streamRef">
      <div v-if="speeches.length === 0" class="speech-placeholder">
        {{ placeholderText }}
      </div>
      <div
        v-for="speech in displaySpeeches"
        :key="`${speech.slotIndex}-${speech.round}-${speech.timestamp}`"
        class="speech-bubble"
        :class="{
          'is-ai': speech.isAI,
          'is-me': !speech.isAI && speech.slotIndex === mySlotIndex,
          'is-other-human': !speech.isAI && speech.slotIndex !== mySlotIndex,
          'is-typing': isTyping && speech === currentTypingSpeech,
        }"
      >
        <div class="bubble-header">
          <span class="bubble-name">{{ getPlayerName(speech.slotIndex) }}</span>
          <span v-if="speech.persona" class="bubble-persona">
            <AIPersonaTag :persona="speech.persona" />
          </span>
        </div>
        <div class="bubble-content">
          <template v-if="isThinking(speech)">
            <span class="thinking-text">t</span><span class="thinking-text">h</span><span class="thinking-text">i</span><span class="thinking-text">n</span><span class="thinking-text">k</span><span class="thinking-text">i</span><span class="thinking-text">n</span><span class="thinking-text">g</span><span class="thinking-text">.</span><span class="thinking-text">.</span><span class="thinking-text">.</span>
          </template>
          <template v-else>{{ getDisplayContent(speech) }}</template>
        </div>
        <div v-if="isTyping && speech === currentTypingSpeech" class="typing-cursor">|</div>
      </div>
    </div>

    <!-- 发言输入框（仅在轮到人类玩家发言时显示） -->
    <div v-if="canSpeak" class="speech-input-area">
      <input
        ref="inputRef"
        v-model="inputText"
        class="speech-input"
        placeholder="输入你的描述（2-100字）..."
        maxlength="100"
        @keydown.enter.prevent="handleSend"
      />
      <button
        class="send-btn"
        :disabled="inputText.trim().length < 2"
        @click="handleSend"
      >
        发送
      </button>
    </div>

    <!-- 投票阶段提示 -->
    <div v-if="canVote" class="vote-hint">
      👆 点击左侧或右侧存活玩家头像进行投票
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Speech, AIPersona } from '@/types/game'
import AIPersonaTag from './AIPersonaTag.vue'

const props = defineProps<{
  speeches: Speech[]
  players: Array<{ slotIndex: number; customName: string }>
  gameStatus: string
  currentSpeakerIndex: number
  isSpeaking: boolean
  isVoting: boolean
  isTyping: boolean
  currentTypingSpeech: Speech | null
  canSpeak: boolean
  canVote: boolean
  mySlotIndex: number
}>()

const emit = defineEmits<{
  'send-speech': [content: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const streamRef = ref<HTMLDivElement | null>(null)
const inputText = ref('')

// 动态占位文字
const placeholderText = computed(() => {
  switch (props.gameStatus) {
    case 'speaking':
      return '发言阶段进行中，等待玩家发言...'
    case 'voting':
      return '投票阶段进行中...'
    case 'finished':
      return '游戏结束'
    case 'role_assign':
      return '身份分配中...'
    default:
      return '等待游戏开始...'
  }
})

// 显示发言内容：AI 打字中显示累积内容，完成显示完整内容
const displaySpeeches = computed(() => props.speeches)

function getPlayerName(slotIndex: number): string {
  return props.players.find(p => p.slotIndex === slotIndex)?.customName ?? `玩家${slotIndex + 1}`
}

function getDisplayContent(speech: Speech): string {
  if (speech === props.currentTypingSpeech && props.isTyping) {
    return speech._typingContent ?? speech.content
  }
  return speech.content
}

const isThinking = (speech: Speech) =>
  speech.isAI && !speech.content

function handleSend() {
  const text = inputText.value.trim()
  if (text.length < 2) return
  emit('send-speech', text)
  inputText.value = ''
}

// 自动滚动到底部
watch(
  () => [props.speeches.length, props.isTyping, props.currentTypingSpeech?.content],
  () => {
    nextTick(() => {
      if (streamRef.value) {
        streamRef.value.scrollTop = streamRef.value.scrollHeight
      }
    })
  },
  { deep: false },
)

// 自动聚焦输入框
watch(() => props.canSpeak, (val) => {
  if (val) {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style scoped>
.speech-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
}

.speech-stream {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.speech-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-light);
  font-size: var(--font-size-lg);
}

.speech-bubble {
  max-width: 80%;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  animation: bubble-in 0.3s ease;
}

.speech-bubble.is-ai {
  align-self: flex-start;
  background: var(--color-surface);
  border-bottom-left-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.speech-bubble.is-me {
  align-self: flex-end;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-bottom-right-radius: var(--radius-sm);
}

.speech-bubble.is-other-human {
  align-self: flex-start;
  background: var(--color-surface);
  border-bottom-left-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  border-left: 3px solid var(--color-success);
}

.speech-bubble.is-typing .bubble-content {
  display: inline;
}

.typing-cursor {
  display: inline-block;
  animation: blink 0.6s step-end infinite;
  color: inherit;
  opacity: 0.6;
}

/* thinking 呼吸灯 — 逐字闪烁 */
.thinking-text {
  display: inline;
  color: var(--color-text-light);
  font-style: italic;
  animation: breathe 1.4s ease-in-out infinite;
}

.thinking-text:nth-child(1)  { animation-delay: 0.00s; }
.thinking-text:nth-child(2)  { animation-delay: 0.10s; }
.thinking-text:nth-child(3)  { animation-delay: 0.20s; }
.thinking-text:nth-child(4)  { animation-delay: 0.30s; }
.thinking-text:nth-child(5)  { animation-delay: 0.40s; }
.thinking-text:nth-child(6)  { animation-delay: 0.50s; }
.thinking-text:nth-child(7)  { animation-delay: 0.60s; }
.thinking-text:nth-child(8)  { animation-delay: 0.70s; }
.thinking-text:nth-child(9)  { animation-delay: 0.80s; }
.thinking-text:nth-child(10) { animation-delay: 0.90s; }
.thinking-text:nth-child(11) { animation-delay: 1.00s; }

@keyframes breathe {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.8; }
}

@keyframes blink {
  50% { opacity: 0; }
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: 4px;
}

.bubble-name {
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.is-me .bubble-name {
  color: var(--color-text-inverse);
  opacity: 0.85;
}

.is-ai .bubble-name {
  color: var(--color-text);
}

.is-other-human .bubble-name {
  color: var(--color-text);
}

.bubble-content {
  font-size: var(--font-size-base);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 输入区域 */
.speech-input-area {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface);
  border-top: 1px solid var(--color-bg-dark);
  flex-shrink: 0;
}

.speech-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition-fast);
}

.speech-input:focus {
  border-color: var(--color-primary);
}

.send-btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.send-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 投票提示 */
.vote-hint {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  text-align: center;
  font-size: var(--font-size-base);
  font-weight: 600;
  flex-shrink: 0;
}
</style>
