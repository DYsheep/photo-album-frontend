<template>
  <Teleport to="body">
    <Transition name="lightbox-fade">
      <div
        v-if="visible"
        class="lightbox"
        @click.self="close"
        tabindex="-1"
        ref="lightboxEl"
      >
        <!-- 关闭按钮 -->
        <button class="lightbox-close" @click="close" aria-label="关闭"><X :size="28" /></button>

        <!-- 上一张 -->
        <button
          v-if="canPrev"
          class="lightbox-arrow lightbox-prev"
          @click.stop="prevPhoto"
          aria-label="上一张"
        >
          <ChevronLeft class="lightbox-arrow-icon" />
        </button>

        <!-- 图片区域（滚轮缩放 + 拖拽平移） -->
        <div class="lightbox-content" @click.stop @wheel.prevent="onWheelZoom">
          <img
            :src="currentPhoto.url"
            :alt="currentPhoto.title"
            class="lightbox-img"
            :class="{ 'is-draggable': imgScale > 1, 'is-dragging': isDragging }"
            :style="{ transform: `scale(${imgScale}) translate(${imgTranslateX}px, ${imgTranslateY}px)` }"
            @load="onLightboxImgLoad"
            @error="onLightboxImgError"
            @mousedown.prevent="onDragStart"
          />
          <!-- 缩放提示 -->
          <span v-if="imgScale > 1" class="zoom-indicator">{{ Math.round(imgScale * 100) }}%</span>
        </div>

        <!-- 下一张 -->
        <button
          v-if="canNext"
          class="lightbox-arrow lightbox-next"
          @click.stop="nextPhoto"
          aria-label="下一张"
        >
          <ChevronRight class="lightbox-arrow-icon" />
        </button>

        <!-- 底部信息栏 -->
        <div class="lightbox-info">
          <span class="lightbox-title">{{ currentPhoto.title }}</span>
          <span class="lightbox-tag">{{ currentPhoto.categoryName }}</span>
          <span v-if="exifDisplay" class="lightbox-exif">{{ exifDisplay }}</span>
          <span class="lightbox-desc">{{ currentPhoto.description }}</span>
          <a class="lightbox-detail-link" @click.prevent="goToDetail" href="#">查看详情</a>
          <span class="lightbox-index">{{ currentIndex + 1 }} / {{ totalPhotos }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'


const router = useRouter()

const props = defineProps({
  photos: {
    type: Array,
    required: true
  },
  modelValue: {
    type: Boolean,
    default: false
  },
  initialIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue'])

const lightboxEl = ref(null)
const currentIndex = ref(0)
const imgScale = ref(1)
const imgTranslateX = ref(0)
const imgTranslateY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragOrigX = ref(0)
const dragOrigY = ref(0)

const ZOOM_STEP = 0.15
const ZOOM_MIN = 1
const ZOOM_MAX = 5

// 双向绑定 visible
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 当前照片
const currentPhoto = computed(() => {
  return props.photos[currentIndex.value] || {}
})

const totalPhotos = computed(() => props.photos.length)
const canPrev = computed(() => currentIndex.value > 0)
const canNext = computed(() => currentIndex.value < totalPhotos.value - 1)

// 解析 EXIF 信息为展示字符串
// 优先使用后端传来的结构化字段，fallback 到 JSON 解析（兼容旧数据）
const exifDisplay = computed(() => {
  const p = currentPhoto.value
  if (!p) return ''
  const parts = []
  // 优先使用结构化字段
  if (p.cameraModel) parts.push(p.cameraModel)
  if (p.aperture) parts.push(p.aperture)
  if (p.shutterSpeed) parts.push(p.shutterSpeed)
  if (p.iso) parts.push('ISO ' + p.iso)
  if (p.focalLength) parts.push(p.focalLength)
  // 如果结构化字段全为空，fallback 到 JSON 解析（兼容旧数据）
  if (parts.length === 0 && p.exifInfo) {
    try {
      const obj = typeof p.exifInfo === 'string' ? JSON.parse(p.exifInfo) : p.exifInfo
      if (obj['相机型号']) parts.push(obj['相机型号'])
      if (obj['光圈']) parts.push(obj['光圈'])
      if (obj['快门速度']) parts.push(obj['快门速度'])
      if (obj['ISO']) parts.push('ISO ' + obj['ISO'])
      if (obj['焦距']) parts.push(obj['焦距'])
    } catch {
      // JSON 解析失败，忽略
    }
  }
  return parts.join('  ·  ')
})

// 监听 visible 变化，打开时初始化
watch(visible, (val) => {
  if (val) {
    currentIndex.value = props.initialIndex
    resetImageTransform()
    document.body.style.overflow = 'hidden'
    nextTick(() => {
      lightboxEl.value?.focus()
    })
  } else {
    document.body.style.overflow = ''
  }
})

// 关闭
function close() {
  visible.value = false
  resetImageTransform()
}

// 上一张
function prevPhoto() {
  if (!canPrev.value) return
  currentIndex.value--
  resetImageTransform()
}

// 下一张
function nextPhoto() {
  if (!canNext.value) return
  currentIndex.value++
  resetImageTransform()
}

// 重置图片变换
function resetImageTransform() {
  imgScale.value = 1
  imgTranslateX.value = 0
  imgTranslateY.value = 0
  isDragging.value = false
}

// 滚轮缩放
function onWheelZoom(e) {
  if (e.deltaY < 0) {
    imgScale.value = Math.min(imgScale.value + ZOOM_STEP, ZOOM_MAX)
  } else if (e.deltaY > 0) {
    imgScale.value = Math.max(imgScale.value - ZOOM_STEP, ZOOM_MIN)
  }
  // 缩小回原始大小时归位
  if (imgScale.value <= ZOOM_MIN) {
    imgTranslateX.value = 0
    imgTranslateY.value = 0
  }
}

// 拖拽开始
function onDragStart(e) {
  if (imgScale.value <= ZOOM_MIN) return
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  dragOrigX.value = imgTranslateX.value
  dragOrigY.value = imgTranslateY.value
}

// 拖拽移动
function onDragMove(e) {
  if (!isDragging.value) return
  const dx = (e.clientX - dragStartX.value) / imgScale.value
  const dy = (e.clientY - dragStartY.value) / imgScale.value
  imgTranslateX.value = dragOrigX.value + dx
  imgTranslateY.value = dragOrigY.value + dy
}

// 拖拽结束
function onDragEnd() {
  isDragging.value = false
}

// 键盘事件
function onKeydown(e) {
  if (!visible.value) return
  if (e.key === 'ArrowLeft') prevPhoto()
  if (e.key === 'ArrowRight') nextPhoto()
  if (e.key === 'Escape') close()
}

function onLightboxImgLoad() {
  // 大图加载完成
}

function onLightboxImgError() {
  console.warn('大图加载失败')
}

function goToDetail() {
  if (currentPhoto.value && currentPhoto.value.id) {
    visible.value = false
    router.push({ name: 'photoDetail', params: { id: currentPhoto.value.id } })
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ========== 灯箱 Lightbox ========== */
.lightbox {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
}

.lightbox-content {
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  animation: zoomIn 0.3s ease;
  transition: transform 0.12s ease-out;
  transform-origin: center center;
  cursor: zoom-in;
  user-select: none;
}

.lightbox-img.is-draggable {
  cursor: grab;
}

.lightbox-img.is-dragging {
  cursor: grabbing;
  transition: none;
}

/* 缩放百分比指示器 */
.zoom-indicator {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 14px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  border-radius: 12px;
  pointer-events: none;
  z-index: 11;
}

@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}

/* 关闭按钮 */
.lightbox-close {
  position: absolute;
  top: 16px;
  right: 20px;
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 左右箭头 */
.lightbox-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;
}

.lightbox-arrow-icon {
  width: 28px;
  height: 28px;
}

.lightbox-arrow:hover {
  background: rgba(255, 255, 255, 0.28);
}

.lightbox-prev { left: 20px; }
.lightbox-next { right: 20px; }

/* 底部信息栏 */
.lightbox-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
}

.lightbox-title {
  font-size: 17px;
  font-weight: 600;
}

.lightbox-exif {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.3px;
}

.lightbox-tag {
  padding: 2px 10px;
  background: rgba(55, 138, 221, 0.7);
  border-radius: 10px;
  font-size: 12px;
}

.lightbox-desc {
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 100px;
}

.lightbox-index {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  white-space: nowrap;
}

.lightbox-detail-link {
  color: #5DADE2;
  font-size: 13px;
  text-decoration: none;
  padding: 4px 12px;
  border: 1px solid rgba(93, 173, 226, 0.5);
  border-radius: 12px;
  transition: all 0.2s;
  cursor: pointer;
  white-space: nowrap;
}

.lightbox-detail-link:hover {
  background: rgba(93, 173, 226, 0.2);
  color: #fff;
}

/* 灯箱淡入淡出过渡 */
.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.3s ease;
}
.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}
</style>
