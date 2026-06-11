<!--
  AppInput.vue - 通用输入框组件
  功能：label + input/textarea + error 提示
-->
<template>
  <div class="app-input-group">
    <label v-if="label" class="app-input-label">
      {{ label }}<span v-if="required" class="app-input-required">*</span>
    </label>
    <textarea
      v-if="textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      class="app-input-field app-input-textarea"
      :class="{ 'has-error': error }"
      :rows="rows"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="$emit('blur')"
    />
    <input
      v-else
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      class="app-input-field"
      :class="{ 'has-error': error }"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
      @keyup.enter="$emit('enter')"
    />
    <p v-if="error" class="app-input-error">{{ error }}</p>
    <p v-if="hint && !error" class="app-input-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  modelValue: string
  type?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  maxlength?: number
  textarea?: boolean
  rows?: number
}>()

defineEmits<{
  'update:modelValue': [value: string]
  blur: []
  enter: []
}>()
</script>

<style scoped>
.app-input-group {
  margin-bottom: var(--spacing-md);
}

.app-input-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.app-input-required {
  color: var(--color-danger);
  margin-left: 2px;
}

.app-input-field {
  width: 100%;
  height: 44px;
  padding: 0 var(--spacing-md);
  border: 1px solid #d0d7de;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-bg);
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.app-input-field:focus {
  outline: none;
  border-color: var(--color-primary);
}

.app-input-field.has-error {
  border-color: var(--color-danger);
}

.app-input-textarea {
  height: auto;
  padding: var(--spacing-sm);
  resize: vertical;
  min-height: 60px;
}

.app-input-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin-top: 4px;
}

.app-input-hint {
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  margin-top: 2px;
}
</style>
