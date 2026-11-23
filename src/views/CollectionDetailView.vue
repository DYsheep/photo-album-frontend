<template>
  <div class="collection-detail">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">加载中...</div>

    <!-- 错误状态 -->
    <div v-else-if="errorMsg" class="error-state">
      <p><EmojiIcon name="warning" :size="18" class="icon-inline" /> {{ errorMsg }}</p>
      <router-link to="/collections" class="back-link">返回合集列表</router-link>
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 返回按钮 -->
      <div class="back-bar">
        <button class="back-btn" @click="goBack">
          <EmojiIcon name="left-arrow" :size="16" class="icon-inline" /> 返回合集列表
        </button>
      </div>

      <!-- 合集头部 -->
      <div class="collection-header">
        <h1 class="collection-name">{{ collectionName }}</h1>
        <p class="collection-desc" v-if="collectionDesc">{{ collectionDesc }}</p>
        <p class="photo-count">共 {{ photos.length }} 张照片</p>
      </div>

      <!-- 照片网格 -->
      <div class="photo-grid" v-if="photos.length > 0">
        <div
          v-for="photo in photos"
          :key="photo.id"
          :id="'photo-' + photo.id"
          :class="{ 'is-highlight': highlightId === photo.id }"
        >
          <PhotoCard
            :photo="photo"
            :route-query="{ collection: collectionId }"
            @click="rememberScrollPosition"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <EmojiIcon name="framed-picture" :size="64" />
        <p>此合集中暂无照片</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCollectionDetailApi, getCollectionsApi } from '../api/collection'
import EmojiIcon from '../components/EmojiIcon.vue'
import PhotoCard from '../components/PhotoCard.vue'
import { alignElementStable, restoreScrollYStable } from '../utils/scroll'

const route = useRoute()
const router = useRouter()
const collectionId = computed(() => route.params.id)

const loading = ref(true)
const errorMsg = ref('')
const collectionName = ref('')
const collectionDesc = ref('')
const photos = ref([])
/** 从详情页返回时高亮的照片 id（1.8 秒后自动清除） */
const highlightId = ref(null)

async function loadDetail() {
  loading.value = true
  errorMsg.value = ''
  try {
    const id = route.params.id
    const res = await getCollectionDetailApi(id)

    if (res.code === 200 && res.data) {
      photos.value = res.data || []
    } else {
      errorMsg.value = '加载合集失败'
      return
    }

    // 尝试从合集列表中获取名称和描述
    try {
      const colRes = await getCollectionsApi()
      if (colRes.code === 200 && colRes.data) {
        const col = colRes.data.find(c => String(c.id) === String(id))
        if (col) {
          collectionName.value = col.name || ''
          collectionDesc.value = col.description || ''
        }
      }
    } catch {
      /* ignore - collection metadata may not be loaded */
    }

    if (!collectionName.value) {
      collectionName.value = '合集详情'
    }
  } catch (err) {
    console.error('加载合集详情失败:', err)
    errorMsg.value = '合集不存在或已被删除'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/collections')
}

/**
 * 从详情页返回时定位
 *
 * 两种返回方式都要覆盖：
 *  1) 页面上的"返回合集"按钮 → URL 带 ?scrollTo=<照片 id>，定位到该照片并高亮；
 *  2) 浏览器后退 → 没有 query，用点进详情前记下的滚动高度恢复。
 * 合集是多列瀑布流且图片未预留高度，所以都交给 *Stable 系列函数在布局
 * 稳定前持续校正。
 */
function rememberScrollPosition() {
  try {
    sessionStorage.setItem('collectionScroll:' + collectionId.value, String(window.scrollY))
  } catch {
    /* 隐私模式下 sessionStorage 可能不可用，忽略即可 */
  }
}

async function restoreCollectionPosition() {
  await nextTick()

  const targetId = route.query.scrollTo
  if (targetId) {
    const el = document.getElementById('photo-' + targetId)
    if (el) {
      highlightId.value = Number(targetId)
      alignElementStable(el)
      window.setTimeout(() => { highlightId.value = null }, 1800)
      return
    }
  }

  try {
    const saved = Number(sessionStorage.getItem('collectionScroll:' + collectionId.value) || 0)
    if (saved > 0) restoreScrollYStable(saved)
  } catch {
    /* ignore */
  }
}

onMounted(async () => {
  await loadDetail()
  restoreCollectionPosition()
})
</script>

<style scoped>
.collection-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.back-bar {
  margin-bottom: 20px;
}



.collection-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 0.5px solid var(--border-light, #eee);
}

.collection-name {
  font-size: 28px;
  color: var(--text-primary, #1a1a2e);
  margin: 0 0 10px;
}

.collection-desc {
  font-size: 15px;
  color: var(--text-muted, #888);
  margin: 0 0 8px;
  line-height: 1.6;
}

.photo-count {
  font-size: 13px;
  color: var(--text-placeholder, #aaa);
  margin: 0;
}

.photo-grid {
  columns: 3;
  column-gap: 20px;
}
.photo-grid > div {
  break-inside: avoid;
  margin-bottom: 20px;
}

/* 从详情页返回时定位到刚才那张：滚动到位后短暂高亮，避免"跳过去但看不出是哪张" */
.photo-grid > div.is-highlight {
  border-radius: 12px;
  animation: return-highlight 1.8s ease-out 1;
}

@keyframes return-highlight {
  0% { box-shadow: 0 0 0 3px var(--color-primary, #378ADD); }
  70% { box-shadow: 0 0 0 3px var(--color-primary, #378ADD); }
  100% { box-shadow: 0 0 0 3px transparent; }
}

@media (max-width: 900px) {
  .photo-grid { columns: 2; }
}
@media (max-width: 560px) {
  .photo-grid { columns: 1; }
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: var(--text-placeholder, #aaa);
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
}

.loading-state {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted, #888);
  font-size: 16px;
}

.error-state {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted, #888);
}

.error-state p {
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
</style>
