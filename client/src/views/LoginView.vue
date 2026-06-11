<!--
  LoginView.vue - 登录页
  路由：/login   权限：未登录
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleLogin() {
  errorMsg.value = ''
  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    const res: any = await authStore.login(username.value, password.value)
    if (res.code === 0) {
      router.push('/rooms')
    } else {
      errorMsg.value = res.message || '登录失败'
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

      <AppInput v-model="username" label="用户名" placeholder="请输入用户名" @enter="handleLogin" />

      <AppInput v-model="password" label="密码" type="password" placeholder="请输入密码" @enter="handleLogin" />

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <AppButton variant="primary" size="lg" class="auth-submit" :loading="loading" @click="handleLogin">
        登 录
      </AppButton>

      <p class="switch-link">
        还没有账号？<router-link to="/register">注册</router-link>
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
