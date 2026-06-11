<!--
  RegisterView.vue - 注册页
  路由：/register   权限：未登录
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const loading = ref(false)

// 实时校验
const usernameError = ref('')
const passwordError = ref('')
const confirmError = ref('')

function validateUsername() {
  if (!username.value) { usernameError.value = ''; return }
  if (username.value.length < 3 || username.value.length > 20) {
    usernameError.value = '用户名需要 3-20 个字符'
  } else if (!/^[a-zA-Z0-9_]+$/.test(username.value)) {
    usernameError.value = '只能使用字母、数字和下划线'
  } else {
    usernameError.value = ''
  }
}

function validatePassword() {
  if (!password.value) { passwordError.value = ''; return }
  if (password.value.length < 6 || password.value.length > 30) {
    passwordError.value = '密码需要 6-30 个字符'
  } else if (!/[a-zA-Z]/.test(password.value) || !/\d/.test(password.value)) {
    passwordError.value = '密码需要包含字母和数字'
  } else {
    passwordError.value = ''
  }
}

function validateConfirm() {
  if (!confirmPassword.value) { confirmError.value = ''; return }
  if (confirmPassword.value !== password.value) {
    confirmError.value = '两次输入的密码不一致'
  } else {
    confirmError.value = ''
  }
}

const canSubmit = computed(() => {
  return (
    username.value.length >= 3 &&
    password.value.length >= 6 &&
    /[a-zA-Z]/.test(password.value) &&
    /\d/.test(password.value) &&
    confirmPassword.value === password.value &&
    !loading.value
  )
})

async function handleRegister() {
  errorMsg.value = ''
  if (!username.value || !password.value || !confirmPassword.value) {
    errorMsg.value = '请填写必填项'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    const res: any = await authStore.register(username.value, password.value, nickname.value || undefined)
    if (res.code === 0) {
      router.push('/rooms')
    } else {
      errorMsg.value = res.message || '注册失败'
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-view">
    <div class="auth-card">
      <h1 class="auth-logo">AI卧底大乱斗</h1>

      <AppInput v-model="username" label="用户名" placeholder="3-20 个字符，字母数字下划线"
        :error="usernameError" required @blur="validateUsername" @enter="handleRegister" />

      <AppInput v-model="nickname" label="昵称（选填）" placeholder="给自己取个响亮的名字"
        @enter="handleRegister" />

      <AppInput v-model="password" label="密码" type="password" placeholder="6-30 个字符，至少含字母和数字"
        :error="passwordError" required @blur="validatePassword" @enter="handleRegister" />

      <AppInput v-model="confirmPassword" label="确认密码" type="password" placeholder="请再次输入密码"
        :error="confirmError" required @blur="validateConfirm" @enter="handleRegister" />

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <AppButton variant="primary" size="lg" class="auth-submit" :disabled="!canSubmit" :loading="loading" @click="handleRegister">
        注 册
      </AppButton>

      <p class="switch-link">
        已有账号？<router-link to="/login">登录</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 56px);
  background: var(--color-bg);
}

.auth-card {
  width: 380px;
  padding: var(--spacing-xl);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.auth-logo {
  text-align: center;
  font-size: 24px;
  color: var(--color-primary);
  margin-bottom: var(--spacing-xl);
}

.error-msg {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}

.auth-submit {
  width: 100%;
}

.switch-link {
  text-align: center;
  margin-top: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.switch-link a {
  color: var(--color-primary);
  font-weight: 500;
}
</style>
