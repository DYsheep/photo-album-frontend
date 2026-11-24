/**
 * 年度摄影小结海报（Canvas 2D 绘制）
 *
 * 不引入 html2canvas 之类的依赖：整张海报元素有限，直接用 Canvas 画
 * 更可控、无字体/跨域问题，导出即为 PNG。
 *
 * 版面（1080 × 1440）：
 *   PHOTOGRAPHY YEARBOOK
 *   2026 / 我的摄影小结
 *   ── 128 张照片 · 47 天有拍摄
 *   最早 05:12 ─────── 最晚 23:47
 *   月度分布微型柱状图
 *   最常用设备 / 最常用焦段 / 最常用 ISO
 *   www.dyframe.art
 */

import { paintBackdrop, POSTER_VARIANT } from './poster-backdrop'

export { POSTER_VARIANT }

export const POSTER_WIDTH = 1080
export const POSTER_HEIGHT = 1440

const FONT_STACK = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif'

const COLORS = {
  bgTop: '#0d1524',
  bgBottom: '#1a1a2e',
  glow: 'rgba(55, 138, 221, 0.28)',
  text: '#ffffff',
  muted: 'rgba(255, 255, 255, 0.58)',
  faint: 'rgba(255, 255, 255, 0.18)',
  line: 'rgba(255, 255, 255, 0.12)',
  accent: '#4A9BE8',
  accentSoft: 'rgba(74, 155, 232, 0.16)',
  card: 'rgba(255, 255, 255, 0.06)',
  cardBorder: 'rgba(255, 255, 255, 0.10)'
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** Canvas 的 letterSpacing 兼容性一般，这里手工逐字绘制 */
function drawSpacedText(ctx, text, x, y, spacing) {
  let cursor = x
  for (const ch of text) {
    ctx.fillText(ch, cursor, y)
    cursor += ctx.measureText(ch).width + spacing
  }
  return cursor - spacing
}

function spacedWidth(ctx, text, spacing) {
  let w = 0
  for (const ch of text) w += ctx.measureText(ch).width + spacing
  return w - spacing
}

/** 数值格式化：最多保留一位小数 */
function num(value) {
  if (value == null) return '0'
  const n = Number(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** 文本超宽时截断并加省略号 */
function fitText(ctx, text, maxWidth) {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = ''
  for (const ch of text) {
    if (ctx.measureText(out + ch + '…').width > maxWidth) break
    out += ch
  }
  return out + '…'
}

/**
 * 绘制海报
 * @param {HTMLCanvasElement} canvas 目标画布（函数内部会设置尺寸）
 * @param {object} data 后端 /photos/stats/yearly 返回的数据
 * @param {object} [options] 可选：{ backgroundImage, copy }
 *        backgroundImage：AI 生成的背景图（HTMLImageElement，已加载完成）
 *        copy：AI 一句话文案（纯文本，渲染绝对准确）
 */
export function drawYearPoster(canvas, data, options = {}) {
  const scale = 1
  canvas.width = POSTER_WIDTH * scale
  canvas.height = POSTER_HEIGHT * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.clearRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)

  const W = POSTER_WIDTH
  const PAD = 80

  // ---------- 背景（程序化绘制，三档风格） ----------
  paintBackdrop(ctx, W, POSTER_HEIGHT, {
    variant: options.variant || POSTER_VARIANT,
    seed: Number(data.year) || 2026
  })

  // 内描边
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 2
  roundRect(ctx, 28, 28, W - 56, POSTER_HEIGHT - 56, 28)
  ctx.stroke()

  // ---------- 头部 ----------
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COLORS.muted
  ctx.font = `600 22px ${FONT_STACK}`
  drawSpacedText(ctx, 'PHOTOGRAPHY YEARBOOK', PAD, 150, 7)

  ctx.fillStyle = COLORS.text
  ctx.font = `800 132px ${FONT_STACK}`
  const yearText = data.year ? String(data.year) : '—'
  ctx.fillText(yearText, PAD - 6, 290)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
  ctx.font = `500 34px ${FONT_STACK}`
  ctx.fillText('我的摄影小结', PAD, 344)



  // ---------- 主数字 ----------
  ctx.fillStyle = COLORS.text
  ctx.font = `800 156px ${FONT_STACK}`
  const countText = num(data.photoCount)
  ctx.fillText(countText, PAD - 8, 560)
  const countWidth = ctx.measureText(countText).width

  ctx.fillStyle = COLORS.muted
  ctx.font = `500 30px ${FONT_STACK}`
  ctx.fillText('张照片', PAD + countWidth + 18, 556)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
  ctx.font = `500 34px ${FONT_STACK}`
  const days = data.shootingDays || 0
  ctx.fillText(`${days} 天有拍摄`, PAD, 626)

  // 分隔线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, 690)
  ctx.lineTo(W - PAD, 690)
  ctx.stroke()

  // ---------- 最早 / 最晚 ----------
  const earliest = data.earliest
  const latest = data.latest
  const rowY = 780
  const colW = (W - PAD * 2) / 2

  ctx.fillStyle = COLORS.muted
  ctx.font = `500 26px ${FONT_STACK}`
  ctx.fillText('最早一次', PAD, rowY)
  ctx.fillText('最晚一次', PAD + colW, rowY)

  ctx.fillStyle = COLORS.text
  ctx.font = `700 76px ${FONT_STACK}`
  ctx.fillText(earliest && earliest.time ? earliest.time : '—', PAD, rowY + 76)
  ctx.fillText(latest && latest.time ? latest.time : '—', PAD + colW, rowY + 76)

  ctx.fillStyle = COLORS.muted
  ctx.font = `400 24px ${FONT_STACK}`
  const lineWidth = colW - 24
  const earliestLine = earliest && earliest.date
    ? `${earliest.date}${earliest.title ? ' · ' + earliest.title : ''}`
    : ''
  const latestLine = latest && latest.date
    ? `${latest.date}${latest.title ? ' · ' + latest.title : ''}`
    : ''
  if (earliestLine) ctx.fillText(fitText(ctx, earliestLine, lineWidth), PAD, rowY + 116)
  if (latestLine) ctx.fillText(fitText(ctx, latestLine, lineWidth), PAD + colW, rowY + 116)

  // ---------- 月度分布 ----------
  const months = Array.isArray(data.months) && data.months.length === 12 ? data.months : new Array(12).fill(0)
  const chartTop = 940
  const chartH = 130
  const barW = (W - PAD * 2 - 11 * 10) / 12
  const maxMonth = Math.max(1, ...months)

  months.forEach((value, i) => {
    const x = PAD + i * (barW + 10)
    const h = Math.max(6, (value / maxMonth) * chartH)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    roundRect(ctx, x, chartTop, barW, chartH, 6)
    ctx.fill()
    if (value > 0) {
      const grad = ctx.createLinearGradient(0, chartTop + chartH - h, 0, chartTop + chartH)
      grad.addColorStop(0, 'rgba(74, 155, 232, 0.95)')
      grad.addColorStop(1, 'rgba(74, 155, 232, 0.45)')
      ctx.fillStyle = grad
      roundRect(ctx, x, chartTop + chartH - h, barW, h, 6)
      ctx.fill()
    }
  })

  ctx.fillStyle = COLORS.faint
  ctx.font = `400 20px ${FONT_STACK}`
  ctx.fillText('1 月', PAD, chartTop + chartH + 34)
  const lastLabel = '12 月'
  ctx.fillText(lastLabel, W - PAD - ctx.measureText(lastLabel).width, chartTop + chartH + 34)

  // ---------- 三块统计卡片 ----------
  const cards = [
    { label: '最常用设备', value: data.topCamera ? data.topCamera.name : '—', sub: data.topCamera ? `${data.topCamera.count} 张` : '' },
    { label: '最常用焦段', value: data.topFocalLength ? data.topFocalLength.name : '—', sub: data.topFocalLength ? `${data.topFocalLength.count} 张` : '' },
    { label: '最常用 ISO', value: data.topIso ? data.topIso.name : '—', sub: data.topIso ? `${data.topIso.count} 张` : '' }
  ]
  const cardY = 1150
  const cardH = 150
  const cardGap = 18
  const cardW = (W - PAD * 2 - cardGap * 2) / 3

  cards.forEach((card, i) => {
    const x = PAD + i * (cardW + cardGap)
    ctx.fillStyle = COLORS.card
    roundRect(ctx, x, cardY, cardW, cardH, 18)
    ctx.fill()
    ctx.strokeStyle = COLORS.cardBorder
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = COLORS.muted
    ctx.font = `500 22px ${FONT_STACK}`
    ctx.fillText(card.label, x + 22, cardY + 46)

    ctx.fillStyle = COLORS.text
    // 长设备名自动缩字号
    let size = 34
    ctx.font = `700 ${size}px ${FONT_STACK}`
    while (ctx.measureText(card.value).width > cardW - 44 && size > 20) {
      size -= 2
      ctx.font = `700 ${size}px ${FONT_STACK}`
    }
    ctx.fillText(card.value, x + 22, cardY + 96)

    if (card.sub) {
      ctx.fillStyle = COLORS.accent
      ctx.font = `500 22px ${FONT_STACK}`
      ctx.fillText(card.sub, x + 22, cardY + 128)
    }
  })

  // ---------- 页脚 ----------
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)'
  ctx.font = `400 24px ${FONT_STACK}`
  ctx.fillText('www.dyframe.art', PAD, POSTER_HEIGHT - 62)

  const stamp = new Date().toLocaleDateString('zh-CN')
  ctx.textAlign = 'right'
  ctx.fillText(stamp, W - PAD, POSTER_HEIGHT - 62)
  ctx.textAlign = 'left'

  return canvas
}

/** 把画布导出为 PNG Blob */
export function posterToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
