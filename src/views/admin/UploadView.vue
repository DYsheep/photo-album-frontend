<template>
  <div class="upload-page">
    <div class="page-header">
      <h2>上传照片</h2>
      <span class="page-desc">拖拽或点击选取，批量上传并预设分类、合集和标签</span>
    </div>

    <!-- 拖拽区域 -->
    <div
      class="drop-zone"
      :class="{ 'drop-active': dragging }"
      @dragenter.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @click="fileInput.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="file-input-hidden"
        @change="handleFileSelect"
      />
      <div class="drop-inner">
        <div class="drop-icon-wrapper">
          <EmojiIcon name="outbox-tray" :size="36" />
        </div>
        <p class="drop-title">拖拽照片到此处</p>
        <p class="drop-sub">或 <button class="link-btn" @click.stop="fileInput.click()">点击选择文件</button></p>
        <p class="drop-hint">支持 JPG / PNG / WebP / HEIC &nbsp;·&nbsp;可多选</p>
      </div>
    </div>

    <!-- 预设信息 -->
    <div v-if="files.length" class="card preset-card">
      <div class="card-header">
        <h3>批量设置</h3>
        <span class="card-badge">{{ files.length }} 张照片</span>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>分类</label>
            <select v-model="preset.categoryId">
              <option :value="null">不指定</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>合集</label>
            <select v-model="preset.collectionId">
              <option :value="null">不指定</option>
              <option v-for="c in collections" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-2">
            <label>标签</label>
            <input v-model="preset.tags" placeholder="用逗号分隔，如 风景, 人像, 黑白" />
          </div>
          <div class="form-group form-group-check">
            <label>&nbsp;</label>
            <label v-if="auth.isAdmin" class="checkbox-label">
              <input type="checkbox" v-model="preset.isPrivate" />
              <span>设为私密（仅管理员可上传私密照片）</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件列表 -->
    <div v-if="files.length" class="card">
      <div class="card-header">
        <h3>待上传列表</h3>
        <button v-if="!uploading" class="link-btn" @click="clearFiles">清空全部</button>
      </div>
      <div class="card-body file-list-body">
        <div
          v-for="(f, i) in files"
          :key="i"
          class="file-row"
          :class="{ 'file-done': f.status === 'done', 'file-fail': f.status === 'fail' }"
        >
          <div class="file-thumb-wrap">
            <img :src="f.preview" class="file-thumb-img" />
            <div v-if="f.status === 'done'" class="thumb-overlay done-overlay">✓</div>
            <div v-if="f.status === 'fail'" class="thumb-overlay fail-overlay">✗</div>
          </div>
          <div class="file-body">
            <input
              v-model="f.title"
              :placeholder="f.originalName"
              class="file-title-input"
              :disabled="f.status === 'done'"
            />
            <div class="file-meta">{{ formatSize(f.size) }}</div>
            <div v-if="f.status === 'uploading'" class="progress-bar">
              <div class="progress-fill" :style="{ width: f.progress + '%' }"></div>
            </div>
            <div v-if="f.status === 'fail'" class="status-text fail">{{ f.error }}</div>
          </div>
          <button
            v-if="f.status !== 'done'"
            class="btn-sm btn-danger"
            @click="removeFile(i)"
            :disabled="uploading"
          >移除</button>
        </div>
      </div>
    </div>

    <!-- 操作 -->
    <div v-if="files.length" class="actions">
      <button
        class="btn-primary btn-upload-all"
        @click="uploadAll"
        :disabled="uploading || allDone"
      >
        <EmojiIcon v-if="!uploading" name="outbox-tray" :size="18" class="icon-inline" />
        {{ uploading ? '上传中...' : '开始上传全部' }}
      </button>
      <button v-if="allDone" class="btn-secondary" @click="goManage">去管理照片</button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth'
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EmojiIcon from '../../components/EmojiIcon.vue'
import { getCategoryListApi } from '../../api/category'
import { getAdminCollectionsApi } from '../../api/collection'
import { uploadPhotoApi } from '../../api/photo'

const router = useRouter()
const fileInput = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const files = ref([])
const categories = ref([])
const collections = ref([])
const auth = useAuthStore()

const preset = reactive({ categoryId: null, collectionId: null, tags: '', isPrivate: false })

const allDone = computed(() => files.value.length && files.value.every(f => f.status === 'done'))

function formatSize(bytes) {
  if (!bytes) return ''
  return bytes < 1048576 ? (bytes / 1024).toFixed(0) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB'
}

function makeFileItem(file) {
  return {
    file,
    originalName: file.name,
    title: file.name.replace(/\.[^.]+$/, ''),
    size: file.size,
    preview: URL.createObjectURL(file),
    status: 'pending',
    progress: 0,
    error: ''
  }
}

function addFiles(rawFiles) {
  for (const f of rawFiles) {
    if (!f.type.startsWith('image/')) continue
    files.value.push(makeFileItem(f))
  }
}

function handleDrop(e) { dragging.value = false; addFiles(e.dataTransfer.files) }
function handleFileSelect(e) { addFiles(e.target.files); e.target.value = '' }
function removeFile(i) { URL.revokeObjectURL(files.value[i].preview); files.value.splice(i, 1) }
function clearFiles() { files.value.forEach(f => URL.revokeObjectURL(f.preview)); files.value = [] }

async function uploadAll() {
  uploading.value = true
  for (const f of files.value) {
    if (f.status === 'done') continue
    f.status = 'uploading'; f.progress = 0
    try {
      const fd = new FormData()
      fd.append('file', f.file)
      if (f.title) fd.append('title', f.title)
      if (preset.categoryId) fd.append('categoryId', preset.categoryId)
      if (preset.tags) fd.append('tags', preset.tags)
      if (preset.isPrivate) fd.append('isPrivate', '1')
      if (preset.collectionId) fd.append('collectionId', preset.collectionId)
      await uploadPhotoApi(fd, (e) => { f.progress = Math.round((e.loaded / e.total) * 100) })
      f.status = 'done'; f.progress = 100
    } catch (err) {
      f.status = 'fail'
      f.error = err.response?.data?.message || '上传失败'
    }
  }
  uploading.value = false
}

function goManage() { router.push({ name: 'adminPhotos' }) }

onMounted(async () => {
  try { const r = await getCategoryListApi(); if (r.code === 200) categories.value = r.data || [] } catch {}
  try { const r = await getAdminCollectionsApi(); if (r.code === 200) collections.value = r.data || [] } catch {}
})
</script>

<style scoped>
.upload-page { max-width: 800px; }

/* 页头 */
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; font-size: 20px; font-weight: 600; color: var(--text-primary); }
.page-desc { font-size: 13px; color: var(--text-muted, #999); }

/* 拖拽区域 */
.drop-zone {
  border: 2px dashed var(--border-color, #dfe1e5);
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-card, #fafafa);
}
.drop-zone:hover { border-color: #b3cfe8; background: rgba(55,138,221,0.02); }
.drop-zone.drop-active { border-color: var(--color-primary, #378ADD); background: rgba(55,138,221,0.05); border-style: solid; }
.drop-inner { pointer-events: auto; }
.drop-icon-wrapper { margin-bottom: 12px; color: var(--text-muted, #aaa); }
.drop-title { font-size: 16px; font-weight: 500; color: var(--text-primary); margin: 0; }
.drop-sub { font-size: 13px; color: var(--text-muted, #999); margin: 6px 0 0; }
.drop-hint { font-size: 11px; color: var(--text-muted, #bbb); margin: 8px 0 0; }
.link-btn { background: none; border: none; color: var(--color-primary, #378ADD); cursor: pointer; padding: 0; font-size: inherit; pointer-events: auto; }
.link-btn:hover { text-decoration: underline; }
.file-input-hidden { display: none; }

/* 卡片通用 */
.card {
  margin-top: 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e8eaed);
  border-radius: 10px;
  overflow: hidden;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
}
.card-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
.card-badge { font-size: 12px; color: var(--text-muted, #aaa); background: var(--bg-hover, #f0f0f0); padding: 2px 10px; border-radius: 10px; }
.card-body { padding: 16px 20px; }

/* 预设表单 */
.form-row { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; }
.form-row:last-child { margin-bottom: 0; }
.form-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 140px; }
.form-group.flex-2 { flex: 2; }
.form-group-check { flex: 0 0 auto; min-width: auto; }
.form-group label { font-size: 12px; color: var(--text-muted, #999); font-weight: 500; }
.form-group input,
.form-group select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #dfe1e5);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-input, #fff);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
}
.form-group input:focus,
.form-group select:focus { border-color: var(--color-primary, #378ADD); box-shadow: 0 0 0 2px rgba(55,138,221,0.1); }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-primary); cursor: pointer; white-space: nowrap; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-primary, #378ADD); }

/* 文件列表 */
.file-list-body { padding: 0; }
.file-row {
  display: flex; align-items: center; gap: 14px; padding: 12px 20px;
  border-bottom: 1px solid var(--border-light, #f4f4f5);
  transition: background 0.15s;
}
.file-row:last-child { border-bottom: none; }
.file-row:hover { background: var(--bg-hover, #fafafa); }
.file-done { opacity: 0.65; }
.file-fail { background: rgba(245,108,108,0.03); }
.file-thumb-wrap { position: relative; flex-shrink: 0; }
.file-thumb-img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-light, #eee); }
.thumb-overlay {
  position: absolute; inset: 0; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700;
}
.done-overlay { background: rgba(103,194,58,0.1); color: #67C23A; }
.fail-overlay { background: rgba(245,108,108,0.1); color: #F56C6C; }
.file-body { flex: 1; min-width: 0; }
.file-title-input {
  width: 100%; padding: 6px 10px;
  border: 1px solid var(--border-color, #dfe1e5);
  border-radius: 6px; font-size: 13px;
  background: var(--bg-input, #fff); color: var(--text-primary);
  outline: none; transition: border-color 0.2s;
}
.file-title-input:focus { border-color: var(--color-primary, #378ADD); }
.file-meta { font-size: 11px; color: var(--text-muted, #bbb); margin-top: 3px; }
.progress-bar { height: 4px; background: var(--bg-hover, #eee); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--color-primary, #378ADD); border-radius: 2px; transition: width 0.4s ease; }
.status-text { font-size: 12px; margin-top: 4px; }
.status-text.fail { color: #F56C6C; }

/* 操作按钮 */
.actions { margin-top: 20px; display: flex; gap: 12px; align-items: center; }
.btn-upload-all {
  padding: 10px 28px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

/* 兜底：文件输入框不使用 display:none（部分移动浏览器不会为它弹出选择器），改为离屏透明 */
.drop-zone input[type="file"] {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

/* 触摸热区：拖拽区在手机上足够大，整块可点 */
@media (max-width: 768px) {
  .drop-zone {
    padding: 28px 16px;
    min-height: 160px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .link-btn {
    min-height: 44px;
    padding: 6px 8px;
  }
}
</style>
