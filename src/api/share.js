import request from './request'

// ========== 分享链接相关 API ==========

/**
 * 为照片创建分享链接（需登录且具备上传或管理权限，且对该照片可见）
 * options 可选：{ expiresAt: 'YYYY-MM-DD' | ISO 日期时间, expiresInDays: number }
 * 两者都不传 = 永久有效；同一张照片重复创建会按本次设置更新有效期。
 */
export function createShareLinkApi(photoId, options) {
  return request.post(`/share/photo/${photoId}`, options || {})
}

/**
 * 根据分享码获取分享数据（公开访问，无需 token）；合集分享可带访问口令
 *
 * 口令走请求头而不是查询参数：查询串会进访问日志、浏览器历史与中间代理，
 * 而口令是这类分享唯一的访问门槛。
 */
export function getShareLinkApi(code, accessCode) {
  return request.get(`/share/${code}`, {
    headers: accessCode ? { 'X-Share-Access-Code': accessCode } : {}
  })
}

/**
 * 创建（或更新）合集分享链接
 * options 可选：{ expiresAt, includePrivate, accessCode }
 * 口令与有效期走请求体，避免口令落进 URL 与访问日志。
 */
export function createCollectionShareApi(collectionId, options) {
  const { expiresAt, includePrivate, accessCode } = options || {}
  const body = {
    ...(expiresAt ? { expiresAt } : {}),
    ...(includePrivate ? { includePrivate: true } : {}),
    ...(accessCode ? { accessCode } : {})
  }
  return request.post(`/admin/share/collection/${collectionId}`, body)
}

/** 管理员获取所有分享链接 */
export function getShareLinksApi() {
  return request.get('/admin/share')
}

/** 管理员删除分享链接 */
export function deleteShareLinkApi(id) {
  return request.delete(`/admin/share/${id}`)
}
