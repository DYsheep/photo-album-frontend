/**
 * 海报背景插画：四季 × 三时段（纯 Canvas 绘制，无外部资源、无 AI）
 *
 * 设计思路：海报气质由**统计数据**决定，而不是固定一套
 *   · 季节：按月度分布汇总到四季，取照片最多的季节
 *   · 时段：按拍摄时刻（24 小时）分布的峰值判断凌晨 / 白天 / 夜晚
 * 于是「春天拍得多 + 清晨拍得多」的人，会得到一张春天黎明的海报。
 *
 * 每个组合都包含：天空渐变、光源（日月）、地形剪影、季节道具（花瓣/落叶/雪/萤火）、
 * 暗角与颗粒。任何组合下都保证画布不透明、文字区对比度足够。
 */

/** 预览用：强制指定季节/时段（null = 按数据自动判断）。调样式时改这里即可。 */
export const POSTER_THEME_OVERRIDE = null

const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`

function rng(seed) {
  let a = (seed >>> 0) || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function softCircle(ctx, x, y, r, colorWithAlphaPlaceholder, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, colorWithAlphaPlaceholder.replace('ALPHA', alpha))
  g.addColorStop(0.45, colorWithAlphaPlaceholder.replace('ALPHA', alpha * 0.4))
  g.addColorStop(1, colorWithAlphaPlaceholder.replace('ALPHA', 0))
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
  const g = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.2, W * 0.5, H * 0.5, H * 0.82)
  g.addColorStop(0, 'rgba(0, 0, 0, 0)')
  g.addColorStop(0.62, 'rgba(0, 0, 0, 0.24)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0.62)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/* ============================================================
   主题推导
   ============================================================ */

const SEASON_LABEL = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
const DAYPART_LABEL = { dawn: '凌晨', day: '白天', night: '夜晚' }

/** 月份（1-12）→ 季节 */
function seasonOfMonth(month) {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/** 小时 → 时段 */
function daypartOfHour(hour) {
  if (hour <= 5) return 'dawn'
  if (hour <= 17) return 'day'
  return 'night'
}

/**
 * 从年度统计推导海报主题
 * @returns {{season:string, daypart:string, label:string}}
 */
export function deriveTheme(data = {}) {
  const months = Array.isArray(data.months) && data.months.length === 12 ? data.months : null
  const hours = Array.isArray(data.hours) && data.hours.length === 24 ? data.hours : null

  // ---- 季节：按季度汇总，取最多的 ----
  let season = 'autumn'
  if (months) {
    const sums = { spring: 0, summer: 0, autumn: 0, winter: 0 }
    months.forEach((count, i) => {
      if (count > 0) sums[seasonOfMonth(i + 1)] += count
    })
    const order = ['spring', 'summer', 'autumn', 'winter']
    let best = order[0]
    order.forEach((key) => {
      if (sums[key] > sums[best]) best = key
    })
    season = best
  }

  // ---- 时段：拍摄时刻分布的峰值 ----
  let daypart = 'day'
  if (hours) {
    let peakHour = -1
    let peakCount = 0
    hours.forEach((count, hour) => {
      if (count > peakCount) {
        peakCount = count
        peakHour = hour
      }
    })
    if (peakHour >= 0) {
      daypart = daypartOfHour(peakHour)
    }
  }

  // 没有时刻分布时，用最早/最晚时刻兜底
  if (!hours || hours.every((c) => c === 0)) {
    const earliest = data.earliest && data.earliest.time ? data.earliest.time : ''
    const latest = data.latest && data.latest.time ? data.latest.time : ''
    if (earliest && Number(earliest.slice(0, 2)) <= 5) daypart = 'dawn'
    else if (latest && Number(latest.slice(0, 2)) >= 21) daypart = 'night'
    else daypart = 'day'
  }

  if (POSTER_THEME_OVERRIDE) {
    season = POSTER_THEME_OVERRIDE.season || season
    daypart = POSTER_THEME_OVERRIDE.daypart || daypart
  }

  return {
    season,
    daypart,
    label: `${SEASON_LABEL[season]} · ${DAYPART_LABEL[daypart]}`
  }
}

/* ============================================================
   调色板：季节 × 时段
   ============================================================ */

const PALETTES = {
  spring: {
    sky: {
      dawn: ['#0a1030', '#2b2b58', '#6e5a7a', '#c98a63'],
      day: ['#3f6ea6', '#7ea6c8', '#c3d4de', '#e8ddc4'],
      night: ['#04060f', '#0a1226', '#121a33', '#1b2540']
    },
    ridge: [
      { top: hsl(150, 26, 12, 1), bottom: hsl(158, 30, 5, 1) },
      { top: hsl(148, 24, 9, 1), bottom: hsl(155, 28, 4, 1) },
      { top: hsl(146, 22, 6, 1), bottom: hsl(150, 26, 3, 1) }
    ],
    accent: hsl(336, 72, 82, 1),
    prop: 'petal'
  },
  summer: {
    sky: {
      dawn: ['#0b1226', '#2f3350', '#7a5a5e', '#e0a06a'],
      day: ['#2f6693', '#6fa3c4', '#b9d4dd', '#f2e4c2'],
      night: ['#03060e', '#081226', '#0f1c33', '#152a44']
    },
    ridge: [
      { top: hsl(160, 30, 13, 1), bottom: hsl(165, 34, 6, 1) },
      { top: hsl(158, 28, 10, 1), bottom: hsl(164, 32, 4, 1) },
      { top: hsl(156, 26, 7, 1), bottom: hsl(160, 30, 3, 1) }
    ],
    accent: hsl(46, 92, 76, 1),
    prop: 'firefly'
  },
  autumn: {
    sky: {
      dawn: ['#100a18', '#3a2338', '#8a4f42', '#e09a5f'],
      day: ['#4a5f86', '#8d94a8', '#d3c3ac', '#f0d9b0'],
      night: ['#07060d', '#12101f', '#1d1830', '#2a1f38']
    },
    ridge: [
      { top: hsl(28, 34, 13, 1), bottom: hsl(20, 32, 5, 1) },
      { top: hsl(26, 32, 10, 1), bottom: hsl(18, 30, 4, 1) },
      { top: hsl(22, 30, 7, 1), bottom: hsl(16, 28, 3, 1) }
    ],
    accent: hsl(28, 90, 66, 1),
    prop: 'leaf'
  },
  winter: {
    sky: {
      dawn: ['#070d1c', '#1d2b4a', '#4a6285', '#a9bdd4'],
      day: ['#4a6f96', '#8aa9c2', '#c9dbe8', '#eef4f8'],
      night: ['#03060d', '#08101f', '#0e1a2e', '#16253c']
    },
    ridge: [
      { top: hsl(210, 22, 16, 1), bottom: hsl(214, 26, 7, 1) },
      { top: hsl(208, 20, 12, 1), bottom: hsl(212, 24, 5, 1) },
      { top: hsl(206, 18, 9, 1), bottom: hsl(210, 22, 4, 1) }
    ],
    accent: hsl(200, 80, 88, 1),
    prop: 'snow'
  }
}

/* ============================================================
   绘制元件
   ============================================================ */

function paintSky(ctx, W, H, stops, horizon) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon + 20)
  g.addColorStop(0, stops[0])
  g.addColorStop(0.5, stops[1])
  g.addColorStop(0.82, stops[2])
  g.addColorStop(1, stops[3])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, horizon + 20)
}

function paintStars(ctx, W, H, random, count, areaH, alphaScale = 1) {
  for (let i = 0; i < count; i += 1) {
    const x = random() * W
    const y = random() * areaH
    const r = random() * 1.5 + 0.5
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.22 + random() * 0.6) * alphaScale})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (r > 1.6 && random() < 0.35) {
      softCircle(ctx, x, y, r * 9, 'rgba(226, 236, 255, ALPHA)', 0.1 * alphaScale)
    }
  }
}

function paintMoon(ctx, W, H) {
  const cx = W * 0.79
  const cy = H * 0.14
  const r = 58
  softCircle(ctx, cx, cy, r * 6, 'rgba(210, 226, 255, ALPHA)', 0.14)
  softCircle(ctx, cx, cy, r * 2, 'rgba(230, 240, 255, ALPHA)', 0.28)
  const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.2, cx, cy, r)
  body.addColorStop(0, 'rgba(255, 253, 245, 0.98)')
  body.addColorStop(0.75, 'rgba(244, 242, 233, 0.92)')
  body.addColorStop(1, 'rgba(222, 224, 224, 0.86)')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(150, 155, 160, 0.16)'
  ;[[-16, -10, 12], [14, 8, 8], [-5, 20, 6]].forEach(([dx, dy, rr]) => {
    ctx.beginPath()
    ctx.arc(cx + dx, cy + dy, rr, 0, Math.PI * 2)
    ctx.fill()
  })
}

function paintSun(ctx, W, H, stops) {
  const cx = W * 0.8
  const cy = H * 0.16
  const r = 58
  softCircle(ctx, cx, cy, r * 9, 'rgba(255, 246, 214, ALPHA)', 0.42)
  softCircle(ctx, cx, cy, r * 2.8, 'rgba(255, 250, 232, ALPHA)', 0.58)
  const body = ctx.createRadialGradient(cx - 12, cy - 12, 6, cx, cy, r)
  body.addColorStop(0, 'rgba(255, 255, 250, 1)')
  body.addColorStop(1, 'rgba(255, 238, 196, 1)')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  // 薄云：几片横向柔光
  for (let i = 0; i < 4; i += 1) {
    const y = H * (0.16 + i * 0.05)
    const x = W * (0.2 + (i % 2) * 0.34)
    softCircle(ctx, x, y, W * 0.24, 'rgba(255, 255, 255, ALPHA)', 0.07)
  }
}

function paintHorizonGlow(ctx, W, horizon, color, strength) {
  const g = ctx.createLinearGradient(0, horizon - 260, 0, horizon + 30)
  g.addColorStop(0, color.replace('ALPHA', 0))
  g.addColorStop(1, color.replace('ALPHA', strength))
  ctx.fillStyle = g
  ctx.fillRect(0, horizon - 260, W, 290)
}

/** 地形剪影：返回山脊顶点，供放置道具 */
function ridgeLayer(ctx, W, H, baseY, amp, colors, random, snow) {
  const h1 = { f: 0.0018 + random() * 0.001, p: random() * 6.28 }
  const h2 = { f: 0.0046 + random() * 0.002, p: random() * 6.28 }
  const h3 = { f: 0.0095 + random() * 0.004, p: random() * 6.28 }
  const points = []
  for (let x = -40; x <= W + 40; x += 6) {
    const y = baseY - amp * (0.5 + 0.3 * Math.sin(x * h1.f + h1.p) + 0.15 * Math.sin(x * h2.f + h2.p) + 0.08 * Math.sin(x * h3.f + h3.p))
    points.push([x, y])
  }

  ctx.beginPath()
  ctx.moveTo(-40, H)
  points.forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.lineTo(W + 40, H)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, baseY - amp, 0, H)
  g.addColorStop(0, colors.top)
  g.addColorStop(1, colors.bottom)
  ctx.fillStyle = g
  ctx.fill()

  // 冬季雪线：沿山脊描一条淡白边
  if (snow) {
    ctx.beginPath()
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.strokeStyle = 'rgba(232, 243, 255, 0.30)'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)'
    ctx.lineWidth = 1.6
    ctx.stroke()
  } else {
    ctx.beginPath()
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  return points
}

/** 山脊上的树木点缀（春樱 / 冬松） */
function paintTrees(ctx, W, H, ridgePoints, random, kind, accent) {
  const count = 9
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(random() * ridgePoints.length)
    const [x, y] = ridgePoints[idx]
    if (x < 0 || x > W) continue
    if (kind === 'pine') {
      const h = 46 + random() * 46
      ctx.fillStyle = 'rgba(8, 16, 24, 0.92)'
      for (let t = 0; t < 3; t += 1) {
        const w = (1 - t * 0.26) * 26
        const ty = y - t * h * 0.28
        ctx.beginPath()
        ctx.moveTo(x, ty - h * 0.5)
        ctx.lineTo(x - w, ty)
        ctx.lineTo(x + w, ty)
        ctx.closePath()
        ctx.fill()
      }
      // 积雪
      ctx.fillStyle = 'rgba(226, 240, 255, 0.5)'
      ctx.beginPath()
      ctx.moveTo(x, y - h * 0.5)
      ctx.lineTo(x - 12, y - h * 0.22)
      ctx.lineTo(x + 12, y - h * 0.22)
      ctx.closePath()
      ctx.fill()
    } else {
      // 樱花树：枝干 + 花簇
      const h = 40 + random() * 34
      ctx.strokeStyle = 'rgba(30, 20, 26, 0.9)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y - h)
      ctx.stroke()
      for (let c = 0; c < 7; c += 1) {
        const cx = x + (random() - 0.5) * 46
        const cy = y - h + (random() - 0.5) * 34
        ctx.fillStyle = accent.replace('hsl', 'hsla').replace(')', `, ${0.35 + random() * 0.45})`)
        ctx.beginPath()
        ctx.arc(cx, cy, 5 + random() * 7, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

/** 飘落物：花瓣 / 落叶 / 雪 */
function paintParticles(ctx, W, H, random, kind, accent) {
  if (kind === 'petal') {
    for (let i = 0; i < 26; i += 1) {
      const x = random() * W
      const y = random() * H * 0.9
      const r = 3 + random() * 4
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(random() * Math.PI)
      ctx.fillStyle = `rgba(246, 178, 200, ${0.25 + random() * 0.4})`
      ctx.beginPath()
      ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else if (kind === 'leaf') {
    for (let i = 0; i < 24; i += 1) {
      const x = random() * W
      const y = random() * H * 0.92
      const r = 5 + random() * 6
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(random() * Math.PI * 2)
      const colors = ['rgba(226, 138, 60, ', 'rgba(198, 96, 40, ', 'rgba(232, 176, 88, ']
      ctx.fillStyle = colors[Math.floor(random() * colors.length)] + `${0.3 + random() * 0.4})`
      ctx.beginPath()
      ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else if (kind === 'snow') {
    for (let i = 0; i < 90; i += 1) {
      const x = random() * W
      const y = random() * H
      const r = 1 + random() * 2.6
      ctx.fillStyle = `rgba(240, 248, 255, ${0.3 + random() * 0.55})`
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (kind === 'bird') {
    // 白天：几只远处的飞鸟（V 形），比萤火虫更符合日间观感
    for (let i = 0; i < 4; i += 1) {
      const x = W * (0.35 + random() * 0.55)
      const y = H * (0.16 + random() * 0.22)
      const s = 6 + random() * 5
      ctx.strokeStyle = `rgba(30, 34, 44, ${0.35 + random() * 0.25})`
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(x - s, y)
      ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.55, x, y)
      ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.55, x + s, y)
      ctx.stroke()
    }
  } else if (kind === 'firefly') {
    for (let i = 0; i < 22; i += 1) {
      const x = random() * W
      const y = H * (0.45 + random() * 0.5)
      softCircle(ctx, x, y, 14 + random() * 12, 'rgba(255, 236, 158, ALPHA)', 0.35 + random() * 0.35)
      ctx.fillStyle = 'rgba(255, 244, 190, 0.9)'
      ctx.beginPath()
      ctx.arc(x, y, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** 白天用的压暗层：白天天空明亮，必须压一层才能保证白色文字可读 */
function paintDayScrim(ctx, W, H, strength) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, `rgba(4, 8, 16, ${strength})`)
  g.addColorStop(0.45, `rgba(4, 8, 16, ${strength * 0.72})`)
  g.addColorStop(1, `rgba(4, 8, 16, ${strength * 1.18})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/* ============================================================
   出口
   ============================================================ */

/**
 * 绘制背景
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W 宽
 * @param {number} H 高
 * @param {{theme:{season:string,daypart:string}, seed:number}} options
 */
export function paintBackdrop(ctx, W, H, { theme, seed = 2026 } = {}) {
  const { season, daypart } = theme || deriveTheme({})
  const palette = PALETTES[season] || PALETTES.autumn
  const random = rng(seed * 7919 + season.length * 31 + daypart.length)

  // 不透明兜底，避免任何漏画导致透明区域导出后发白
  ctx.fillStyle = '#04070d'
  ctx.fillRect(0, 0, W, H)

  const horizon = H * 0.62
  paintSky(ctx, W, H, palette.sky[daypart], horizon)

  // 光源与天空氛围
  if (daypart === 'night') {
    paintStars(ctx, W, H, random, 150, horizon * 0.95)
    paintMoon(ctx, W, H)
  } else if (daypart === 'dawn') {
    paintStars(ctx, W, H, random, 55, horizon * 0.8, 0.6)
    // 黎明：地平线暖光 + 未升起的太阳
    paintHorizonGlow(ctx, W, horizon, 'rgba(255, 170, 110, ALPHA)', 0.28)
    softCircle(ctx, W * 0.72, horizon - 40, 320, 'rgba(255, 196, 140, ALPHA)', 0.30)
    paintMoon(ctx, W, H)
  } else {
    paintSun(ctx, W, H, palette.sky.day)
    paintHorizonGlow(ctx, W, horizon, 'rgba(255, 236, 200, ALPHA)', 0.18)
  }

  // 地面（先铺满，楼群/山脊之下的区域必须有颜色）
  const ground = ctx.createLinearGradient(0, horizon - 10, 0, H)
  ground.addColorStop(0, palette.ridge[2].top)
  ground.addColorStop(1, palette.ridge[2].bottom)
  ctx.fillStyle = ground
  ctx.fillRect(0, horizon - 6, W, H - horizon + 6)

  // 三层山脊：由远到近
  const far = ridgeLayer(ctx, W, H, horizon + 8, H * 0.10, palette.ridge[0], random, season === 'winter')
  const mid = ridgeLayer(ctx, W, H, horizon + H * 0.07, H * 0.15, palette.ridge[1], random, season === 'winter')
  const near = ridgeLayer(ctx, W, H, horizon + H * 0.17, H * 0.19, palette.ridge[2], random, false)

  // 季节道具
  if (season === 'spring') {
    paintTrees(ctx, W, H, mid, random, 'blossom', 'hsl(336, 72%, 82%)')
  } else if (season === 'winter') {
    paintTrees(ctx, W, H, mid, random, 'pine', palette.accent)
  } else if (season === 'summer') {
    // 夏日植被：近景山脊上的亮绿点缀
    for (let i = 0; i < 60; i += 1) {
      const [x, y] = near[Math.floor(random() * near.length)]
      if (x < 0 || x > W) continue
      ctx.fillStyle = `rgba(88, 150, 104, ${0.10 + random() * 0.2})`
      ctx.beginPath()
      ctx.arc(x + (random() - 0.5) * 30, y + random() * 24, 3 + random() * 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 山谷薄雾
  const mist = ctx.createLinearGradient(0, horizon - 30, 0, horizon + H * 0.14)
  mist.addColorStop(0, 'rgba(210, 225, 245, 0.10)')
  mist.addColorStop(1, 'rgba(210, 225, 245, 0)')
  ctx.fillStyle = mist
  ctx.fillRect(0, horizon - 30, W, H * 0.2)

  // 飘落物
  paintParticles(ctx, W, H, random, daypart === 'day' && palette.prop === 'firefly' ? 'bird' : palette.prop, palette.accent, daypart)

  // 白天：压暗保证文字可读（夜晚/黎明本身够暗，只压一点点）
  if (daypart === 'day') paintDayScrim(ctx, W, H, 0.44)
  else if (daypart === 'dawn') paintDayScrim(ctx, W, H, 0.18)

  paintVignette(ctx, W, H)
  paintGrain(ctx, W, H, 0.05)
}
