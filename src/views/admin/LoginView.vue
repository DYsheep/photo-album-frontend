<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>摄影相册管理后台</h1>
        <p>Photo Album Admin Panel</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-item">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="请输入用户名"
            autocomplete="username"
            :disabled="loading"
          />
        </div>

        <div class="form-item">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            :disabled="loading"
            @keyup.enter="handleLogin"
          />
        </div>

        <div class="form-item" v-if="errorMsg">
          <span class="error-msg">{{ errorMsg }}</span>
        </div>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>

        <p class="login-hint">
          请使用管理员账号登录
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  username: '',
  password: ''
})
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!form.username || !form.password) {
    errorMsg.value = '请填写用户名和密码'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const res = await authStore.login(form)
    if (res.code === 200) {
      router.push('/admin/dashboard')
    } else {
      errorMsg.value = res.message || '登录失败'
    }
  } catch (err) {
    errorMsg.value = err.message || '网络异常，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.login-container {
  width: 400px;
  padding: 40px;
  background: var(--bg-card, rgba(255, 255, 255, 0.95));
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 24px;
  color: var(--text-primary, #1a1a2e);
  margin-bottom: 8px;
}

.login-header p {
  font-size: 13px;
  color: var(--text-muted, #888);
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-regular, #444);
  margin-bottom: 6px;
}

.form-item input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  outline: none;
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #333);
}

.form-item input:focus {
  border-color: var(--color-primary, #378ADD);
  box-shadow: 0 0 0 3px rgba(55, 138, 221, 0.1);
}

.form-item input:disabled {
  background: var(--bg-hover, #f5f5f5);
}

.error-msg {
  color: var(--color-danger, #E24B4A);
  font-size: 13px;
}

.login-btn {
  width: 100%;
  height: 44px;
  background: #378ADD;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:hover:not(:disabled) {
  background: #185FA5;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-placeholder, #aaa);
  margin-top: 18px;
}

.login-hint strong {
  color: var(--color-primary, #378ADD);
}
</style>
