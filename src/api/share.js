import request from './request'

// ========== 分享链接相关 API ==========

/** 为照片创建分享链接（公开，无需登录） */
export function createShareLinkApi(photoId) {
  return request.post(`/share/photo/${photoId}`)
}

/** 根据分享码获取分享数据（公开访问，无需 token） */
export function getShareLinkApi(code) {
  return request.get(`/share/${code}`)
}

/** 管理员获取所有分享链接 */
export function getShareLinksApi() {
  return request.get('/admin/share')
}

/** 管理员删除分享链接 */
export function deleteShareLinkApi(id) {
  return request.delete(`/admin/share/${id}`)
}
