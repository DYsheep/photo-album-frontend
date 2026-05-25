import request from './request'

// ========== 后台标签管理 API ==========

/** 获取所有标签及引用数 */
export function getAdminTagListApi() {
  return request.get('/admin/tags')
}

/** 重命名标签 */
export function renameTagApi(oldName, newName) {
  return request.put('/admin/tags/rename', { oldName, newName })
}

/** 删除标签 */
export function deleteTagApi(name) {
  return request.delete(`/admin/tags/${encodeURIComponent(name)}`)
}

/** 合并标签 */
export function mergeTagsApi(sourceNames, targetName) {
  return request.post('/admin/tags/merge', { sourceNames, targetName })
}
