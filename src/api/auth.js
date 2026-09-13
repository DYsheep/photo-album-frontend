import request from './request'

// ========== 认证相关 API ==========

/** 管理员登录 */
export function loginApi(data) {
  return request.post('/auth/login', data)
}

/**
 * 退出登录：通知服务端吊销当前令牌（令牌版本自增，旧令牌立即失效）
 * @param {string} [token] 本地已清除时可显式传入令牌，确保请求能携带身份
 */
export function logoutApi(token) {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  return request.post('/auth/logout', {}, config)
}

/** 获取当前用户信息 */
export function getUserInfoApi() {
  return request.get('/auth/userinfo')
}
