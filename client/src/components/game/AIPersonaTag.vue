<!--
  AIPersonaTag.vue - AI人设标签组件
  功能：显示AI角色人设类型的彩色标签
-->
<template>
  <span class="ai-persona-tag" :class="`persona-${persona}`">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AIPersona } from '@/types/game'

const props = defineProps<{
  persona: AIPersona
}>()

const PERSONA_LABELS: Record<AIPersona, string> = {
  default: '默认',
  humor: '幽默达人',
  logic: '逻辑大师',
  newbie: '萌新小白',
  literary: '文艺青年',
  grumpy: '暴躁老哥',
}

const label = computed(() => PERSONA_LABELS[props.persona] || '默认')
</script>

<style scoped>
.ai-persona-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
}

.persona-default { background: #e8ecf1; color: #5a6a7a; }
.persona-humor { background: #fff3e0; color: #e67e22; }
.persona-logic { background: #e3f2fd; color: #1976d2; }
.persona-newbie { background: #e8f5e9; color: #388e3c; }
.persona-literary { background: #f3e5f5; color: #7b1fa2; }
.persona-grumpy { background: #fce4ec; color: #c62828; }
</style>
