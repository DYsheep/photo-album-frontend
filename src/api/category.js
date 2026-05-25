import request from './request'

// ========== 分类相关 API ==========

/** 获取所有分类 */
export function getCategoryListApi() {
  return request.get('/categories')
}

/** 创建分类 */
export function createCategoryApi(data) {
  return request.post('/categories', data)
}

/** 更新分类 */
export function updateCategoryApi(id, data) {
  return request.put(`/categories/${id}`, data)
}

/** 删除分类 */
export function deleteCategoryApi(id) {
  return request.delete(`/categories/${id}`)
}
