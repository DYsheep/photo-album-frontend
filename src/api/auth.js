import request from './request'

// ========== 认证相关 API ==========

/** 管理员登录 */
export function loginApi(data) {
  return request.post('/auth/login', data)
}

/** 退出登录 */
export function logoutApi() {
  return request.post('/auth/logout')
}

/** 获取当前用户信息 */
export function getUserInfoApi() {
  return request.get('/auth/userinfo')
}
