/**
 * 滚动定位工具
 *
 * 场景：合集/首页是多列瀑布流，卡片图片未预留高度（加载后才撑开），
 * 所以"滚一次就完事"会失效——内容增高后目标早就漂走了。
 * 这里用"反复校正直到位置稳定"的方式兜住：连续 3 次（约 360ms）位置
 * 不再变化即认为稳定，最长校正 maxWait 毫秒。
 */

const TICK_MS = 120
const STABLE_TICKS = 3
const MOVE_THRESHOLD = 6

/** 计算"让元素位于视口中部"所需的目标滚动高度 */
function centerTargetTop(el) {
  const rect = el.getBoundingClientRect()
  const absoluteTop = rect.top + window.scrollY
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const desired = absoluteTop - (window.innerHeight - rect.height) / 2
  return Math.max(0, Math.min(desired, maxScroll))
}

/** 把元素滚动到视口中部，并在布局变化时持续校正 */
export function alignElementStable(el, { maxWait = 4000 } = {}) {
  if (!el) return
  // 多列瀑布流下 scrollIntoView 的居中计算会偏，这里按绝对位置算并夹到可滚范围
  window.scrollTo(0, centerTargetTop(el))

  let stable = 0
  let lastTop = el.getBoundingClientRect().top
  const deadline = Date.now() + maxWait

  const timer = window.setInterval(() => {
    if (!el.isConnected) { window.clearInterval(timer); return }
    const top = el.getBoundingClientRect().top
    if (Math.abs(top - lastTop) > MOVE_THRESHOLD) {
      window.scrollTo(0, centerTargetTop(el))
      lastTop = el.getBoundingClientRect().top
      stable = 0
    } else {
      stable += 1
    }
    if (stable >= STABLE_TICKS || Date.now() > deadline) window.clearInterval(timer)
  }, TICK_MS)
}

/** 恢复到指定滚动高度，并在布局变化（图片撑开）时持续校正 */
export function restoreScrollYStable(top, { maxWait = 4000 } = {}) {
  if (!top || top <= 0) return
  window.scrollTo(0, top)

  let stable = 0
  let lastY = window.scrollY
  const deadline = Date.now() + maxWait

  const timer = window.setInterval(() => {
    if (Math.abs(window.scrollY - top) > 2) {
      // 内容还在变高时，滚动位置可能被截断：重新逼近目标
      window.scrollTo(0, top)
    }
    if (Math.abs(window.scrollY - lastY) < 2) {
      stable += 1
    } else {
      stable = 0
    }
    lastY = window.scrollY
    if (stable >= STABLE_TICKS || Date.now() > deadline) window.clearInterval(timer)
  }, TICK_MS)
}
