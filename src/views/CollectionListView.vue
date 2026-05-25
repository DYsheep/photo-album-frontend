<template>
  <div class="collection-list">
    <h1 class="page-title">照片合集</h1>
    <p class="page-desc">精选照片系列，按主题浏览</p>

    <!-- 合集网格 -->
    <div class="collection-grid" v-if="!loading">
      <div
        v-for="collection in collections"
        :key="collection.id"
        class="collection-card"
        @click="goDetail(collection.id)"
      >
        <div class="card-cover">
          <img
            v-if="coverPhotoMap[collection.id]"
            :src="coverPhotoMap[collection.id]"
            :alt="collection.name"
            class="cover-img"
          />
          <div v-else class="cover-placeholder">
            <EmojiIcon name="framed-picture" :size="48" />
          </div>
          <div class="photo-count-badge">
            <EmojiIcon name="camera" :size="14" class="icon-inline" />
            {{ collection.photoCount || 0 }}
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-name">{{ collection.name }}</h3>
          <p class="card-desc" v-if="collection.description">{{ collection.description }}</p>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="collections.length === 0" class="empty-state">
        <EmojiIcon name="framed-picture" :size="64" />
        <p>暂无合集</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <p>加载中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCollectionsApi } from '../api/collection'
import { getPhotoDetailApi } from '../api/photo'
import EmojiIcon from '../components/EmojiIcon.vue'

const router = useRouter()
const collections = ref([])
const loading = ref(true)
const coverPhotoMap = ref({})

async function loadCollections() {
  loading.value = true
  try {
    const res = await getCollectionsApi()
    if (res.code === 200 && res.data) {
      collections.value = res.data
      // 加载封面图
      for (const col of collections.value) {
        if (col.coverPhotoId) {
          try {
            const photoRes = await getPhotoDetailApi(col.coverPhotoId)
            if (photoRes.code === 200 && photoRes.data) {
              coverPhotoMap.value[col.id] = photoRes.data.thumbnailUrl || photoRes.data.url || ''
            }
          } catch {
            // 封面加载失败，使用占位图
          }
        }
      }
    }
  } catch (err) {
    console.error('加载合集列表失败:', err)
    collections.value = []
  } finally {
    loading.value = false
  }
}

function goDetail(id) {
  router.push({ name: 'collectionDetail', params: { id } })
}

onMounted(() => {
  loadCollections()
})
</script>

<style scoped>
.collection-list {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 28px;
  color: var(--text-primary, #1a1a2e);
  margin-bottom: 8px;
}

.page-desc {
  font-size: 15px;
  color: var(--text-muted, #888);
  margin-bottom: 32px;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.collection-card {
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-card, #fff);
  border: 0.5px solid var(--border-light, #eee);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.collection-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));
}

.card-cover {
  position: relative;
  height: 200px;
  background: var(--bg-hover, #f5f5f5);
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.collection-card:hover .cover-img {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-placeholder, #aaa);
}

.photo-count-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-body {
  padding: 16px;
}

.card-name {
  font-size: 16px;
  color: var(--text-primary, #1a1a2e);
  margin: 0 0 6px;
}

.card-desc {
  font-size: 13px;
  color: var(--text-muted, #888);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-state {
  grid-column: 1 / -1;
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
  padding: 60px 0;
  color: var(--text-muted, #888);
}
</style>
