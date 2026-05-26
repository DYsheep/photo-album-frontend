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
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
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

async function handleShare() {
  loading.value = true
  try {
    const res = await createShareLinkApi(props.photoId)
    if (res.code === 200 && res.data) {
      shareUrl.value = res.data.shareUrl
      showDialog.value = true
      await nextTick()
      linkInputRef.value?.select()
    } else {
      ElMessage.error(res.message || '创建分享链接失败')
    }
  } catch (err) {
    console.error('创建分享链接失败:', err)
    ElMessage.error('创建分享链接失败，请稍后重试')
  } finally {
    loading.value = false
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
</style>
