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
