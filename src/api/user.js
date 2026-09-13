import request from './request'

/** 用户列表 */
export function getUsersApi() {
  return request.get('/admin/users')
}

/** 创建用户 */
export function createUserApi(data) {
  return request.post('/admin/users', data)
}

/** 更新用户 */
export function updateUserApi(id, data) {
  return request.put(`/admin/users/${id}`, data)
}

/** 删除用户 */
export function deleteUserApi(id) {
  return request.delete(`/admin/users/${id}`)
}

/** 获取用户权限 */
export function getUserPermissionsApi(userId) {
  return request.get(`/admin/users/${userId}/permissions`)
}

/** 添加权限条目 */
export function addUserPermissionApi(userId, data) {
  return request.post(`/admin/users/${userId}/permissions`, data)
}

/** 删除权限条目 */
export function removeUserPermissionApi(userId, permId) {
  return request.delete(`/admin/users/${userId}/permissions/${permId}`)
}

/** 授权与账号操作审计日志（仅管理员） */
export function getAuditLogsApi(size = 50) {
  return request.get('/admin/audit-logs', { params: { size } })
}

/** 以该账号视角预览可见范围（仅管理员） */
export function getUserPreviewApi(userId) {
  return request.get(`/admin/users/${userId}/preview`)
}
