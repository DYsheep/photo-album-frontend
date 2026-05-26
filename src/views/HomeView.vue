<template>
  <div class="home">
    <section class="hero">
      <h1>我的摄影作品集</h1>
      <p>用镜头记录生活中的每一个精彩瞬间</p>
    </section>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        v-model="searchInput"
        type="text"
        placeholder="搜索照片标题、描述或标签..."
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
      <button v-if="hasActiveFilters" class="clear-btn" @click="clearAll">清除筛选</button>
    </div>

    <!-- 分类筛选 -->
    <div class="category-filter">
      <button
        v-for="cat in albumStore.categories"
        :key="cat"
        :class="{ active: albumStore.activeCategory === cat }"
        @click="albumStore.setCategory(cat)"
      >
        {{ cat }}
      </button>
    </div>

    <!-- 标签云 -->
    <TagCloud
      :tags="albumStore.tags"
      :activeTag="albumStore.activeTag"
      @select="albumStore.setTag"
    />

    <!-- 精选合集 -->
    <div class="featured-collections" v-if="recentCollections.length > 0">
      <div class="section-header">
        <h2 class="section-title">精选合集</h2>
        <router-link to="/collections" class="view-all">查看全部 <ArrowRight :size="14" class="inline-icon" /></router-link>
      </div>
      <div class="collection-row">
        <div
          v-for="col in recentCollections"
          :key="col.id"
          class="collection-mini-card"
          @click="$router.push({ name: 'collectionDetail', params: { id: col.id } })"
        >
          <div class="mini-cover">
            <img
              v-if="colCoverMap[col.id]"
              :src="colCoverMap[col.id]"
              :alt="col.name"
              class="mini-cover-img"
            />
            <div v-else class="mini-cover-placeholder">
              <EmojiIcon name="framed-picture" :size="36" />
            </div>
          </div>
          <div class="mini-body">
            <h4>{{ col.name }}</h4>
            <span>{{ col.photoCount || 0 }} 张照片</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 照片网格 -->
    <div class="photo-grid" v-if="!albumStore.isLoading">
      <div v-for="photo in albumStore.filteredPhotos" :key="photo.id" :id="'photo-' + photo.id">
        <PhotoCard
          :photo="photo"
        />
      </div>
      <div v-if="albumStore.filteredPhotos.length === 0" class="empty-hint">
        <p>暂无照片，快去上传你的作品吧！</p>
      </div>
    </div>
    <div v-else class="loading">加载中...</div>

    <!-- 全屏图片预览（Lightbox） -->
    <Lightbox
      v-model="lightboxVisible"
      :photos="albumStore.filteredPhotos"
      :initial-index="lightboxInitialIndex"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAlbumStore } from '../stores/album'
import { getCollectionsApi } from '../api/collection'
import { getPhotoDetailApi } from '../api/photo'
import { ArrowRight } from 'lucide-vue-next'
import PhotoCard from '../components/PhotoCard.vue'
import Lightbox from '../components/Lightbox.vue'
import TagCloud from '../components/TagCloud.vue'

const albumStore = useAlbumStore()
const route = useRoute()
const router = useRouter()

// 搜索状态
const searchInput = ref('')

// 是否有活跃筛选
const hasActiveFilters = computed(() => {
  return albumStore.activeCategory !== '全部' ||
    albumStore.activeTag !== '' ||
    albumStore.searchKeyword !== ''
})

// 灯箱状态
const lightboxVisible = ref(false)
const lightboxInitialIndex = ref(0)

// 精选合集
const recentCollections = ref([])
const colCoverMap = ref({})

async function loadRecentCollections() {
  try {
    const res = await getCollectionsApi()
    if (res.code === 200 && res.data) {
      // 取前 4 个合集
      recentCollections.value = (res.data || []).slice(0, 4)
      // 加载封面图
      for (const col of recentCollections.value) {
        if (col.coverPhotoId) {
          try {
            const photoRes = await getPhotoDetailApi(col.coverPhotoId)
            if (photoRes.code === 200 && photoRes.data) {
              colCoverMap.value[col.id] = photoRes.data.thumbnailUrl || photoRes.data.url || ''
            }
          } catch {
            // 封面加载失败
          }
        }
      }
    }
  } catch {
    recentCollections.value = []
  }
}

// 搜索
function handleSearch() {
  const keyword = searchInput.value.trim()
  if (keyword) {
    albumStore.searchPhotos(keyword)
  } else {
    albumStore.searchPhotos('')
  }
}

// 清除所有筛选
function clearAll() {
  searchInput.value = ''
  albumStore.clearFilters()
}

onMounted(async () => {
  await albumStore.loadCategories()
  await albumStore.loadTags()
  await albumStore.loadPhotos()
  loadRecentCollections()

  // 从详情页返回时滚动到对应照片
  const scrollToId = route.query.scrollTo
  if (scrollToId) {
    await nextTick()
    const el = document.getElementById('photo-' + scrollToId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
})
</script>

<style scoped>
.hero {
  text-align: center;
  padding: 48px 0 20px;
}

.hero h1 {
  font-size: 32px;
  color: var(--text-primary, #1a1a2e);
  margin-bottom: 12px;
}

.hero p {
  font-size: 16px;
  color: var(--text-regular, #666);
}

/* 搜索栏 */
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  justify-content: center;
}

.search-input {
  width: 360px;
  height: 40px;
  padding: 0 16px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #333);
}

.search-input:focus {
  border-color: var(--color-primary, #378ADD);
}

.search-btn {
  padding: 0 22px;
  height: 40px;
  border: none;
  border-radius: 20px;
  background: var(--color-primary, #378ADD);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-btn:hover {
  background: var(--color-primary-hover, #2B6FC4);
}

.clear-btn {
  padding: 0 18px;
  height: 40px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 20px;
  background: var(--bg-card, #fff);
  color: var(--text-muted, #888);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  border-color: var(--color-danger, #E24B4A);
  color: var(--color-danger, #E24B4A);
}

.category-filter {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.category-filter button {
  padding: 8px 20px;
  border-radius: 20px;
  border: 1.5px solid var(--border-color, #ddd);
  background: var(--bg-card, #fff);
  color: var(--text-regular, #555);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-filter button:hover {
  border-color: var(--color-primary, #378ADD);
  color: var(--color-primary, #378ADD);
}

.category-filter button.active {
  background: var(--color-primary, #378ADD);
  border-color: var(--color-primary, #378ADD);
  color: #fff;
}

/* 瀑布流布局 */
.photo-grid {
  column-count: 4;
  column-gap: 16px;
}

.photo-grid > * {
  break-inside: avoid;
  margin-bottom: 16px;
}

@media (max-width: 1024px) {
  .photo-grid { column-count: 2; }
}

@media (max-width: 600px) {
  .photo-grid { column-count: 1; }
}

.empty-hint {
  column-span: all;
  text-align: center;
  padding: 60px 0;
  color: var(--text-placeholder, #aaa);
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-muted, #888);
}

/* 精选合集 */
.featured-collections {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 20px;
  color: var(--text-primary, #1a1a2e);
  margin: 0;
  font-weight: 500;
}

.view-all {
  font-size: 14px;
  color: var(--color-primary, #378ADD);
  text-decoration: none;
  transition: color 0.2s;
}

.view-all:hover {
  color: var(--color-primary-hover, #2B6FC4);
}

.collection-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.collection-mini-card {
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-card, #fff);
  border: 0.5px solid var(--border-light, #eee);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.collection-mini-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));
}

.mini-cover {
  height: 140px;
  background: var(--bg-hover, #f5f5f5);
  overflow: hidden;
}

.mini-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.collection-mini-card:hover .mini-cover-img {
  transform: scale(1.05);
}

.mini-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-placeholder, #aaa);
}

.mini-body {
  padding: 12px 16px;
}

.mini-body h4 {
  font-size: 15px;
  color: var(--text-primary, #333);
  margin: 0 0 4px;
}

.mini-body span {
  font-size: 12px;
  color: var(--text-muted, #888);
}
</style>
