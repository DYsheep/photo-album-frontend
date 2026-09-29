import request from './request'

// ========== 照片相关 API ==========

/** 获取照片列表（分页 + 筛选） */
export function getPhotoListApi(params) {
  return request.get('/photos', { params })
}

/**
 * 分页拉取照片列表的全部页（返回照片数组）
 *
 * 背景：后端已启用真实分页，且单页条数会被服务端收敛到上限，
 * 因此"需要全量照片"的场景不能再靠一次大 pageSize 请求拿到全部数据。
 * 本方法以服务端返回的 total 为准逐页取，并设页数上限兜底，
 * 避免异常 total 造成无限循环。
 *
 * 适用场景：首页照片墙（按分类/标签在本地筛选，依赖全量）、
 * 后台的照片选择器（需在本地按 ID 查找目标照片）。
 * 追求单页展示的场景请直接使用 getPhotoListApi 与服务端分页。
 */
export async function getAllPhotoListApi(params = {}, { pageSize = 200, maxPages = 25 } = {}) {
  const all = []
  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const res = await getPhotoListApi({ ...params, pageNum, pageSize })
    if (res?.code !== 200) break
    const list = res.data?.list || []
    all.push(...list)
    // ① 返回条数多于单页请求 → 服务端未按页返回（分页未生效）已一次性给全，直接采用
    //    （兼容后端尚未发布分页修复的部署窗口，避免逐页重复累积）
    if (list.length > pageSize) break
    const total = Number(res.data?.total || 0)
    // ② 本页未满即已到末页；③ 取满 total 也停（防 total 与实际不一致时空转）
    if (list.length < pageSize || (total > 0 && all.length >= total)) break
  }
  return all
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
