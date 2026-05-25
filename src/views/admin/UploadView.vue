<template>
  <div class="upload-page">
    <div class="upload-area">
      <!-- 拖拽上传区（使用 ImageUploader 组件） -->
      <ImageUploader v-model="rawFiles" />

      <!-- 图片信息表单 -->
      <div class="upload-form" v-if="selectedFiles.length > 0">
        <div v-for="(f, idx) in selectedFiles" :key="'form-' + idx" class="photo-form-card">
          <h4>{{ f.file.name }}</h4>
          <div class="form-row">
            <div class="form-group">
              <label>标题</label>
              <input v-model="f.title" type="text" placeholder="给照片起个名字" />
            </div>
            <div class="form-group">
              <label>分类</label>
              <select v-model="f.categoryId">
                <option :value="null">请选择</option>
                <option v-for="cat in categoryList" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>描述（可选）</label>
              <textarea v-model="f.description" rows="2" placeholder="简单描述这张照片..."></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>标签（逗号分隔）</label>
              <input v-model="f.tags" type="text" placeholder="例如: 日出, 清晨, 风景" />
            </div>
          </div>
        </div>

        <!-- 上传进度 -->
        <div v-if="uploading" class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadPercent + '%' }"></div>
          </div>
          <span class="progress-text">上传中... {{ uploadPercent }}%</span>
        </div>

        <!-- 操作按钮 -->
        <div class="action-row">
          <button class="btn-secondary" @click="clearAll">清空全部</button>
          <button class="btn-primary" @click="handleUpload" :disabled="!canUpload || uploading">
            {{ uploading ? '上传中...' : '开始上传 (' + selectedFiles.length + ' 张)' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 上传结果 -->
    <div v-if="uploadResults.length > 0" class="result-area">
      <h3>上传结果</h3>
      <div class="result-list">
        <div
          v-for="(res, idx) in uploadResults"
          :key="idx"
          class="result-item"
          :class="{ success: res.success, error: !res.success }"
        >
          <EmojiIcon v-if="res.success" name="check-mark-button" class="result-icon" :size="18" />
          <EmojiIcon v-else name="cross-mark" class="result-icon" :size="18" />
          <span class="result-name">{{ res.name }}</span>
          <span class="result-msg">{{ res.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { uploadPhotoApi } from '../../api/photo'
import { getCategoryListApi } from '../../api/category'
import ImageUploader from '../../components/ImageUploader.vue'
import EmojiIcon from '../../components/EmojiIcon.vue'

const rawFiles = ref([])
const selectedFiles = ref([])
const uploading = ref(false)
const uploadPercent = ref(0)
const uploadResults = ref([])
const categoryList = ref([])

// 页面加载时获取真实分类列表
onMounted(async () => {
  try {
    const res = await getCategoryListApi()
    categoryList.value = res.data || []
  } catch (err) {
    console.error('加载分类列表失败:', err)
  }
})

// 同步 rawFiles（ImageUploader 管理的文件）到 selectedFiles（带表单数据）
watch(rawFiles, (newFiles) => {
  // 为每个 rawFile 找到或创建对应的表单条目
  const newSelected = newFiles.map(rawFile => {
    const existing = selectedFiles.value.find(
      sf => sf.file === rawFile.file && sf.previewUrl === rawFile.previewUrl
    )
    if (existing) {
      return existing
    }
    const defaultTitle = rawFile.file.name.replace(/\.[^/.]+$/, '')
    return {
      file: rawFile.file,
      previewUrl: rawFile.previewUrl,
      title: defaultTitle,
      categoryId: null,
      description: '',
      tags: ''
    }
  })
  selectedFiles.value = newSelected
}, { deep: true })

// 清空
function clearAll() {
  rawFiles.value = []
  selectedFiles.value = []
  uploadResults.value = []
}

// 上传逻辑
const canUpload = computed(() => {
  return selectedFiles.value.every(f => f.title)
})

async function handleUpload() {
  uploading.value = true
  uploadPercent.value = 0
  uploadResults.value = []

  for (let i = 0; i < selectedFiles.value.length; i++) {
    const f = selectedFiles.value[i]

    try {
      const formData = new FormData()
      formData.append('file', f.file)
      formData.append('title', f.title)
      if (f.categoryId) formData.append('categoryId', f.categoryId)
      if (f.description) formData.append('description', f.description)
      if (f.tags) formData.append('tags', f.tags)

      await uploadPhotoApi(formData, (percent) => {
        uploadPercent.value = Math.round(((i + percent / 100) / selectedFiles.value.length) * 100)
      })

      uploadResults.value.push({
        name: f.file.name,
        success: true,
        message: '上传成功'
      })
    } catch (err) {
      let errMsg = '上传失败'
      if (err.response?.data?.message) {
        errMsg = err.response.data.message
      } else if (err.message) {
        errMsg = err.message
      }
      uploadResults.value.push({
        name: f.file.name,
        success: false,
        message: errMsg
      })
    }
  }

  uploading.value = false

  // 上传完成后清理
  const successCount = uploadResults.value.filter(r => r.success).length
  if (successCount === selectedFiles.value.length) {
    clearAll()
  }
}
</script>

<style scoped>
.upload-page {
  max-width: 800px;
}

/* 表单 */
.photo-form-card {
  background: #fff;
  border: 0.5px solid #eee;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 16px;
}

.photo-form-card h4 {
  font-size: 14px;
  color: #333;
  margin-bottom: 14px;
  font-weight: 500;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  flex: none;
  width: 100%;
}

.form-group label {
  font-size: 13px;
  color: #555;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  height: 36px;
  padding: 0 11px;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-group textarea {
  height: auto;
  padding: 8px 11px;
  resize: vertical;
}

/* 进度条 */
.progress-section {
  margin: 18px 0;
}

.progress-bar {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #378ADD, #5DADE2);
  border-radius: 4px;
  transition: width 0.3s ease-out;
}

.progress-text {
  font-size: 13px;
  color: #666;
}

/* 按钮 */
.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.btn-secondary {
  background: transparent;
  border: 1.5px solid #ddd;
  color: #555;
}

.btn-secondary:hover {
  border-color: #bbb;
}

/* 结果 */
.result-area {
  margin-top: 28px;
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  border: 0.5px solid #eee;
}

.result-area h3 {
  font-size: 15px;
  color: #333;
  margin-bottom: 14px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 0.5px solid #f5f5f5;
}

.result-item:last-child {
  border-bottom: none;
}

.result-icon {
  font-size: 16px;
}

.result-item.success .result-msg {
  color: #27500A;
}

.result-item.error .result-msg {
  color: #A32D2D;
}

.result-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  min-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-msg {
  font-size: 12px;
}
</style>
