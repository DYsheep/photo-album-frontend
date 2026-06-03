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
      // 401 / 403 静默处理，由路由守卫负责跳转
      if (res.code === 401 || res.code === 403) {
        const authStore = useAuthStore()
        if (res.code === 401) {
          authStore.logout()
          ElMessage.warning('登录已过期，请重新登录')
          router.push({ name: 'home' })
        }
        return Promise.reject(new Error('AUTH'))
      }
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
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
