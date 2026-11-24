/**
 * 海报背景插画（纯 Canvas 绘制，无外部资源、无 AI 调用）
 *
 * 三种真正"有图"的构图，用年份做随机种子，所以每年略有变化但可复现：
 *   mountains 山峦：星空 + 月亮 + 多层山脊剪影 + 雾带（风景摄影气质）
 *   city      城市：夜空 + 天际线剪影 + 零星窗灯（城市摄影气质）
 *   bokeh     散景：大颗虚化光斑（镜头虚化质感，最抽象）
 *
 * 构图原则：插图占据"右上方空区"与"下方剪影区"，中部留给数据文字，
 * 并在插图之上压一层渐变，保证文字对比度。
 */

/** 当前默认风格：mountains | city | bokeh | film */
export const POSTER_VARIANT = 'city'

const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`

/** 可复现的伪随机（mulberry32） */
function rng(seed) {
  let a = (seed >>> 0) || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function softCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color.replace('ALPHA', alpha))
  g.addColorStop(0.45, color.replace('ALPHA', alpha * 0.42))
  g.addColorStop(1, color.replace('ALPHA', 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

let grainPattern = null
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
  const g = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.20, W * 0.5, H * 0.5, H * 0.82)
  g.addColorStop(0, 'rgba(0, 0, 0, 0)')
  g.addColorStop(0.62, 'rgba(0, 0, 0, 0.24)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0.62)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/* ============================================================
   共用：星空（只铺在上方天空区，避免影响数据文字）
   ============================================================ */
function paintStars(ctx, W, H, random, count, hue, topAreaH) {
  for (let i = 0; i < count; i += 1) {
    const x = random() * W
    const y = random() * topAreaH
    const r = random() * 1.5 + 0.5
    const a = 0.25 + random() * 0.6
    ctx.fillStyle = hsl(hue + random() * 24 - 12, 30, 96, a)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    // 少数亮星带一圈光
    if (r > 1.6 && random() < 0.35) {
      softCircle(ctx, x, y, r * 9, hsl(hue, 40, 92, 'ALPHA'), 0.10)
    }
  }
}

/** 月亮：右侧空白区，柔光 + 本体 + 一点点暗部 */
function paintMoon(ctx, W, H, hue) {
  const cx = W * 0.79
  const cy = H * 0.15
  const r = 62
  softCircle(ctx, cx, cy, r * 6.5, hsl(hue, 45, 92, 'ALPHA'), 0.16)
  softCircle(ctx, cx, cy, r * 2.2, hsl(hue, 40, 94, 'ALPHA'), 0.30)

  const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.2, cx, cy, r)
  body.addColorStop(0, 'rgba(255, 253, 244, 0.98)')
  body.addColorStop(0.75, 'rgba(246, 243, 232, 0.92)')
  body.addColorStop(1, 'rgba(226, 228, 226, 0.86)')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // 环形山（极淡）
  ctx.fillStyle = 'rgba(150, 155, 160, 0.18)'
  ;[[-18, -12, 13], [16, 8, 9], [-6, 22, 7], [24, -20, 5]].forEach(([dx, dy, rr]) => {
    ctx.beginPath()
    ctx.arc(cx + dx, cy + dy, rr, 0, Math.PI * 2)
    ctx.fill()
  })
}

/* ============================================================
   mountains：多层山脊 + 雾带
   ============================================================ */
function mountainRidge(ctx, W, H, baseY, amp, hue, alpha, random, dark) {
  const harmonics = [
    { f: 0.0022 + random() * 0.0012, p: random() * 6.28, a: 1 },
    { f: 0.0055 + random() * 0.002, p: random() * 6.28, a: 0.45 },
    { f: 0.011 + random() * 0.004, p: random() * 6.28, a: 0.22 }
  ]
  const points = []
  for (let x = -40; x <= W + 40; x += 6) {
    let y = 0
    for (const h of harmonics) y += h.a * Math.sin(x * h.f + h.p)
    y = baseY - amp * (0.55 + y / 1.67 * 0.45)
    points.push([x, y])
  }

  ctx.beginPath()
  ctx.moveTo(-40, H)
  points.forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.lineTo(W + 40, H)
  ctx.closePath()
  const grad = ctx.createLinearGradient(0, baseY - amp, 0, H)
  grad.addColorStop(0, hsl(hue, 34, dark ? 7 : 13, alpha))
  grad.addColorStop(1, hsl(hue, 30, dark ? 3 : 6, alpha))
  ctx.fillStyle = grad
  ctx.fill()

  // 山脊高光线
  ctx.beginPath()
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.strokeStyle = hsl(hue, 60, 78, alpha * 0.22)
  ctx.lineWidth = 1.2
  ctx.stroke()
}

function mountains(ctx, W, H, hue, seed) {
  const random = rng(seed * 977 + 13)
  const horizon = H * 0.60

  // 天空：地平线附近略亮（大气散射）
  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, hsl(hue, 42, 5, 1))
  sky.addColorStop(0.55, hsl(hue, 46, 11, 1))
  sky.addColorStop(1, hsl(hue + 8, 52, 20, 1))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, horizon + 10)

  paintStars(ctx, W, H, random, 120, hue, horizon * 0.95)
  paintMoon(ctx, W, H, hue)

  // 地平线泛光
  const glow = ctx.createLinearGradient(0, horizon - 150, 0, horizon + 40)
  glow.addColorStop(0, hsl(hue + 10, 70, 60, 0))
  glow.addColorStop(1, hsl(hue + 10, 70, 60, 0.16))
  ctx.fillStyle = glow
  ctx.fillRect(0, horizon - 150, W, 190)

  // 四层山脊：由远到近、由浅到深
  mountainRidge(ctx, W, H, horizon + 10, H * 0.10, hue, 0.85, random, false)
  mountainRidge(ctx, W, H, horizon + H * 0.05, H * 0.15, hue, 0.92, random, false)
  mountainRidge(ctx, W, H, horizon + H * 0.13, H * 0.19, hue, 0.96, random, true)
  mountainRidge(ctx, W, H, horizon + H * 0.23, H * 0.22, hue, 1, random, true)

  // 山谷雾带
  const mist = ctx.createLinearGradient(0, horizon + H * 0.02, 0, horizon + H * 0.16)
  mist.addColorStop(0, hsl(hue + 12, 40, 72, 0.14))
  mist.addColorStop(1, hsl(hue + 12, 40, 72, 0))
  ctx.fillStyle = mist
  ctx.fillRect(0, horizon, W, H * 0.2)
}

/* ============================================================
   city：天际线 + 窗灯
   ============================================================ */
function city(ctx, W, H, hue, seed) {
  const random = rng(seed * 1319 + 7)
  const horizon = H * 0.66

  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, hsl(hue + 20, 48, 4, 1))
  sky.addColorStop(0.6, hsl(hue + 16, 50, 10, 1))
  sky.addColorStop(1, hsl(hue + 6, 55, 18, 1))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, horizon + 10)

  paintStars(ctx, W, H, random, 80, hue, horizon * 0.8)
  paintMoon(ctx, W, H, hue)

  // 城市暖光（雾霾感）
  const glow = ctx.createLinearGradient(0, horizon - 220, 0, horizon + 60)
  glow.addColorStop(0, 'rgba(255, 176, 96, 0)')
  glow.addColorStop(1, 'rgba(255, 170, 96, 0.20)')
  ctx.fillStyle = glow
  ctx.fillRect(0, horizon - 220, W, 280)

  // 地面：必须先铺满，否则楼群以下的区域是透明的，导出会变成白/浅灰
  const ground = ctx.createLinearGradient(0, horizon, 0, H)
  ground.addColorStop(0, hsl(hue + 4, 30, 5, 1))
  ground.addColorStop(1, hsl(hue, 28, 2, 1))
  ctx.fillStyle = ground
  ctx.fillRect(0, horizon - 4, W, H - horizon + 4)

  // 两层楼群：后层更暗更高，前层更低更黑
  const layers = [
    { baseY: horizon + 6, minH: 120, maxH: 300, alpha: 0.75, windowAlpha: 0.10, hueShift: 6 },
    { baseY: horizon + 24, minH: 90, maxH: 240, alpha: 0.95, windowAlpha: 0.22, hueShift: 0 }
  ]

  layers.forEach((layer) => {
    let x = -30
    const buildings = []
    while (x < W + 30) {
      const w = 46 + random() * 96
      const h = layer.minH + random() * (layer.maxH - layer.minH)
      buildings.push({ x, w: w - 5, h })
      x += w
    }

    // 楼体
    ctx.fillStyle = hsl(hue + layer.hueShift, 32, 6, layer.alpha)
    buildings.forEach((b) => {
      ctx.fillRect(b.x, layer.baseY - b.h, b.w, b.h + 60)
    })

    // 窗灯：按楼体算网格，随机点亮
    ctx.fillStyle = `rgba(255, 206, 128, ${layer.windowAlpha})`
    buildings.forEach((b) => {
      const cols = Math.max(1, Math.floor(b.w / 16))
      const rows = Math.max(1, Math.floor(b.h / 20))
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if (random() > 0.18) continue
          ctx.fillRect(b.x + 6 + c * 16, layer.baseY - b.h + 10 + r * 20, 5, 7)
        }
      }
    })

    // 顶部轮廓微光
    ctx.strokeStyle = hsl(hue, 50, 70, layer.alpha * 0.18)
    ctx.lineWidth = 1
    buildings.forEach((b) => {
      ctx.beginPath()
      ctx.moveTo(b.x, layer.baseY - b.h)
      ctx.lineTo(b.x + b.w, layer.baseY - b.h)
      ctx.stroke()
    })
  })

  // 一个天线与闪烁灯
  const tallestX = W * 0.62
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(tallestX, horizon - 250)
  ctx.lineTo(tallestX, horizon - 330)
  ctx.stroke()
  softCircle(ctx, tallestX, horizon - 332, 26, 'rgba(255, 80, 80, ALPHA)', 0.55)
}

/* ============================================================
   bokeh：镜头虚化光斑
   ============================================================ */
function bokeh(ctx, W, H, hue, seed) {
  const random = rng(seed * 2654435761 + 3)

  // 底：深蓝到黑
  const base = ctx.createLinearGradient(0, 0, W * 0.6, H)
  base.addColorStop(0, hsl(hue, 48, 7, 1))
  base.addColorStop(0.6, hsl(hue + 8, 46, 9, 1))
  base.addColorStop(1, hsl(hue + 14, 40, 4, 1))
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  // 光斑：右侧与下方更密（中部留给文字）
  const palette = [hue + 6, hue + 34, hue - 26, hue + 58]
  for (let i = 0; i < 34; i += 1) {
    const inTextZone = i % 3 === 0
    const x = inTextZone ? W * (0.62 + random() * 0.4) : random() * W
    const y = inTextZone ? random() * H : random() < 0.5 ? random() * H * 0.42 : H * (0.55 + random() * 0.5)
    const r = 26 + random() * 150
    const color = palette[Math.floor(random() * palette.length)]
    const alpha = 0.05 + random() * 0.11

    // 外圈柔光 + 内芯，像虚化光斑
    softCircle(ctx, x, y, r * 1.5, hsl(color, 80, 68, 'ALPHA'), alpha * 0.7)
    softCircle(ctx, x, y, r * 0.72, hsl(color, 90, 76, 'ALPHA'), alpha)
    if (random() < 0.45) {
      ctx.strokeStyle = hsl(color, 90, 82, alpha * 0.55)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, r * 0.86, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/* ============================================================
   film：极简胶片（保留，作为"不要插图"的选项）
   ============================================================ */
function film(ctx, W, H, hue) {
  const base = ctx.createLinearGradient(0, 0, W * 0.35, H)
  base.addColorStop(0, '#070e1c')
  base.addColorStop(0.45, '#0b1526')
  base.addColorStop(1, '#04070d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

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

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.lineWidth = 2
  const m = 46
  const len = 34
  ;[[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(
    ([x, y, dx, dy]) => {
      ctx.beginPath()
      ctx.moveTo(x + dx * len, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + dy * len)
      ctx.stroke()
    }
  )
  ctx.restore()
}

/* ============================================================
   出口
   ============================================================ */
export function paintBackdrop(ctx, W, H, { variant = POSTER_VARIANT, seed = 2026 } = {}) {
  const hue = 208 + (((seed * 13) % 36) - 18)

  // 兜底底色：保证整张画布不透明（各风格只负责自己那部分，漏画会露白）
  const base = ctx.createLinearGradient(0, 0, W * 0.35, H)
  base.addColorStop(0, '#070e1c')
  base.addColorStop(0.45, '#0b1526')
  base.addColorStop(1, '#04070d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  if (variant === 'city') city(ctx, W, H, hue, seed)
  else if (variant === 'bokeh') bokeh(ctx, W, H, hue, seed)
  else if (variant === 'film') film(ctx, W, H, hue)
  else mountains(ctx, W, H, hue, seed)

  paintVignette(ctx, W, H)
  paintGrain(ctx, W, H, variant === 'film' ? 0.07 : 0.05)
}
