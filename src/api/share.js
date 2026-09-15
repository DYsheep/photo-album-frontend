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

/** 根据分享码获取分享数据（公开访问，无需 token）；合集分享可带访问口令 */
export function getShareLinkApi(code, accessCode) {
  return request.get(`/share/${code}`, {
    params: accessCode ? { accessCode } : {}
  })
}

/**
 * 创建（或更新）合集分享链接
 * options 可选：{ expiresAt, includePrivate, accessCode }
 * 后端以查询参数接收，故这里用 params 而不是请求体。
 */
export function createCollectionShareApi(collectionId, options) {
  const { expiresAt, includePrivate, accessCode } = options || {}
  return request.post(`/admin/share/collection/${collectionId}`, null, {
    params: {
      ...(expiresAt ? { expiresAt } : {}),
      ...(includePrivate ? { includePrivate: true } : {}),
      ...(accessCode ? { accessCode } : {})
    }
  })
}

/** 管理员获取所有分享链接 */
export function getShareLinksApi() {
  return request.get('/admin/share')
}

/** 管理员删除分享链接 */
export function deleteShareLinkApi(id) {
  return request.delete(`/admin/share/${id}`)
}
