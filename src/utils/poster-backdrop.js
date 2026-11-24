/**
 * 海报背景（纯程序化绘制，无外部依赖、无 AI 调用）
 *
 * 三档风格，用年份做种子，因此每年略有不同但稳定可复现：
 *   aurora    极光：大范围柔光 + 水平光带 + 斜向细光，最"高级冷调"
 *   film      胶片：斜向柔光 + 强颗粒 + 四角片框标记，最有"摄影感"
 *   geometric 几何：同心细弧 + 点阵 + 单一色晕，最克制现代
 *
 * 三者共用：基础渐变、暗角、颗粒，保证文字区域对比度足够。
 */

/** 当前默认风格（改这一个常量即可切换整站海报风格） */
export const POSTER_VARIANT = 'film'

const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`

/* ---------- 共用元件 ---------- */

function softCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color.replace('ALPHA', alpha))
  g.addColorStop(0.55, color.replace('ALPHA', alpha * 0.4))
  g.addColorStop(1, color.replace('ALPHA', 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

let grainPattern = null

/** 细颗粒：一张 160×160 的随机噪点，作为重复图案叠加 */
function getGrain(ctx) {
  if (grainPattern) return grainPattern
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  const g = canvas.getContext('2d')
  const data = g.createImageData(160, 160)
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.random() * 145
    data.data[i] = v
    data.data[i + 1] = v
    data.data[i + 2] = v
    data.data[i + 3] = 255
  }
  g.putImageData(data, 0, 0)
  grainPattern = ctx.createPattern(canvas, 'repeat')
  return grainPattern
}

function paintGrain(ctx, W, H, alpha) {
  const pattern = getGrain(ctx)
  if (!pattern) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
}

function paintVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.44, H * 0.22, W * 0.5, H * 0.5, H * 0.8)
  g.addColorStop(0, 'rgba(0, 0, 0, 0)')
  g.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0.58)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/* ---------- 三档风格 ---------- */

function aurora(ctx, W, H, hue) {
  // 两团柔光：右上冷青、左下靛蓝
  softCircle(ctx, W * 0.88, H * 0.08, 620, hsl(202 + hue, 82, 62, 'ALPHA'), 0.34)
  softCircle(ctx, W * 0.05, H * 0.74, 700, hsl(248 + hue, 72, 58, 'ALPHA'), 0.26)

  // 水平光带（略微倾斜，像极光横贯）
  ctx.save()
  ctx.translate(W * 0.5, H * 0.56)
  ctx.rotate(-0.07)
  const band = ctx.createLinearGradient(-W * 0.6, 0, W * 0.6, 0)
  band.addColorStop(0, hsl(205 + hue, 90, 70, 0))
  band.addColorStop(0.4, hsl(205 + hue, 90, 72, 0.06))
  band.addColorStop(0.62, hsl(190 + hue, 95, 80, 0.10))
  band.addColorStop(1, hsl(205 + hue, 90, 70, 0))
  ctx.fillStyle = band
  ctx.fillRect(-W * 0.7, -70, W * 1.4, 140)
  ctx.restore()

  // 三条斜向极光帘幕：用拉长的柔和光晕，避免矩形光带留下硬边
  for (let i = 0; i < 3; i += 1) {
    ctx.save()
    ctx.translate(W * (0.42 + i * 0.18), H * 0.46)
    ctx.rotate(0.3)
    ctx.scale(1, 4.6)
    softCircle(ctx, 0, 0, 150 + i * 40, hsl(198 + hue, 90, 76, 'ALPHA'), 0.11 - i * 0.025)
    ctx.restore()
  }
}

function film(ctx, W, H, hue) {
  // 左上斜向柔光（像镜头进光）
  ctx.save()
  ctx.translate(W * 0.5, H * 0.5)
  ctx.rotate(-0.62)
  const wash = ctx.createLinearGradient(-W, 0, W, 0)
  wash.addColorStop(0, hsl(206 + hue, 60, 62, 0))
  wash.addColorStop(0.42, hsl(206 + hue, 60, 62, 0.13))
  wash.addColorStop(0.62, hsl(200 + hue, 55, 76, 0.07))
  wash.addColorStop(1, hsl(206 + hue, 60, 62, 0))
  ctx.fillStyle = wash
  ctx.fillRect(-W, -H, W * 2, H * 2)
  ctx.restore()

  // 右下暖色余光，避免整体偏冷
  softCircle(ctx, W * 0.92, H * 0.9, 520, hsl(28 + hue, 55, 62, 'ALPHA'), 0.10)

  // 四角片框标记（像胶片齿孔定位）
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.lineWidth = 2
  const m = 46
  const len = 34
  const corners = [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1]
  ]
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath()
    ctx.moveTo(x + dx * len, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, y + dy * len)
    ctx.stroke()
  })
  ctx.restore()
}

function geometric(ctx, W, H, hue) {
  // 右下同心细弧
  ctx.save()
  ctx.strokeStyle = hsl(200 + hue, 70, 72, 0.065)
  ctx.lineWidth = 1.2
  const cx = W * 0.96
  const cy = H * 0.94
  for (let r = 520; r <= 1500; r += 140) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI * 0.98, Math.PI * 1.62)
    ctx.stroke()
  }
  ctx.restore()

  // 左上点阵
  ctx.save()
  ctx.fillStyle = hsl(200 + hue, 80, 80, 0.11)
  for (let x = 96; x < W * 0.52; x += 42) {
    for (let y = 96; y < H * 0.4; y += 42) {
      ctx.beginPath()
      ctx.arc(x, y, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // 右上单一色晕
  softCircle(ctx, W * 0.84, H * 0.16, 560, hsl(206 + hue, 85, 64, 'ALPHA'), 0.28)

  // 地平线细光
  const line = ctx.createLinearGradient(0, H * 0.68, W, H * 0.68)
  line.addColorStop(0, hsl(200 + hue, 80, 80, 0))
  line.addColorStop(0.5, hsl(200 + hue, 80, 80, 0.16))
  line.addColorStop(1, hsl(200 + hue, 80, 80, 0))
  ctx.fillStyle = line
  ctx.fillRect(0, H * 0.68, W, 1.5)
}

/* ---------- 出口 ---------- */

export function paintBackdrop(ctx, W, H, { variant = POSTER_VARIANT, seed = 2026 } = {}) {
  // 基础渐变：深海军蓝 → 近黑
  const base = ctx.createLinearGradient(0, 0, W * 0.35, H)
  base.addColorStop(0, '#070e1c')
  base.addColorStop(0.45, '#0b1526')
  base.addColorStop(1, '#04070d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  // 年份决定轻微色相偏移（±18°），每年略有差异
  const hue = ((seed * 13) % 36) - 18

  if (variant === 'film') film(ctx, W, H, hue)
  else if (variant === 'geometric') geometric(ctx, W, H, hue)
  else aurora(ctx, W, H, hue)

  paintVignette(ctx, W, H)
  paintGrain(ctx, W, H, variant === 'film' ? 0.07 : 0.045)
}
