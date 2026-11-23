/**
 * 格式化日期字符串（支持 EXIF 格式 "2024:10:15 14:30:00"）
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const cleaned = dateStr.replace(/:/g, '-').replace(' ', 'T')
  try {
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    }
  } catch { /* ignore */ }
  if (dateStr.length >= 10) return dateStr.substring(0, 10)
  return dateStr
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (!bytes) return '未知'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * 格式化 ISO 日期（简短版，用于表格等）
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  if (dateStr.length >= 10) return dateStr.substring(0, 10)
  return dateStr
}

/**
 * 格式化光圈
 *
 * 后端 EXIF 解析后存的就是带前缀的 "f/2.8"，模板里再拼一次会显示成 "f/f/2.8"。
 * 这里兼容两种存储形态，统一输出一份带前缀的结果。
 */
export function formatAperture(value) {
  if (!value) return ''
  const text = String(value).trim()
  return /^f\/?/i.test(text) ? text.replace(/^f\/?/i, 'f/') : `f/${text}`
}

/**
 * 格式化焦距
 *
 * 同理，后端存的是 "50.0mm"，模板拼单位会变成 "50.0mmmm"。
 */
export function formatFocalLength(value) {
  if (!value) return ''
  return String(value).replace(/\s*mm$/i, '') + 'mm'
}
