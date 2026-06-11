<!-- DisconnectBadge.vue - 玩家连接状态标签 -->
<template>
  <span v-if="status === 'disconnected'" class="badge disconnect">
    ⚠️ 重连中
  </span>
  <span v-else-if="status === 'ai_takeover'" class="badge takeover">
    [AI托管]
  </span>
</template>

<script setup lang="ts">
defineProps<{
  status: 'normal' | 'disconnected' | 'ai_takeover'
}>()
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--radius-round);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.disconnect {
  background: var(--color-accent);
  color: #fff;
  animation: blink 1s ease-in-out infinite;
}

.takeover {
  background: var(--color-text-light);
  color: #fff;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
