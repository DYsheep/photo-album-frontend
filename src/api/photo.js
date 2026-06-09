import request from './request'

// ========== 照片相关 API ==========

/** 获取照片列表（分页 + 筛选） */
export function getPhotoListApi(params) {
  return request.get('/photos', { params })
}

/** 获取单张照片详情 */
export function getPhotoDetailApi(id) {
  return request.get(`/photos/${id}`)
}

/** 上传照片（multipart/form-data） */
export function uploadPhotoApi(formData, onProgress) {
  return request.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percent)
      }
    }
  })
}

/** 点赞照片 */
export function likePhotoApi(id) {
  return request.post(`/photos/${id}/like`)
}

/** 更新照片信息 */
export function updatePhotoApi(id, data) {
  return request.put(`/photos/${id}`, data)
}

/** 删除照片 */
export function deletePhotoApi(id) {
  return request.delete(`/photos/${id}`)
}

/** 批量删除照片 */
export function batchDeletePhotosApi(ids) {
  return request.delete('/photos/batch', { data: { ids } })
}

/** 获取仪表盘统计数据 */
export function getDashboardStatsApi() {
  return request.get('/photos/stats')
}

/** 批量编辑照片 */
export function batchUpdatePhotosApi(data) {
  return request.put('/photos/batch', data)
}

/** 获取所有有 GPS 坐标的照片 */
export function getGpsPhotosApi() {
  return request.get('/photos/gps')
}

/** 获取相邻照片 ID（上一张/下一张） */
export function getAdjacentPhotosApi(id) {
  return request.get(`/photos/${id}/adjacent`)
}
