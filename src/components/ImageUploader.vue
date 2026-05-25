<template>
  <div
    class="drop-zone"
    :class="{ dragging: isDragging, 'has-file': files.length }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
    @click="triggerFileInput"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      hidden
      @change="onFileSelected"
    />
    <div v-if="!files.length" class="drop-hint">
      <EmojiIcon name="file-folder" class="drop-icon" :size="40" />
      <p>拖拽图片到此处，或 <span class="highlight">点击选择文件</span></p>
      <span class="drop-note">支持 JPG / PNG / WEBP 等图片格式</span>
    </div>
    <div v-else class="file-preview">
      <div v-for="(f, i) in files" :key="getFileKey(f, i)" class="preview-item">
        <img :src="f.previewUrl" :alt="f.file.name" />
        <button class="remove-btn" @click.stop="removeFile(i)"><EmojiIcon name="cross-mark" :size="14" /></button>
      </div>
      <div class="add-more" @click.stop="triggerFileInput">
        <EmojiIcon name="plus" :size="14" class="icon-inline" /> 继续添加
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import EmojiIcon from '../components/EmojiIcon.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const isDragging = ref(false)

// 内部文件列表
const files = ref([...props.modelValue])

// 监听外部 modelValue 变化，同步到内部 files（如父组件清空操作）
watch(() => props.modelValue, (newVal) => {
  // 仅当外部变化与内部不一致时同步（避免自己发出的更新触发回环）
  if (JSON.stringify(newVal) !== JSON.stringify(files.value)) {
    files.value = [...newVal]
  }
}, { deep: true })

// 为每个文件生成唯一 key
function getFileKey(f, i) {
  return f._key || (f.file ? f.file.name + '-' + f.file.size + '-' + i : 'file-' + i)
}

function emitUpdate() {
  emit('update:modelValue', [...files.value])
}

// 拖拽处理
function onDragOver() {
  isDragging.value = true
}

function onDrop(e) {
  isDragging.value = false
  const fileList = e.dataTransfer.files
  addFiles(fileList)
}

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileSelected(e) {
  addFiles(e.target.files)
}

// 文件管理
function addFiles(fileList) {
  Array.from(fileList).forEach(file => {
    if (!file.type.startsWith('image/')) {
      alert(`"${file.name}" 不是有效的图片文件`)
      return
    }
    const previewUrl = URL.createObjectURL(file)
    files.value.push({
      file,
      previewUrl,
      _key: file.name + '-' + file.size + '-' + Date.now() + '-' + Math.random().toString(36).slice(2)
    })
  })
  emitUpdate()
}

function removeFile(index) {
  const removed = files.value.splice(index, 1)[0]
  if (removed && removed.previewUrl) {
    URL.revokeObjectURL(removed.previewUrl)
  }
  emitUpdate()
}
</script>

<style scoped>
/* 拖拽上传区域 */
.drop-zone {
  border: 2.5px dashed #ccc;
  border-radius: 14px;
  padding: 48px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: #fafafa;
  margin-bottom: 24px;
}

.drop-zone:hover {
  border-color: #378ADD;
  background: #F5FAFF;
}

.drop-zone.dragging {
  border-color: #378ADD;
  background: #E6F1FB;
  transform: scale(1.01);
}

.drop-icon {
  font-size: 52px;
  display: block;
  margin-bottom: 12px;
}

.drop-hint p {
  font-size: 15px;
  color: #555;
  margin-bottom: 6px;
}

.highlight {
  color: #378ADD;
  font-weight: 500;
}

.drop-note {
  font-size: 12px;
  color: #aaa;
}

/* 图片预览 */
.file-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.preview-item {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  border: 0.5px solid #ddd;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(226, 75, 74, 0.85);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-more {
  width: 140px;
  height: 140px;
  border-radius: 8px;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #999;
  transition: all 0.2s;
}

.add-more:hover {
  border-color: #378ADD;
  color: #378ADD;
}
</style>
