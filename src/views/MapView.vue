<template>
  <div class="map-view">
    <!-- 加载状态 -->
    <div v-if="loading" class="map-loading">
      <EmojiIcon name="globe-showing-americas" :size="48" />
      <p>加载地图数据...</p>
    </div>

    <!-- 空状态：无 GPS 数据 -->
    <div v-else-if="photos.length === 0" class="map-empty">
      <EmojiIcon name="world-map" :size="64" />
      <h2>暂无位置数据</h2>
      <p>上传带有 GPS 信息的照片后，它们将显示在地图上</p>
      <router-link to="/" class="back-link">返回首页</router-link>
    </div>

    <!-- 地图容器 -->
    <div v-else ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { getGpsPhotosApi } from '../api/photo'
import EmojiIcon from '../components/EmojiIcon.vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

const mapContainer = ref(null)
const photos = ref([])
const loading = ref(true)

// Leaflet 默认图标路径在打包后失效，这里改为显式 CDN 地址。
// 该修正原先放在 main.js，导致每个页面都会因此引入整个 Leaflet（约 180KB）；
// 只有地图页需要它，移到本组件后其余页面不再加载 Leaflet。
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

let map = null
let markerClusterGroup = null

async function loadGpsPhotos() {
  try {
    const res = await getGpsPhotosApi()
    if (res.code === 200 && res.data) {
      photos.value = res.data
    } else {
      photos.value = []
    }
  } catch (err) {
    console.error('加载 GPS 照片失败:', err)
    photos.value = []
  }
}

function initMap() {
  if (!mapContainer.value || photos.value.length === 0) return

  // 创建地图
  map = L.map(mapContainer.value, {
    center: [35.0, 105.0], // 默认中国中心
    zoom: 4,
    zoomControl: true,
    attributionControl: true
  })

  // 添加 OpenStreetMap 瓦片层
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(map)

  // 创建标记聚合组
  markerClusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
  })

  const bounds = []

  // 为每张有 GPS 的照片添加标记
  for (const photo of photos.value) {
    if (photo.gpsLatitude == null || photo.gpsLongitude == null) continue

    const lat = photo.gpsLatitude
    const lng = photo.gpsLongitude
    bounds.push([lat, lng])

    // 构建弹窗：一律用 DOM API（textContent / setAttribute），不拼 HTML 字符串。
    // 照片标题等字段由上传者控制（未填标题时取原始文件名），若拼进 innerHTML
    // 可在属性上下文中闭合引号注入脚本（存储型 XSS），因此这里不允许出现字符串 HTML。
    const popup = document.createElement('div')
    popup.className = 'map-popup'

    const imageWrapper = document.createElement('div')
    imageWrapper.className = 'popup-image-wrapper'
    const img = document.createElement('img')
    img.className = 'popup-img'
    img.setAttribute('src', photo.thumbnailUrl || photo.url || '')
    img.setAttribute('alt', photo.title || '')
    imageWrapper.appendChild(img)
    popup.appendChild(imageWrapper)

    const info = document.createElement('div')
    info.className = 'popup-info'
    const heading = document.createElement('h4')
    heading.textContent = photo.title || '未命名'
    info.appendChild(heading)
    if (photo.categoryName) {
      const category = document.createElement('span')
      category.className = 'popup-category'
      category.textContent = photo.categoryName
      info.appendChild(category)
    }
    popup.appendChild(info)

    const detailLink = document.createElement('a')
    detailLink.className = 'popup-link'
    detailLink.setAttribute('href', `/photo/${photo.id}`)
    detailLink.textContent = '查看详情 →'
    popup.appendChild(detailLink)

    const marker = L.marker([lat, lng])
    marker.bindPopup(popup, {
      maxWidth: 260,
      className: 'custom-popup'
    })

    markerClusterGroup.addLayer(marker)
  }

  map.addLayer(markerClusterGroup)

  // 自动缩放以适配所有标记
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }
}

function destroyMap() {
  if (markerClusterGroup) {
    map?.removeLayer(markerClusterGroup)
    markerClusterGroup = null
  }
  if (map) {
    map.remove()
    map = null
  }
}

onMounted(async () => {
  await loadGpsPhotos()
  loading.value = false
  await nextTick()
  initMap()
})

onBeforeUnmount(() => {
  destroyMap()
})
</script>

<style scoped>
.map-view {
  margin: -32px -24px; /* 抵消 main-content 的 padding，实现全宽 */
  height: calc(100vh - 60px); /* 减去导航栏高度 */
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.map-loading,
.map-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted, #888);
  background: var(--bg-primary, #fafafa);
}

.map-loading p {
  margin-top: 16px;
  font-size: 15px;
}

.map-empty h2 {
  font-size: 22px;
  color: var(--text-primary, #1a1a2e);
  margin: 16px 0 8px;
}

.map-empty p {
  font-size: 14px;
  color: var(--text-muted, #888);
  margin-bottom: 20px;
}

.back-link {
  color: var(--color-primary, #378ADD);
  text-decoration: none;
  font-size: 14px;
}

.back-link:hover {
  text-decoration: underline;
}
</style>

<!-- 全局弹窗样式（非 scoped，因为 Leaflet 弹窗在 shadow DOM 外） -->
<style>
.custom-popup .leaflet-popup-content-wrapper {
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.custom-popup .leaflet-popup-content {
  margin: 0;
  width: 240px !important;
}

.map-popup {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.popup-image-wrapper {
  width: 100%;
  height: 140px;
  overflow: hidden;
  background: #f5f5f5;
}

.popup-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popup-info {
  padding: 10px 12px 6px;
}

.popup-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.popup-category {
  display: inline-block;
  padding: 2px 8px;
  background: #E6F1FB;
  color: #185FA5;
  border-radius: 10px;
  font-size: 11px;
}

.popup-link {
  display: block;
  padding: 8px 12px;
  font-size: 13px;
  color: #378ADD;
  text-decoration: none;
  border-top: 0.5px solid #eee;
  transition: background 0.2s;
}

.popup-link:hover {
  background: #F5FAFF;
}
</style>
