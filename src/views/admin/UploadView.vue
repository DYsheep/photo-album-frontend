<template>
  <div class="upload-page">
    <h2>上传照片</h2>

    <!-- 拖拽区域 -->
    <div
      class="drop-zone"
      :class="{ 'drop-active': dragging }"
      @dragenter.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="file-input-hidden"
        @change="handleFileSelect"
      />
      <div class="drop-hint">
        <EmojiIcon name="image" :size="40" />
        <p>拖拽照片到此处，或 <button class="link-btn" @click="$refs.fileInput.click()">点击选择</button></p>
        <p class="sub">支持 JPG/PNG/WebP/HEIC，可多选</p>
      </div>
    </div>

    <!-- 预设信息（应用于所有文件） -->
    <div v-if="files.length" class="preset-form">
      <h3>批量设置</h3>
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
        <div class="form-group flex-2">
          <label>标签（逗号分隔）</label>
          <input v-model="preset.tags" placeholder="风景, 人像, 黑白" />
        </div>
      </div>
      <div class="form-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="preset.isPrivate" /> 设为私密
        </label>
      </div>
    </div>

    <!-- 文件列表 -->
    <div v-if="files.length" class="file-list">
      <div class="file-list-header">
        <h3>已选 {{ files.length }} 张</h3>
        <button v-if="!uploading" class="link-btn" @click="clearFiles">清空</button>
      </div>
      <div
        v-for="(f, i) in files"
        :key="i"
        class="file-item"
        :class="{ 'uploaded': f.status === 'done', 'failed': f.status === 'fail' }"
      >
        <img :src="f.preview" class="file-thumb" />
        <div class="file-info">
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
          <div v-if="f.status === 'done'" class="status-tag done">✓ 已上传</div>
          <div v-if="f.status === 'fail'" class="status-tag fail">✗ {{ f.error }}</div>
        </div>
        <button
          v-if="f.status !== 'done'"
          class="btn-sm btn-danger"
          @click="removeFile(i)"
          :disabled="uploading"
        >移除</button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="files.length" class="actions">
      <button
        class="btn-primary"
        @click="uploadAll"
        :disabled="uploading || allDone"
      >
        {{ uploading ? '上传中...' : '开始上传全部' }}
      </button>
      <button v-if="allDone" class="btn-secondary" @click="goManage">去管理照片</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EmojiIcon from '../../components/EmojiIcon.vue'
import { getCategoriesApi } from '../../api/category'
import { getAdminCollectionsApi } from '../../api/collection'
import { uploadPhotoApi } from '../../api/photo'

const router = useRouter()
const fileInput = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const files = ref([])
const categories = ref([])
const collections = ref([])
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

function handleDrop(e) {
  dragging.value = false
  addFiles(e.dataTransfer.files)
}
function handleFileSelect(e) {
  addFiles(e.target.files)
  e.target.value = ''
}
function removeFile(i) {
  URL.revokeObjectURL(files.value[i].preview)
  files.value.splice(i, 1)
}
function clearFiles() {
  files.value.forEach(f => URL.revokeObjectURL(f.preview))
  files.value = []
}

async function uploadAll() {
  uploading.value = true
  for (const f of files.value) {
    if (f.status === 'done') continue
    f.status = 'uploading'
    f.progress = 0
    try {
      const formData = new FormData()
      formData.append('file', f.file)
      if (f.title) formData.append('title', f.title)
      if (preset.categoryId) formData.append('categoryId', preset.categoryId)
      if (preset.tags) formData.append('tags', preset.tags)
      if (preset.isPrivate) formData.append('isPrivate', '1')
      if (preset.collectionId) formData.append('collectionId', preset.collectionId)

      await uploadPhotoApi(formData, (e) => {
        f.progress = Math.round((e.loaded / e.total) * 100)
      })
      f.status = 'done'
      f.progress = 100
    } catch (err) {
      f.status = 'fail'
      f.error = err.response?.data?.message || '上传失败'
    }
  }
  uploading.value = false
}

function goManage() {
  router.push({ name: 'adminPhotos' })
}

onMounted(async () => {
  try { const r = await getCategoriesApi(); if (r.code === 200) categories.value = r.data || [] } catch {}
  try { const r = await getAdminCollectionsApi(); if (r.code === 200) collections.value = r.data || [] } catch {}
})
</script>

<style scoped>
.upload-page { max-width: 800px; }
.drop-zone {
  border: 2px dashed var(--border-color, #ddd);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
  background: var(--bg-card, #fafafa);
}
.drop-zone.drop-active { border-color: var(--color-primary, #378ADD); background: rgba(55,138,221,0.04); }
.drop-hint p { margin: 8px 0 0; color: var(--text-muted, #888); }
.drop-hint .sub { font-size: 12px; }
.link-btn { background: none; border: none; color: var(--color-primary, #378ADD); cursor: pointer; padding: 0; text-decoration: underline; }
.file-input-hidden { display: none; }

.preset-form {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-card, #fafafa);
  border-radius: 8px;
}
.preset-form h3 { margin: 0 0 12px; font-size: 15px; }
.form-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 8px; }
.form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 140px; }
.form-group.flex-2 { flex: 2; }
.form-group label { font-size: 12px; color: var(--text-muted); }
.form-group input, .form-group select {
  padding: 6px 10px; border: 1px solid var(--border-color, #ddd); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);
}
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }

.file-list { margin-top: 20px; }
.file-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.file-list-header h3 { margin: 0; font-size: 15px; }
.file-item {
  display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 0.5px solid var(--border-light, #eee);
}
.file-item.uploaded { opacity: 0.7; }
.file-item.failed { background: rgba(245,108,108,0.04); border-radius: 6px; padding: 8px; }
.file-thumb { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; }
.file-title-input {
  width: 100%; padding: 4px 8px; border: 1px solid var(--border-color, #ddd); border-radius: 4px; font-size: 13px; background: var(--bg-input); color: var(--text-primary);
}
.file-meta { font-size: 11px; color: var(--text-muted, #aaa); margin-top: 2px; }
.progress-bar { height: 4px; background: var(--bg-hover, #eee); border-radius: 2px; margin-top: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--color-primary, #378ADD); border-radius: 2px; transition: width 0.3s; }
.status-tag { font-size: 11px; margin-top: 2px; }
.status-tag.done { color: #67C23A; }
.status-tag.fail { color: #F56C6C; }

.actions { margin-top: 20px; display: flex; gap: 12px; }
</style>
