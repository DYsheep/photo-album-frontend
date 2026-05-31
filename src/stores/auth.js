import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi as adminLogin } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref(localStorage.getItem('admin_token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('admin_user') || '{}'))
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  /** 登录 */
  async function login(loginForm) {
    try {
      const res = await adminLogin({
        username: loginForm.username,
        password: loginForm.password
      })

      const { token: realToken, userInfo: realUser } = res.data
      token.value = realToken
      userInfo.value = realUser
      localStorage.setItem('admin_token', realToken)
      localStorage.setItem('admin_user', JSON.stringify(realUser))

      return { code: 200, message: '登录成功', data: realUser }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || '登录失败'
      return { code: 401, message: msg, data: null }
    }
  }

  /** 登出 */
  function logout() {
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  /** 更新用户信息 */
  function setUserInfo(info) {
    userInfo.value = info
    localStorage.setItem('admin_user', JSON.stringify(info))
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    setUserInfo
  }
})
