<template>
  <div class="share-page" v-if="shareData">
    <!-- 顶栏 -->
    <header class="share-topbar">
      <router-link to="/" class="back-link">
        <EmojiIcon name="left-arrow" :size="16" class="icon-inline" /> 回到首页
      </router-link>
    </header>

    <!-- 照片大图 -->
    <!-- 合集分享：合集信息 + 照片网格（是否含私密由分享设置决定，deny 命中的照片不会出现） -->
    <main v-if="isCollection" class="share-body share-collection">
      <header class="collection-head">
        <h1 class="collection-title">{{ shareData.collectionName }}</h1>
        <p v-if="shareData.collectionDescription" class="collection-desc">{{ shareData.collectionDescription }}</p>
        <p class="collection-count">
          {{ (shareData.photos || []).length }} 张照片<template v-if="shareData.includePrivate === 1"> · 含私密</template>
        </p>
      </header>

      <div class="collection-grid" v-if="(shareData.photos || []).length">
        <a
          v-for="p in shareData.photos"
          :key="p.id"
          :href="p.url"
          target="_blank"
          rel="noopener"
          class="collection-item"
        >
          <img :src="p.thumbnailUrl || p.url" :alt="p.title" loading="lazy" decoding="async" />
          <span class="collection-item-title">{{ p.title }}</span>
        </a>
      </div>
      <p v-else class="collection-empty">该分享暂无可见照片</p>
    </main>

    <main v-else class="share-body">
      <div class="photo-stage">
        <img
          :src="shareData.photoUrl"
          :alt="shareData.title"
          class="photo-image"
          @load="imageLoaded = true"
        />
        <div v-if="!imageLoaded" class="image-loading">加载中...</div>
      </div>

      <!-- 信息面板 -->
      <div class="info-panel">
        <h1 class="photo-title">{{ shareData.title }}</h1>

        <p v-if="shareData.description" class="photo-desc">{{ shareData.description }}</p>

        <!-- EXIF 参数 -->
        <div class="exif-block" v-if="hasExif">
          <h3 class="exif-heading">拍摄参数</h3>
          <div class="exif-grid">
            <div class="exif-item" v-if="shareData.cameraModel">
              <span class="exif-label">相机</span>
              <span class="exif-value">{{ shareData.cameraModel }}</span>
            </div>
            <div class="exif-item" v-if="shareData.aperture">
              <span class="exif-label">光圈</span>
              <span class="exif-value">f/{{ shareData.aperture }}</span>
            </div>
            <div class="exif-item" v-if="shareData.shutterSpeed">
              <span class="exif-label">快门</span>
              <span class="exif-value">{{ shareData.shutterSpeed }}</span>
            </div>
            <div class="exif-item" v-if="shareData.iso">
              <span class="exif-label">ISO</span>
              <span class="exif-value">{{ shareData.iso }}</span>
            </div>
            <div class="exif-item" v-if="shareData.focalLength">
              <span class="exif-label">焦距</span>
              <span class="exif-value">{{ shareData.focalLength }}</span>
            </div>
          </div>
        </div>

        <!-- 拍摄日期 -->
        <div class="date-info" v-if="shareData.dateTaken">
          <EmojiIcon name="calendar" :size="14" class="icon-inline" />
          <span>{{ formatDate(shareData.dateTaken) }}</span>
        </div>
      </div>
    </main>

    <!-- 底部 -->
    <footer class="share-footer">
      <p>由 <strong>摄影相册</strong> 分享</p>
    </footer>
  </div>

  <!-- 需要访问口令（合集分享设置了口令时） -->
  <div v-else-if="needCode" class="share-loading code-panel">
    <EmojiIcon name="lock" :size="36" />
    <h2>需要访问口令</h2>
    <input
      v-model="accessCodeInput"
      type="password"
      placeholder="请输入访问口令"
      @keyup.enter="submitCode"
    />
    <button class="btn-primary btn-sm" @click="submitCode">查看</button>
    <p v-if="codeError" class="code-error">{{ codeError }}</p>
  </div>

  <!-- 加载状态 -->
  <div v-else-if="loading" class="share-loading">
    <p>加载中...</p>
  </div>

  <!-- 错误状态 -->
  <div v-else class="share-error">
    <EmojiIcon name="warning" :size="40" />
    <h2>链接无效</h2>
    <p>此分享链接不存在或已失效</p>
    <router-link to="/" class="home-link">回到首页</router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getShareLinkApi } from '../api/share'
import { formatDate } from '../utils/format'
import EmojiIcon from '../components/EmojiIcon.vue'

const route = useRoute()
const shareData = ref(null)
const loading = ref(true)
const imageLoaded = ref(false)

const code = computed(() => route.params.code)

const hasExif = computed(() => {
  if (!shareData.value) return false
  return !!(shareData.value.cameraModel || shareData.value.aperture ||
    shareData.value.shutterSpeed || shareData.value.iso || shareData.value.focalLength)
})

async function loadShare() {
  loading.value = true
  try {
    const res = await getShareLinkApi(code.value, accessCode.value)
    if (res.code === 200 && res.data) {
      shareData.value = res.data
      document.title = `${res.data.title || '分享照片'} - 摄影相册`
    } else {
      shareData.value = null
    }
  } catch (err) {
    // 403 = 需要访问口令（未填写或不正确）
    if (err?.response?.status === 403) {
      needCode.value = true
      codeError.value = accessCode.value ? '口令不正确，请重试' : ''
      shareData.value = null
      return
    }
    console.error('加载分享数据失败:', err)
    shareData.value = null
  } finally {
    loading.value = false
  }
}

/** 提交口令后重新加载 */
function submitCode() {
  codeError.value = ''
  if (!accessCodeInput.value) {
    codeError.value = '请输入访问口令'
    return
  }
  accessCode.value = accessCodeInput.value.trim()
  needCode.value = false
  loadShare()
}

onMounted(() => {
  loadShare()
})
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: #0d0d0d;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 顶栏 */
.share-topbar {
  width: 100%;
  max-width: 900px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #999;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.back-link:hover {
  color: #fff;
}

/* 主体 */
.share-body {
  flex: 1;
  width: 100%;
  max-width: 900px;
  padding: 0 24px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 照片大图 */
.photo-stage {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  background: #1a1a1a;
  min-height: 300px;
  position: relative;
}

.photo-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  display: block;
}

.image-loading {
  position: absolute;
  color: #666;
  font-size: 14px;
}

/* 信息面板 */
.info-panel {
  width: 100%;
  max-width: 640px;
  margin-top: 32px;
  text-align: center;
}

.photo-title {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 12px;
  line-height: 1.3;
}

.photo-desc {
  font-size: 15px;
  color: #aaa;
  line-height: 1.7;
  margin: 0 0 28px;
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}

/* EXIF 参数 */
.exif-block {
  margin: 28px 0;
  padding: 24px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.08);
}

.exif-heading {
  font-size: 13px;
  font-weight: 500;
  color: #777;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0 0 20px;
}

.exif-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.exif-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exif-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.exif-value {
  font-size: 16px;
  color: #e0e0e0;
  font-weight: 500;
}

/* 拍摄日期 */
.date-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #777;
  margin-top: 8px;
}

/* 底部 */
.share-footer {
  width: 100%;
  max-width: 900px;
  padding: 24px;
  text-align: center;
  border-top: 0.5px solid rgba(255, 255, 255, 0.06);
}

.share-footer p {
  font-size: 13px;
  color: #555;
  margin: 0;
}

.share-footer strong {
  color: #777;
}

/* 加载 & 错误 */
.share-loading,
.share-error {
  min-height: 100vh;
  background: #0d0d0d;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.share-error h2 {
  font-size: 22px;
  margin: 12px 0 4px;
  color: #ccc;
}

.share-error p {
  color: #777;
  margin: 0;
}

.home-link {
  margin-top: 16px;
  padding: 10px 28px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #ccc;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}

.home-link:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

/* 响应式 */
@media (max-width: 640px) {
  .share-body {
    padding: 0 16px 32px;
  }

  .photo-title {
    font-size: 22px;
  }

  .exif-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .exif-block {
    padding: 16px;
  }
}

/* ========== 合集分享（沿用本页暗色风格） ========== */
.share-collection {
  max-width: 1100px;
  width: 100%;
  padding: 8px 24px 32px;
}

.collection-head {
  text-align: center;
  margin: 8px 0 20px;
}

.collection-title {
  font-size: 24px;
  color: #f5f5f5;
  margin: 0 0 8px;
}

.collection-desc {
  font-size: 14px;
  line-height: 1.7;
  color: #a8a8a8;
  margin: 0 0 6px;
}

.collection-count {
  font-size: 12px;
  color: #7a7a7a;
  margin: 0;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.collection-item {
  display: block;
  border-radius: 10px;
  overflow: hidden;
  background: #1a1a1a;
  text-decoration: none;
}

.collection-item img {
  width: 100%;
  display: block;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.collection-item-title {
  display: block;
  padding: 6px 8px;
  font-size: 12px;
  color: #c8c8c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-empty {
  text-align: center;
  color: #7a7a7a;
  padding: 40px 0;
}

/* 口令面板 */
.code-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
}

.code-panel h2 {
  font-size: 18px;
  color: #e0e0e0;
  margin: 0;
}

.code-panel input {
  min-width: 240px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: #e0e0e0;
  font-size: 14px;
}

.code-error {
  color: #e88;
  font-size: 13px;
  margin: 0;
}

@media (max-width: 480px) {
  .share-collection { padding: 8px 12px 24px; }
  .collection-title { font-size: 20px; }
  .collection-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
}
</style>
