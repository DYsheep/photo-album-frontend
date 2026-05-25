import request from './request'

// ========== 前台标签 API ==========

/** 获取标签列表（含引用计数） */
export function getTagListApi() {
  return request.get('/photos/tags')
}
