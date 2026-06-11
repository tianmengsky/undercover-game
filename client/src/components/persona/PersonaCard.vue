<!--
  PersonaCard.vue - AI人设卡片组件
  功能：展示人设名称+描述+创建者+使用次数、点赞/选用按钮
-->
<template>
  <div class="pv-card" :class="{ 'is-liked': liked }">
    <div class="pv-card-top">
      <span class="pv-card-name">{{ name }}</span>
      <span class="pv-card-author">by {{ authorName }}</span>
    </div>
    <p class="pv-card-desc">{{ description }}</p>
    <p v-if="expanded" class="pv-card-prompt">{{ systemPrompt }}</p>
    <button class="btn-text-sm" @click="$emit('toggle-expand')">
      {{ expanded ? '收起预览' : '展开 System Prompt' }}
    </button>
    <div class="pv-card-footer">
      <span class="pv-card-stats">
        🔄 {{ usageCount }} · ❤ {{ likeCount }}
      </span>
      <div class="pv-card-actions">
        <button
          class="pv-action-btn"
          :class="{ active: liked }"
          @click="$emit('toggle-like')"
        >❤</button>
        <button
          class="pv-action-btn primary"
          :class="{ adopted }"
          @click="$emit('toggle-adopt')"
        >{{ adopted ? '取消选用' : '选用' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  authorName: string
  description: string
  systemPrompt?: string
  usageCount: number
  likeCount: number
  liked: boolean
  adopted: boolean
  expanded: boolean
}>()

defineEmits<{
  'toggle-like': []
  'toggle-adopt': []
  'toggle-expand': []
}>()
</script>

<style scoped>
.pv-card {
  padding: var(--spacing-md);
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: all var(--transition-fast);
}

.pv-card:hover {
  box-shadow: var(--shadow-sm);
  border-color: var(--color-primary);
}

.pv-card.is-liked {
  border-color: #f9a826;
}

.pv-card-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--spacing-sm);
}

.pv-card-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.pv-card-author {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.pv-card-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-xs);
  line-height: 1.4;
}

.pv-card-prompt {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-bg);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  line-height: 1.5;
  white-space: pre-wrap;
}

.btn-text-sm {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-decoration: underline;
  margin-bottom: var(--spacing-xs);
}

.pv-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-bg-dark);
}

.pv-card-stats {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.pv-card-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.pv-action-btn {
  padding: 4px 12px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-round);
  background: var(--color-surface);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-light);
}

.pv-action-btn:hover { border-color: var(--color-accent); }

.pv-action-btn.active {
  background: #fff3e0;
  color: #f9a826;
  border-color: #f9a826;
}

.pv-action-btn.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.pv-action-btn.primary:hover {
  background: var(--color-primary-dark);
}

.pv-action-btn.primary.adopted {
  background: var(--color-surface);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.pv-action-btn.primary.adopted:hover {
  background: #fce4ec;
}
</style>
