import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

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
    // 假设后端返回格式: { code: 200, data: ..., message: '...' }
    if (res.code && res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      // Token 过期或无效，跳转登录
      if (res.code === 401) {
        const authStore = useAuthStore()
        authStore.logout()
        window.location.href = '/admin/login'
      }
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          const authStore = useAuthStore()
          authStore.logout()
          window.location.href = '/admin/login'
          break
        case 403:
          ElMessage.error('拒绝访问')
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
      ElMessage.error('网络异常，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default request
