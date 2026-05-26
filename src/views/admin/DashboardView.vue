<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <EmojiIcon name="framed-picture" class="stat-icon" :size="32" />
        <div class="stat-info">
          <span class="stat-number">{{ stats.totalPhotos }}</span>
          <span class="stat-label">总照片数</span>
        </div>
      </div>
      <div class="stat-card">
        <EmojiIcon name="file-folder" class="stat-icon" :size="32" />
        <div class="stat-info">
          <span class="stat-number">{{ stats.totalCategories }}</span>
          <span class="stat-label">分类数量</span>
        </div>
      </div>
      <div class="stat-card">
        <EmojiIcon name="eye" class="stat-icon" :size="32" />
        <div class="stat-info">
          <span class="stat-number">{{ stats.totalViews }}</span>
          <span class="stat-label">总浏览量</span>
        </div>
      </div>
      <div class="stat-card">
        <EmojiIcon name="floppy-disk" class="stat-icon" :size="32" />
        <div class="stat-info">
          <span class="stat-number">{{ stats.storageUsed }}</span>
          <span class="stat-label">存储用量</span>
        </div>
      </div>
    </div>

    <!-- 最近上传 -->
    <section class="recent-section">
      <h3>最近上传</h3>
      <div class="recent-list" v-if="stats.recentPhotos.length > 0">
        <div v-for="photo in stats.recentPhotos" :key="photo.id" class="recent-item">
          <div class="recent-thumb">
            <img v-if="photo.url" :src="photo.thumbnailUrl || photo.url" alt="" class="recent-img" />
            <EmojiIcon v-else name="camera" :size="20" />
          </div>
          <div class="recent-info">
            <strong>{{ photo.title }}</strong>
            <span>{{ photo.categoryName }} &middot; {{ photo.createdAt?.substring(0, 10) }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">暂无照片，去上传吧！</div>
    </section>

    <!-- 操作快捷入口 -->
    <section class="quick-actions">
      <h3>快捷操作</h3>
      <div class="action-buttons">
        <router-link to="/admin/upload" class="action-btn primary">
          <EmojiIcon name="outbox-tray" :size="22" class="icon-inline" /> 上传新图片
        </router-link>
        <router-link to="/admin/photos" class="action-btn">
          <EmojiIcon name="framed-picture" :size="22" class="icon-inline" /> 管理照片
        </router-link>
        <router-link to="/admin/categories" class="action-btn">
          <EmojiIcon name="file-folder" :size="22" class="icon-inline" /> 管理分类
        </router-link>
      </div>
    </section>

    <!-- EXIF 统计分析 -->
    <section class="exif-section" v-if="hasExifData">
      <div class="section-header" @click="exifExpanded = !exifExpanded">
        <h3>EXIF 数据分析</h3>
        <span class="toggle-icon"><ChevronDown v-if="!exifExpanded" :size="16" /><ChevronUp v-else :size="16" /></span>
      </div>

      <div v-show="exifExpanded" class="exif-grid">
        <!-- 焦段偏好 -->
        <div class="exif-card" v-if="focalLengthList.length > 0">
          <h4>焦段偏好</h4>
          <div class="bar-chart">
            <div
              v-for="item in focalLengthList"
              :key="item.name"
              class="bar-row"
            >
              <span class="bar-label">{{ item.name }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: barWidth(item.count, focalLengthMax) }"
                ></div>
              </div>
              <span class="bar-value">{{ item.count }}</span>
            </div>
          </div>
        </div>

        <!-- 相机设备 -->
        <div class="exif-card" v-if="cameraList.length > 0">
          <h4>相机设备</h4>
          <div class="camera-grid">
            <div
              v-for="item in cameraList"
              :key="item.name"
              class="camera-item"
            >
              <EmojiIcon name="camera" :size="18" class="camera-icon" />
              <span class="camera-name">{{ item.name }}</span>
              <span class="camera-count">{{ item.count }} 张</span>
            </div>
          </div>
        </div>

        <!-- ISO 分布 -->
        <div class="exif-card" v-if="isoList.length > 0">
          <h4>ISO 分布</h4>
          <div class="bar-chart">
            <div
              v-for="item in isoList"
              :key="item.name"
              class="bar-row"
            >
              <span class="bar-label">ISO {{ item.name }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill iso-fill"
                  :style="{ width: barWidth(item.count, isoMax) }"
                ></div>
              </div>
              <span class="bar-value">{{ item.count }}</span>
            </div>
          </div>
        </div>

        <!-- 拍摄年份 -->
        <div class="exif-card" v-if="yearList.length > 0">
          <h4>拍摄年份</h4>
          <div class="bar-chart">
            <div
              v-for="item in yearList"
              :key="item.name"
              class="bar-row"
            >
              <span class="bar-label">{{ item.name }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill year-fill"
                  :style="{ width: barWidth(item.count, yearMax) }"
                ></div>
              </div>
              <span class="bar-value">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 无 EXIF 数据提示 -->
    <section class="exif-section" v-else>
      <div class="section-header">
        <h3>EXIF 数据分析</h3>
      </div>
      <div class="exif-empty">暂无数据</div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { getDashboardStatsApi } from '../../api/photo'
import EmojiIcon from '../../components/EmojiIcon.vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

// 统计数据（从后端 API 获取）
const stats = reactive({
  totalPhotos: 0,
  totalCategories: 0,
  totalViews: 0,
  storageUsed: '0 B',
  recentPhotos: [],
  exifStats: null
})

const exifExpanded = ref(false)

// EXIF 数据是否存在
const hasExifData = computed(() => {
  if (!stats.exifStats) return false
  const es = stats.exifStats
  const fl = es.focalLengths && Object.keys(es.focalLengths).length > 0
  const cm = es.cameras && Object.keys(es.cameras).length > 0
  const is = es.isos && Object.keys(es.isos).length > 0
  const yr = es.yearDistribution && Object.keys(es.yearDistribution).length > 0
  return fl || cm || is || yr
})

// 排序后的数据列表
function sortedEntries(obj) {
  if (!obj) return []
  return Object.entries(obj)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

const focalLengthList = computed(() => sortedEntries(stats.exifStats?.focalLengths))
const cameraList = computed(() => sortedEntries(stats.exifStats?.cameras))
const isoList = computed(() => sortedEntries(stats.exifStats?.isos))
const yearList = computed(() => sortedEntries(stats.exifStats?.yearDistribution))

const focalLengthMax = computed(() => maxCount(focalLengthList.value))
const isoMax = computed(() => maxCount(isoList.value))
const yearMax = computed(() => maxCount(yearList.value))

function maxCount(list) {
  if (!list.length) return 1
  return Math.max(...list.map(item => item.count))
}

function barWidth(count, max) {
  if (!max || max === 0) return '0%'
  return Math.round((count / max) * 100) + '%'
}

onMounted(async () => {
  try {
    const res = await getDashboardStatsApi()
    if (res.code === 200 && res.data) {
      stats.totalPhotos = res.data.totalPhotos ?? 0
      stats.totalCategories = res.data.totalCategories ?? 0
      stats.totalViews = res.data.totalViews ?? 0
      stats.storageUsed = res.data.storageUsed ?? '0 B'
      stats.recentPhotos = res.data.recentPhotos ?? []
      stats.exifStats = res.data.exifStats ?? null
    }
  } catch (err) {
    console.error('加载统计数据失败:', err)
  }
})
</script>

<style scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}

.stat-card {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 0.5px solid var(--border-light, #eee);
}

.stat-icon {
  font-size: 36px;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-icon { background: #E6F1FB; }
.cat-icon { background: #EAF3DE; }
.view-icon { background: #FAEEDA; }
.size-icon { background: #EEEDFE; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 26px;
  font-weight: 500;
  color: var(--text-primary, #1a1a2e);
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted, #888);
  margin-top: 2px;
}

/* 最近上传 */
.recent-section,
.quick-actions {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 22px 24px;
  border: 0.5px solid var(--border-light, #eee);
  margin-bottom: 20px;
}

h3 {
  font-size: 16px;
  color: var(--text-secondary, #333);
  margin-bottom: 16px;
  font-weight: 500;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 0.5px solid var(--border-lighter, #f5f5f5);
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-thumb {
  width: 48px;
  height: 40px;
  background: var(--bg-hover, #f5f5f5);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 28px;
}

.recent-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recent-info {
  display: flex;
  flex-direction: column;
}

.recent-info strong {
  font-size: 14px;
  color: var(--text-secondary, #333);
}

.recent-info span {
  font-size: 12px;
  color: var(--text-muted, #999);
  margin-top: 2px;
}

.empty-hint {
  text-align: center;
  color: var(--text-placeholder, #aaa);
  padding: 30px 0;
}

.action-buttons {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 8px;
  border: 1.5px solid var(--border-color, #ddd);
  font-size: 14px;
  text-decoration: none;
  color: var(--text-regular, #555);
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--color-primary, #378ADD);
  color: var(--color-primary, #378ADD);
}

.action-btn.primary {
  background: #378ADD;
  border-color: #378ADD;
  color: #fff;
}

/* EXIF 统计区域 */
.exif-section {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 22px 24px;
  border: 0.5px solid var(--border-light, #eee);
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.section-header h3 {
  margin-bottom: 0;
}

.toggle-icon {
  font-size: 11px;
  color: var(--text-muted, #999);
}

.exif-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 22px;
  margin-top: 18px;
}

.exif-card {
  background: var(--bg-secondary, #fafafa);
  border-radius: 10px;
  padding: 18px;
  border: 0.5px solid var(--border-light, #eee);
}

.exif-card h4 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-regular, #555);
  margin: 0 0 14px;
}

/* 柱状图 */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  width: 80px;
  font-size: 12px;
  color: var(--text-regular, #666);
  text-align: right;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-track {
  flex: 1;
  height: 18px;
  background: var(--border-light, #eee);
  border-radius: 9px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #378ADD, #5DADE2);
  border-radius: 9px;
  transition: width 0.5s ease;
  min-width: 4px;
}

.iso-fill {
  background: linear-gradient(90deg, #E67E22, #F5B041);
}

.year-fill {
  background: linear-gradient(90deg, #27AE60, #58D68D);
}

.bar-value {
  width: 36px;
  font-size: 12px;
  color: var(--text-muted, #999);
  text-align: left;
  flex-shrink: 0;
}

/* 相机卡片网格 */
.camera-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.camera-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-card, #fff);
  border-radius: 8px;
  border: 0.5px solid var(--border-light, #eee);
}

.camera-icon {
  font-size: 20px;
}

.camera-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary, #333);
}

.camera-count {
  font-size: 12px;
  color: var(--text-muted, #888);
}

.exif-empty {
  text-align: center;
  padding: 30px 0;
  color: var(--text-placeholder, #aaa);
  font-size: 14px;
}
</style>
