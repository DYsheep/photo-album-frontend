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
        <div v-for="photo in photos" :key="photo.id">
          <PhotoCard :photo="photo" :route-query="{ collection: collectionId }" />
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCollectionDetailApi, getCollectionsApi } from '../api/collection'
import EmojiIcon from '../components/EmojiIcon.vue'
import PhotoCard from '../components/PhotoCard.vue'

const route = useRoute()
const router = useRouter()
const collectionId = computed(() => route.params.id)

const loading = ref(true)
const errorMsg = ref('')
const collectionName = ref('')
const collectionDesc = ref('')
const photos = ref([])

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

onMounted(() => {
  loadDetail()
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
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
