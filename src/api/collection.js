import request from './request'

// ========== 合集相关 API ==========

/** 获取已发布合集列表（前台） */
export function getCollectionsApi() {
  return request.get('/collections')
}

/** 获取合集详情（含照片列表） */
export function getCollectionDetailApi(id) {
  return request.get(`/collections/${id}`)
}

/** 创建合集（后台） */
export function createCollectionApi(data) {
  return request.post('/admin/collections', data)
}

/** 更新合集（后台） */
export function updateCollectionApi(id, data) {
  return request.put(`/admin/collections/${id}`, data)
}

/** 删除合集（后台） */
export function deleteCollectionApi(id) {
  return request.delete(`/admin/collections/${id}`)
}

/** 向合集添加照片（后台） */
export function addPhotoToCollectionApi(collectionId, photoId) {
  return request.post(`/admin/collections/${collectionId}/photos/${photoId}`)
}

/** 从合集移除照片（后台） */
export function removePhotoFromCollectionApi(collectionId, photoId) {
  return request.delete(`/admin/collections/${collectionId}/photos/${photoId}`)
}

/** 获取全部合集列表（后台） */
export function getAdminCollectionsApi() {
  return request.get('/admin/collections')
}

/** 批量更新合集排序（后台） */
export function reorderCollectionsApi(orderList) {
  return request.put('/admin/collections/reorder', orderList)
}

/** 合集内相邻照片 ID */
export function getCollectionAdjacentApi(collectionId, photoId) {
  return request.get(`/collections/${collectionId}/adjacent`, { params: { photoId } })
}
