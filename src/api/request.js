import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import router from '../router'

// 创建 Axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 自动附加 JWT Token
request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 统一错误处理
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code && res.code !== 200) {
      // 登录接口的 401 是"用户名或口令错误"，不是会话过期：
      // 此前统一按过期处理，会清掉会话、把用户弹出登录页并提示"登录已过期"，
      // 真正的失败原因（口令错误）永远显示不出来。
      const isLoginRequest = (response.config?.url || '').includes('/auth/login')

      if (res.code === 401 && !isLoginRequest) {
        const authStore = useAuthStore()
        authStore.logout()
        ElMessage.warning('登录已过期，请重新登录')
        router.push({ name: 'home' })
        const authError = new Error('AUTH')
        authError.bizCode = res.code
        return Promise.reject(authError)
      }
      if (res.code === 401) {
        const loginError = new Error(res.message || '用户名或密码错误')
        loginError.bizCode = res.code
        return Promise.reject(loginError)
      }
      if (res.code === 403) {
        // 403 此前完全静默：页面停在半截、表格为空，用户分不清"无权限"与"没数据"
        ElMessage.warning(res.message || '无权限执行该操作')
        const authError = new Error('AUTH')
        authError.bizCode = res.code
        return Promise.reject(authError)
      }
      ElMessage.error(res.message || '请求失败')
      const bizError = new Error(res.message || '请求失败')
      bizError.bizCode = res.code
      return Promise.reject(bizError)
    }
    return res
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      switch (status) {
        case 401:
          useAuthStore().logout()
          ElMessage.warning('登录已过期，请重新登录')
          router.push({ name: 'home' })
          break
        case 403:
          break
        case 500:
          ElMessage.error('服务器错误')
          break
        default:
          ElMessage.error(`请求失败 (${status})`)
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络')
    } else {
      // 静默处理 AUTH 类型错误和网络异常
      if (error.message !== 'AUTH') {
        ElMessage.error('网络异常，请稍后重试')
      }
    }
    return Promise.reject(error)
  }
)

export default request
