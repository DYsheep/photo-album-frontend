<template>
  <div class="share-button-wrapper">
    <button class="share-btn" @click="handleShare" :disabled="loading">
      <EmojiIcon name="link" :size="16" class="icon-inline" />
      <span>{{ loading ? '生成中...' : buttonText }}</span>
    </button>

    <!-- 分享链接弹窗 -->
    <Teleport to="body">
      <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
        <div class="dialog-card">
          <div class="dialog-header">
            <h3><EmojiIcon name="link" :size="18" class="icon-inline" /> 分享链接</h3>
            <button class="dialog-close" @click="closeDialog">&times;</button>
          </div>
          <div class="dialog-body">
            <p class="dialog-desc">复制下方链接分享此照片</p>
            <div class="link-box">
              <input
                ref="linkInputRef"
                class="link-input"
                :value="shareUrl"
                readonly
                @focus="$event.target.select()"
              />
              <button class="copy-btn" @click="copyLink">
                <EmojiIcon v-if="!copied" name="clipboard" :size="16" />
                <EmojiIcon v-else name="check-mark-button" :size="16" />
                {{ copied ? '已复制' : '复制' }}
              </button>
            </div>

            <div class="expiry-row">
              <label class="expiry-label">有效期</label>
              <select v-model="expiryChoice" class="expiry-select" @change="handleExpiryChange">
                <option value="permanent">永久有效</option>
                <option value="7">7 天后到期</option>
                <option value="30">30 天后到期</option>
                <option value="custom">自定义到期日</option>
              </select>
              <input
                v-if="expiryChoice === 'custom'"
                v-model="customDate"
                type="date"
                class="expiry-date"
                :min="today"
                @change="handleExpiryChange"
              />
            </div>
            <p class="expiry-hint">{{ expiryText }}</p>
            <p class="expiry-note">照片被设为私密后，该链接对无权限访问者即刻失效。</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { createShareLinkApi } from '../api/share'
import { ElMessage } from 'element-plus'
import EmojiIcon from './EmojiIcon.vue'

const props = defineProps({
  photoId: { type: Number, required: true },
  buttonText: { type: String, default: '分享链接' }
})

const loading = ref(false)
const showDialog = ref(false)
const shareUrl = ref('')
const copied = ref(false)
const linkInputRef = ref(null)

/** 有效期选择：permanent | '7' | '30' | 'custom' */
const expiryChoice = ref('permanent')
const customDate = ref('')
const expiresAt = ref(null)

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const expiryText = computed(() => {
  if (!expiresAt.value) return '永久有效'
  return '有效期至 ' + String(expiresAt.value).replace('T', ' ').slice(0, 16)
})

/** 组装创建/更新参数；返回 null 表示自定义到期日尚未选择 */
function buildExpiryOptions() {
  if (expiryChoice.value === 'permanent') return {}
  if (expiryChoice.value === 'custom') {
    return customDate.value ? { expiresAt: customDate.value } : null
  }
  const days = Number(expiryChoice.value)
  const d = new Date()
  d.setDate(d.getDate() + days)
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { expiresAt: iso }
}

/** 请求分享链接（创建或按新有效期更新） */
async function requestShareLink() {
  const options = buildExpiryOptions()
  if (options === null) {
    ElMessage.warning('请选择到期日')
    return null
  }
  const res = await createShareLinkApi(props.photoId, options)
  if (res.code === 200 && res.data) {
    shareUrl.value = res.data.shareUrl
    expiresAt.value = res.data.expiresAt || null
    return res
  }
  ElMessage.error(res.message || '创建分享链接失败')
  return null
}

async function handleShare() {
  loading.value = true
  try {
    const res = await requestShareLink()
    if (res) {
      showDialog.value = true
      await nextTick()
      linkInputRef.value?.select()
    }
  } catch (err) {
    console.error('创建分享链接失败:', err)
    ElMessage.error('创建分享链接失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/** 已生成链接后调整有效期（同一链接按新设置更新，分享码不变） */
async function handleExpiryChange() {
  if (!showDialog.value) return
  if (buildExpiryOptions() === null) return
  try {
    const res = await requestShareLink()
    if (res) ElMessage.success('有效期已更新')
  } catch (err) {
    console.error('更新分享有效期失败:', err)
    ElMessage.error('更新有效期失败，请稍后重试')
  }
}

function closeDialog() {
  showDialog.value = false
  copied.value = false
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback: 选中文本
    linkInputRef.value?.select()
    ElMessage.info('请手动复制链接')
  }
}
</script>

<style scoped>
.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 1.5px solid var(--color-primary, #378ADD);
  border-radius: 8px;
  background: var(--bg-card, #fff);
  color: var(--color-primary, #378ADD);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.share-btn:hover:not(:disabled) {
  background: var(--color-primary, #378ADD);
  color: #fff;
}

.share-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.dialog-card {
  background: var(--bg-card, #fff);
  border-radius: 14px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 0.5px solid var(--border-lighter, #f0f0f0);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary, #1a1a2e);
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 22px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.dialog-close:hover {
  color: #444;
}

.dialog-body {
  padding: 20px 24px 24px;
}

.dialog-desc {
  margin: 0 0 14px;
  font-size: 14px;
  color: var(--text-muted, #888);
}

.link-box {
  display: flex;
  gap: 8px;
  align-items: center;
}

.link-input {
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary, #333);
  background: var(--bg-hover, #f8f8f8);
  outline: none;
  transition: border-color 0.2s;
}

.link-input:focus {
  border-color: var(--color-primary, #378ADD);
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 10px 18px;
  background: var(--color-primary, #378ADD);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: var(--color-primary-dark, #2B6EC5);
}

/* 有效期设置 */
.expiry-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.expiry-label {
  font-size: 14px;
  color: var(--text-secondary, #333);
  flex-shrink: 0;
}

.expiry-select,
.expiry-date {
  padding: 8px 12px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary, #333);
  background: var(--bg-card, #fff);
  outline: none;
}

.expiry-select {
  flex: 1;
}

.expiry-select:focus,
.expiry-date:focus {
  border-color: var(--color-primary, #378ADD);
}

.expiry-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-muted, #888);
}

.expiry-note {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-muted, #999);
}
</style>
