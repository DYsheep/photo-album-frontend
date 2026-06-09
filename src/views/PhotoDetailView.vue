<template>
  <div class="photo-detail" v-if="photo">
    <!-- 返回按钮 -->
    <div class="back-bar">
      <button class="back-btn" @click="goBack"><EmojiIcon name="left-arrow" :size="16" class="icon-inline" /> 返回首页</button>
    </div>

    <!-- 主体：左图右信息 -->
    <div class="detail-body">
      <!-- 左侧大图 -->
      <div class="detail-image-area" @click="openLightbox" title="点击放大查看">
        <button class="side-nav side-prev" @click.stop="goPrev" :disabled="!canPrev" title="上一张"><ChevronLeft /></button>
        <img
          :src="photo.url"
          :alt="photo.title"
          class="detail-image"
          :class="{ clickable: true }"
          @load="imageLoaded = true"
        />
        <div v-if="!imageLoaded" class="image-loading">加载中...</div>
        <button class="side-nav side-next" @click.stop="goNext" :disabled="!canNext" title="下一张"><ChevronRight /></button>
      </div>

      <!-- 右侧信息面板 -->
      <div class="detail-panel">
        <!-- 标题 -->
        <h1 class="detail-title">{{ photo.title }}</h1>

        <!-- 点赞 -->
        <div class="detail-like-row">
          <button class="heart-btn" @click="handleLike" :class="{ liked: liked }" :disabled="liking">
            <svg class="heart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{{ photo.likeCount || 0 }}</span>
          </button>
        </div>

        <!-- 分类 + 拍摄日期 -->
        <div class="detail-meta">
          <span v-if="photo.categoryName" class="meta-category">{{ photo.categoryName }}</span>
          <span v-if="photo.dateTaken" class="meta-date">{{ formatDate(photo.dateTaken) }}</span>
          <span v-if="isAdmin" class="private-switch">
            <el-switch v-model="privateState" active-text="私密" inactive-text="公开" size="small" @change="togglePrivate" :loading="privateSaving" />
          </span>
        </div>

        <!-- EXIF 结构化面板 -->
        <div class="exif-panel" v-if="hasExif">
          <h3 class="section-title">拍摄信息</h3>
          <table class="exif-table">
            <tr v-if="photo.cameraModel">
              <td class="exif-label">相机型号</td>
              <td class="exif-value">{{ photo.cameraModel }}</td>
            </tr>
            <tr v-if="photo.aperture">
              <td class="exif-label">光圈</td>
              <td class="exif-value">f/{{ photo.aperture }}</td>
            </tr>
            <tr v-if="photo.shutterSpeed">
              <td class="exif-label">快门</td>
              <td class="exif-value">{{ photo.shutterSpeed }}</td>
            </tr>
            <tr v-if="photo.iso">
              <td class="exif-label">ISO</td>
              <td class="exif-value">{{ photo.iso }}</td>
            </tr>
            <tr v-if="photo.focalLength">
              <td class="exif-label">焦距</td>
              <td class="exif-value">{{ photo.focalLength }}</td>
            </tr>
          </table>
        </div>

        <!-- 标签列表 -->
        <div class="tags-section" v-if="tagList.length > 0">
          <h3 class="section-title">标签</h3>
          <div class="tags-list">
            <span v-for="tag in tagList" :key="tag" class="el-tag-custom">{{ tag }}</span>
          </div>
        </div>

        <!-- 描述 -->
        <div class="desc-section" v-if="photo.description">
          <h3 class="section-title">描述</h3>
          <p class="desc-text">{{ photo.description }}</p>
        </div>

        <!-- 浏览量 + 文件大小 -->
        <div class="detail-stats">
          <span class="stat-item">
            <EmojiIcon name="eye" :size="15" class="icon-inline" /> {{ photo.viewCount || 0 }} 次浏览
          </span>
          <span class="stat-item">
            <EmojiIcon name="floppy-disk" :size="15" class="icon-inline" /> {{ formatFileSize(photo.fileSize) }}
          </span>
        </div>

        <!-- 分享按钮 -->
        <ShareButton :photo-id="photo.id" />
      </div>
    </div>

    <!-- 底部导航 -->
    <div class="bottom-nav">
      <button @click="goPrev" :disabled="!canPrev" class="nav-btn-large"><ChevronLeft :size="16" /> 上一张</button>
      <span class="nav-position">{{ navIndex }} / {{ navTotal }}</span>
      <button @click="goNext" :disabled="!canNext" class="nav-btn-large">下一张 <ChevronRight :size="16" /></button>
    </div>
  </div>

  <!-- 加载状态 -->
  <div v-else-if="loading" class="detail-loading">加载中...</div>

  <!-- 错误状态 -->
  <div v-else class="detail-error">
    <p><EmojiIcon name="warning" :size="18" class="icon-inline" /> 照片不存在或已被删除</p>
    <router-link to="/" class="back-link">返回首页</router-link>
  </div>

  <!-- 全屏灯箱 -->
  <Lightbox v-model="lightboxVisible" :photos="lightboxPhotos" :initial-index="0" />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPhotoDetailApi, getAdjacentPhotosApi, updatePhotoApi, likePhotoApi } from '../api/photo'
import { getCollectionAdjacentApi } from '../api/collection'
import { useAuthStore } from '../stores/auth'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { formatDate, formatFileSize } from '../utils/format'
import EmojiIcon from '../components/EmojiIcon.vue'
import Lightbox from '../components/Lightbox.vue'
import ShareButton from '../components/ShareButton.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)
const collectionCtx = computed(() => route.query.collection || null)

const photo = ref(null)
const loading = ref(true)
const imageLoaded = ref(false)
const privateState = ref(false)
const privateSaving = ref(false)
const liking = ref(false)
const liked = ref(false)
const adjacentIds = ref([])
const currentId = computed(() => Number(route.params.id))

// 灯箱
const lightboxVisible = ref(false)
const lightboxPhotos = computed(() => photo.value ? [photo.value] : [])

function openLightbox() {
  if (!photo.value) return
  lightboxVisible.value = true
}

function goBack() {
  router.push({ path: '/', query: { scrollTo: currentId.value } })
}

// 标签列表
const tagList = computed(() => {
  if (!photo.value || !photo.value.tags) return []
  return photo.value.tags.split(',').map(t => t.trim()).filter(t => t)
})

// EXIF 是否有数据
const hasExif = computed(() => {
  if (!photo.value) return false
  return !!(photo.value.cameraModel || photo.value.aperture ||
    photo.value.shutterSpeed || photo.value.iso || photo.value.focalLength)
})

// 导航位置
const navIndex = computed(() => {
  const idx = adjacentIds.value.indexOf(currentId.value)
  return idx >= 0 ? idx + 1 : '-'
})

const navTotal = computed(() => adjacentIds.value.length)

const canPrev = computed(() => {
  return adjacentIds.value[0] !== currentId.value && adjacentIds.value.length > 1
})

const canNext = computed(() => {
  return adjacentIds.value[adjacentIds.value.length - 1] !== currentId.value
})

// 加载照片详情和相邻照片列表
async function loadPhoto() {
  loading.value = true
  imageLoaded.value = false
  try {
    const res = await getPhotoDetailApi(currentId.value)
    if (res.code === 200 && res.data) {
      photo.value = res.data
      privateState.value = res.data.isPrivate === 1
      liked.value = !!localStorage.getItem(`liked_${res.data.id}`)
      // 同时加载相邻照片 ID 列表（用于上下张导航）
      await loadAdjacentIds()
    } else {
      photo.value = null
    }
  } catch (err) {
    console.error('加载照片详情失败:', err)
    photo.value = null
  } finally {
    loading.value = false
  }
}

// 获取相邻照片 ID（上一张/下一张）
async function loadAdjacentIds() {
  try {
    let res
    if (collectionCtx.value) {
      res = await getCollectionAdjacentApi(collectionCtx.value, currentId.value)
    } else {
      res = await getAdjacentPhotosApi(currentId.value)
    }
    if (res.code === 200 && res.data) {
      const { prevId, nextId } = res.data
      adjacentIds.value = [
        ...(prevId ? [prevId] : []),
        currentId.value,
        ...(nextId ? [nextId] : [])
      ]
    }
  } catch (err) {
    console.error('加载相邻照片失败:', err)
    adjacentIds.value = [currentId.value]
  }
}

// 上一张
function goPrev() {
  const idx = adjacentIds.value.indexOf(currentId.value)
  if (idx > 0) {
    const prevId = adjacentIds.value[idx - 1]
    const q = collectionCtx.value ? { collection: collectionCtx.value } : {}
    router.push({ name: 'photoDetail', params: { id: prevId }, query: q })
  }
}

// 下一张
function goNext() {
  const idx = adjacentIds.value.indexOf(currentId.value)
  if (idx >= 0 && idx < adjacentIds.value.length - 1) {
    const nextId = adjacentIds.value[idx + 1]
    const q = collectionCtx.value ? { collection: collectionCtx.value } : {}
    router.push({ name: 'photoDetail', params: { id: nextId }, query: q })
  }
}

// 监听路由参数变化
watch(() => route.params.id, (newId) => {
  if (newId) loadPhoto()
})

// 切换私密状态
async function togglePrivate() {
  if (!photo.value) return
  privateSaving.value = true
  try {
    await updatePhotoApi(photo.value.id, { isPrivate: privateState.value ? 1 : 0 })
    photo.value.isPrivate = privateState.value ? 1 : 0
  } catch (err) {
    console.error('切换私密失败:', err)
    privateState.value = !privateState.value // 回滚
  } finally {
    privateSaving.value = false
  }
}

async function handleLike() {
  if (!photo.value || liking.value) return
  liking.value = true
  try {
    const res = await likePhotoApi(photo.value.id)
    if (res.code === 200) {
      photo.value.likeCount = res.data
      liked.value = true
      localStorage.setItem(`liked_${photo.value.id}`, '1')
    }
  } catch (err) {
    console.error('点赞失败:', err)
  } finally {
    liking.value = false
  }
}

onMounted(() => {
  loadPhoto()
})
</script>

<style scoped>
.photo-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px;
}

.detail-body {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

/* 返回按钮 */
.back-bar {
  margin-bottom: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 8px;
  background: var(--bg-card, #fff);
  color: var(--text-regular, #555);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: var(--color-primary, #378ADD);
  color: var(--color-primary, #378ADD);
  background: var(--color-primary-light, #F5FAFF);
}

/* 左侧大图 */
.detail-image-area {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover, #f8f8f8);
  border-radius: 12px;
  overflow: hidden;
  min-height: 400px;
}

.detail-image {
  max-width: 80vw;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
  cursor: zoom-in;
}

.image-loading {
  position: absolute;
  color: #aaa;
  font-size: 14px;
}

/* 图片两侧导航箭头 */
.side-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.side-nav:hover:not(:disabled) {
  background: #378ADD;
  color: #fff;
  box-shadow: 0 4px 14px rgba(55, 138, 221, 0.35);
}

.side-nav:disabled {
  opacity: 0.2;
  cursor: default;
}

.side-prev {
  left: 16px;
}

.side-next {
  right: 16px;
}

/* 右侧面板 */
.detail-panel {
  width: 380px;
  flex-shrink: 0;
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 28px;
  box-shadow: var(--shadow-sm, 0 2px 16px rgba(0, 0, 0, 0.06));
  border: 0.5px solid var(--border-light, #eee);
}

.detail-title {
  font-size: 24px;
  color: var(--text-primary, #1a1a2e);
  margin: 0 0 6px;
  line-height: 1.3;
}

.detail-like-row { margin-bottom: 14px; }
.heart-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #dfe1e5);
  border-radius: 24px;
  padding: 8px 18px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-muted, #888);
  transition: all 0.2s;
}
.heart-btn:hover { border-color: #F56C6C; color: #F56C6C; background: rgba(245,108,108,0.04); }
.heart-btn.liked { border-color: #F56C6C; color: #F56C6C; }
.heart-btn.liked .heart-icon { fill: #F56C6C; stroke: #F56C6C; }
.heart-btn:disabled { opacity: 0.7; cursor: default; }
.heart-icon { width: 20px; height: 20px; flex-shrink: 0; }

.detail-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.meta-category {
  display: inline-block;
  padding: 3px 12px;
  background: var(--color-primary-light, #E6F1FB);
  color: var(--color-primary-dark, #185FA5);
  border-radius: 12px;
  font-size: 13px;
}

.meta-date {
  font-size: 13px;
  color: var(--text-muted, #888);
}

/* EXIF 面板 */
.exif-panel {
  margin-bottom: 22px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-regular, #555);
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-lighter, #f0f0f0);
}

.exif-table {
  width: 100%;
  border-collapse: collapse;
}

.exif-table tr {
  border-bottom: 0.5px solid var(--border-lighter, #f5f5f5);
}

.exif-table td {
  padding: 7px 0;
  font-size: 13px;
}

.exif-label {
  color: var(--text-muted, #888);
  width: 80px;
}

.exif-value {
  color: var(--text-secondary, #333);
}

/* 标签 */
.tags-section {
  margin-bottom: 22px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.el-tag-custom {
  display: inline-block;
  padding: 3px 12px;
  background: var(--bg-hover, #f0f0f0);
  color: var(--text-regular, #555);
  border-radius: 12px;
  font-size: 12px;
}

/* 描述 */
.desc-section {
  margin-bottom: 22px;
}

.desc-text {
  font-size: 14px;
  color: var(--text-regular, #666);
  line-height: 1.7;
  margin: 0;
}

/* 统计信息 */
.detail-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-item {
  font-size: 13px;
  color: var(--text-muted, #888);
}

/* 底部导航 */
.bottom-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-top: 32px;
  padding: 20px 0;
}

.nav-btn-large {
  padding: 10px 28px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 8px;
  background: var(--bg-card, #fff);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-regular, #555);
}

.nav-btn-large:hover:not(:disabled) {
  border-color: var(--color-primary, #378ADD);
  color: var(--color-primary, #378ADD);
}

.nav-btn-large:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.nav-position {
  font-size: 14px;
  color: var(--text-muted, #999);
  min-width: 60px;
  text-align: center;
}

/* 加载和错误状态 */
.detail-loading {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted, #888);
  font-size: 16px;
}

.detail-error {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted, #888);
}

.detail-error p {
  font-size: 16px;
  margin-bottom: 16px;
}

.back-link {
  color: var(--color-primary, #378ADD);
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

/* 响应式：小屏上下排列 */
@media (max-width: 768px) {
  .photo-detail {
    padding: 12px 8px;
  }

  .back-bar {
    margin-bottom: 10px;
  }

  .back-btn {
    padding: 6px 14px;
    font-size: 13px;
  }

  .detail-body {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .detail-image-area {
    min-height: 260px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-image {
    width: auto;
    height: auto;
    display: block;
    max-width: 100%;
    max-height: 60vh;
  }

  /* 手机端侧边导航缩小并靠边 */
  .side-nav {
    width: 32px;
    height: 32px;
  }
  .side-prev { left: 6px; }
  .side-next { right: 6px; }

  .detail-panel {
    width: 100%;
    border-radius: 12px;
    padding: 18px 14px;
  }

  .detail-title {
    font-size: 20px;
    margin-bottom: 10px;
  }

  /* 底部导航全宽大按钮 */
  .bottom-nav {
    gap: 12px;
    margin-top: 20px;
    padding: 12px 0;
    flex-wrap: nowrap;
  }

  .nav-btn-large {
    flex: 1;
    padding: 14px 12px;
    font-size: 14px;
    justify-content: center;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .nav-position {
    min-width: 50px;
    font-size: 12px;
  }
}
</style>
