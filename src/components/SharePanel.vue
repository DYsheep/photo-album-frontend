<template>
  <button class="share-launch" :class="{ 'share-launch--block': block }" @click="open">
    <EmojiIcon name="outbox-tray" :size="16" class="icon-inline" />
    <span>{{ label }}</span>
  </button>

  <Teleport to="body">
    <div v-if="visible" class="modal-overlay share-overlay" @click.self="close">
      <div class="modal-content share-panel">
        <div class="share-head">
          <h3><EmojiIcon name="outbox-tray" :size="18" class="icon-inline" /> 分享</h3>
          <button class="share-close" title="关闭" @click="close">
            <EmojiIcon name="cross-mark" :size="16" />
          </button>
        </div>

        <p class="share-tip">长按图片保存到相册，即可发到微信聊天或朋友圈</p>

        <div class="card-preview">
          <img v-if="cardDataUrl" :src="cardDataUrl" alt="分享卡片" class="card-image" />
          <div v-else class="card-loading">
            {{ failed ? '卡片生成失败，可直接复制链接分享' : '正在生成卡片…' }}
          </div>
        </div>

        <p v-if="inWechat" class="share-wechat-tip">
          在微信里也可以点右上角「···」→ 发送给朋友
        </p>

        <div class="share-buttons">
          <button class="btn-secondary btn-sm" :disabled="!cardDataUrl" @click="downloadCard">
            <EmojiIcon name="floppy-disk" :size="14" class="icon-inline" /> 保存图片
          </button>
          <button class="btn-secondary btn-sm" @click="copyLink">
            <EmojiIcon name="clipboard" :size="14" class="icon-inline" />
            {{ copied ? '已复制' : '复制链接' }}
          </button>
          <button v-if="canSystemShare" class="btn-primary btn-sm" @click="systemShare">
            <EmojiIcon name="outbox-tray" :size="14" class="icon-inline" /> 分享到…
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import EmojiIcon from './EmojiIcon.vue'

const props = defineProps({
  /** 分享页地址（必填） */
  url: { type: String, required: true },
  /** 卡片标题（合集名 / 照片标题） */
  title: { type: String, default: '' },
  /** 卡片描述 */
  description: { type: String, default: '' },
  /** 按钮文案 */
  label: { type: String, default: '分享' },
  /** 是否占满一行 */
  block: { type: Boolean, default: false }
})

const visible = ref(false)
const cardDataUrl = ref('')
const copied = ref(false)
const failed = ref(false)

/** 微信内置浏览器：不支持系统分享，只能引导用右上角菜单 */
const inWechat = computed(() => /MicroMessenger/i.test(navigator.userAgent))
const canSystemShare = computed(() => typeof navigator.share === 'function')

/** 从分享链接里取出分享码（卡片图与二维码都按它取） */
const code = computed(() => {
  const matched = String(props.url || '').match(/\/share\/([A-Za-z0-9]+)/)
  return matched ? matched[1] : ''
})

function open() {
  visible.value = true
  if (!cardDataUrl.value && !failed.value) {
    renderCard().then((data) => {
      if (data) {
        cardDataUrl.value = data
      } else {
        failed.value = true
      }
    })
  }
}

function close() {
  visible.value = false
  copied.value = false
}

// ============================================================
// 卡片图：封面 + 标题 + 描述 + 二维码（微信里长按保存就能转发）
// ============================================================

const CARD_WIDTH = 900
const CARD_HEIGHT = 1200
const FONT_STACK = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'

async function renderCard() {
  if (!code.value) return ''
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const coverHeight = 760
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // 封面（等比裁切铺满；取不到就用主色块兜底）
  const cover = await loadImage(`/api/share/${code.value}/cover`).catch(() => null)
  if (cover) {
    drawCover(ctx, cover, 0, 0, CARD_WIDTH, coverHeight)
  } else {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CARD_WIDTH, coverHeight)
  }

  // 标题
  let cursorY = coverHeight + 96
  ctx.fillStyle = '#1a1a2e'
  ctx.font = `bold 46px ${FONT_STACK}`
  const titleLines = wrapText(ctx, props.title || '摄影相册', CARD_WIDTH - 120, 2)
  titleLines.forEach((line) => {
    ctx.fillText(line, 60, cursorY)
    cursorY += 62
  })

  // 描述
  if (props.description) {
    cursorY += 8
    ctx.fillStyle = '#767676'
    ctx.font = `30px ${FONT_STACK}`
    const descLines = wrapText(ctx, props.description, CARD_WIDTH - 320, 3)
    descLines.forEach((line) => {
      ctx.fillText(line, 60, cursorY)
      cursorY += 44
    })
  }

  // 二维码（扫码即可打开分享页）
  const qrSize = 200
  const qr = await loadImage(`/api/share/${code.value}/qrcode`).catch(() => null)
  if (qr) {
    ctx.drawImage(qr, CARD_WIDTH - 60 - qrSize, CARD_HEIGHT - 60 - qrSize, qrSize, qrSize)
  }

  // 底部站点标识
  ctx.fillStyle = '#1a1a2e'
  ctx.font = `bold 36px ${FONT_STACK}`
  ctx.fillText('摄影相册', 60, CARD_HEIGHT - 156)
  ctx.fillStyle = '#9a9a9a'
  ctx.font = `26px ${FONT_STACK}`
  ctx.fillText('扫码查看完整内容', 60, CARD_HEIGHT - 106)

  try {
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch (err) {
    console.error('导出分享卡片失败:', err)
    return ''
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

/** 等比裁切铺满目标区域（居中） */
function drawCover(ctx, img, x, y, width, height) {
  const scale = Math.max(width / img.width, height / img.height)
  const drawWidth = img.width * scale
  const drawHeight = img.height * scale
  ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

/** 按可用宽度折行，超出最大行数用省略号收尾 */
function wrapText(ctx, text, maxWidth, maxLines) {
  const chars = String(text || '').split('')
  const lines = []
  let line = ''
  for (const char of chars) {
    const candidate = line + char
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = char
      if (lines.length === maxLines) {
        let last = lines[maxLines - 1]
        while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
          last = last.slice(0, -1)
        }
        lines[maxLines - 1] = last + '…'
        return lines
      }
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, maxLines)
}

// ============================================================
// 三个动作
// ============================================================

function downloadCard() {
  if (!cardDataUrl.value) return
  const link = document.createElement('a')
  link.href = cardDataUrl.value
  link.download = `分享卡片-${code.value || 'photo'}.jpg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    ElMessage.success('链接已复制，去微信粘贴给好友即可')
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    ElMessage.info('复制失败，请长按链接手动复制')
  }
}

async function systemShare() {
  try {
    await navigator.share({
      title: props.title || '摄影相册',
      text: props.description || '分享给你',
      url: props.url
    })
  } catch (err) {
    // 用户主动取消不算失败
    if (err && err.name !== 'AbortError') {
      ElMessage.info('当前环境不支持直接分享，请用「保存图片」或「复制链接」')
    }
  }
}
</script>

<style scoped>
.share-launch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1.5px solid var(--color-primary, #378ADD);
  border-radius: 8px;
  background: var(--bg-card, #fff);
  color: var(--color-primary, #378ADD);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.share-launch--block {
  width: 100%;
  justify-content: center;
}

/* 悬停仅在支持悬停的设备上生效，避免触摸设备"粘住" */
@media (hover: hover) {
  .share-launch:hover {
    background: var(--color-primary, #378ADD);
    color: #fff;
  }
}

/* 面板：z-index 高于其他弹窗（分享按钮可能出现在弹窗里） */
.share-overlay {
  z-index: 11000;
}

.share-panel {
  width: 400px;
  max-height: 88vh;
  overflow-y: auto;
}

.share-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.share-head h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-close {
  background: none;
  border: none;
  color: var(--text-muted, #999);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.share-tip {
  margin: 14px 0 10px;
  font-size: 13px;
  color: var(--text-muted, #888);
}

.card-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-hover, #f5f5f5);
  border: 0.5px solid var(--border-lighter, #eee);
  min-height: 220px;
}

.card-image {
  display: block;
  width: 100%;
  height: auto;
}

.card-loading {
  padding: 60px 20px;
  font-size: 13px;
  color: var(--text-muted, #999);
}

.share-wechat-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-muted, #888);
}

.share-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.share-buttons .btn-primary,
.share-buttons .btn-secondary {
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 9px 14px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.share-buttons button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .share-panel {
    width: 92vw;
    padding: 20px;
  }

  .card-preview {
    min-height: 160px;
  }

  .share-buttons .btn-primary,
  .share-buttons .btn-secondary {
    flex: 1 1 100%;
  }
}
</style>
