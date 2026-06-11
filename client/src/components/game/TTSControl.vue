<!--
  TTSControl.vue - 语音朗读开关组件
-->
<template>
  <button
    class="tts-btn"
    :class="{ active: enabled, disabled: !voiceAvailable }"
    :title="tooltip"
    :disabled="!voiceAvailable"
    @click="toggle"
  >
    <span class="tts-icon">{{ enabled ? '🔊' : '🔇' }}</span>
    <span v-if="isSpeaking" class="tts-dot" />
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  enabled: boolean
  isSpeaking: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const voiceAvailable = ref(false)

const tooltip = computed(() => {
  if (!voiceAvailable.value) return '浏览器不支持语音朗读'
  return props.enabled ? '关闭语音朗读' : '开启语音朗读'
})

onMounted(() => {
  voiceAvailable.value = 'speechSynthesis' in window
})

function toggle() {
  emit('toggle')
}
</script>

<style scoped>
.tts-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  background: var(--card-bg, #fff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
}
.tts-btn:hover { background: var(--hover-bg, #f5f5f5); }
.tts-btn.active {
  border-color: var(--primary, #6366f1);
  background: var(--primary-soft, #eef2ff);
}
.tts-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.tts-icon { line-height: 1; }
.tts-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary, #6366f1);
  animation: tts-pulse 1s infinite;
}
@keyframes tts-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
