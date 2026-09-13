import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi as adminLogin, logoutApi } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref(localStorage.getItem('admin_token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('admin_user') || '{}'))
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')
  const canUpload = computed(() => isAdmin.value || userInfo.value?.canUpload === 1)
  const canManage = computed(() => isAdmin.value || userInfo.value?.canManage === 1)
  const canViewPrivate = computed(() => isAdmin.value || userInfo.value?.canViewPrivate === 1)
  /** 合集协作者：可进入合集管理页，但只能看到被指派负责的合集 */
  const isCollectionMember = computed(() => userInfo.value?.isCollectionMember === true)

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

  /**
   * 登出
   *
   * 先清理本地状态（界面即时反馈），再通知服务端吊销令牌：
   * 服务端会自增该账号的令牌版本，使这张令牌（以及其他设备上的会话）立即失效。
   */
  function logout() {
    const currentToken = token.value
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    if (currentToken) {
      // 失败不影响本地登出（例如离线或令牌已过期）
      logoutApi(currentToken).catch(() => {})
    }
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
    canUpload,
    canManage,
    canViewPrivate,
    isCollectionMember,
    login,
    logout,
    setUserInfo
  }
})
