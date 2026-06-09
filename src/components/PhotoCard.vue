<template>
  <div class="photo-card" @click="handleClick">
    <div class="photo-img-wrapper">
      <img
        :src="photo.thumbnailUrl || photo.url || ''"
        :alt="photo.title"
        class="photo-img"
        loading="lazy"
        @load="onImageLoad"
        @error="onImageError"
      />
    </div>
    <div class="photo-info">
      <div class="photo-info-row">
        <span class="photo-tag">{{ photo.categoryName }}</span>
        <div class="like-badge" v-if="photo.likeCount">
          <svg class="badge-heart" viewBox="0 0 24 24" fill="#F56C6C"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {{ photo.likeCount }}
        </div>
      </div>
      <h3>{{ photo.title }}</h3>
      <p class="photo-desc">{{ photo.description }}</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  photo: { type: Object, required: true },
  clickable: { type: Boolean, default: true },
  routeQuery: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['click'])

function handleClick() {
  if (props.clickable) {
    emit('click', props.photo)
    router.push({ name: 'photoDetail', params: { id: props.photo.id }, query: props.routeQuery })
  }
}

function onImageLoad(e) {
  e.target.classList.add('loaded')
}

function onImageError(e) {
  e.target.classList.add('loaded', 'error')
}
</script>

<style scoped>
.photo-card {
  border-radius: 12px;
  overflow: hidden;
  border: 0.5px solid var(--border-light, #eee);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  background: var(--bg-card, #fff);
}

.photo-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.08));
}

.photo-img-wrapper {
  background: linear-gradient(135deg, var(--bg-hover, #f5f5f5), var(--border-light, #e8e8e8));
  overflow: hidden;
  min-height: 150px;
}

.like-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted, #999);
  font-size: 13px;
}
.badge-heart { width: 14px; height: 14px; flex-shrink: 0; }

.photo-img {
  width: 100%;
  display: block;
  transition: transform 0.3s ease, opacity 0.4s ease;
  opacity: 0;
}

.photo-img.loaded {
  opacity: 1;
}

/* 图片加载失败占位状态 */
.photo-img.error {
  opacity: 0.35;
  object-fit: contain;
  filter: grayscale(1);
}

/* 图片加载中的骨架屏动画 */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.photo-img:not(.loaded) + .photo-skeleton,
.photo-img-wrapper:has(.photo-img:not(.loaded)) {
  animation: shimmer 1.6s infinite linear;
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
}

.photo-info {
  padding: 16px;
}
.photo-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.photo-info h3 {
  margin: 0 0 6px;
  font-size: 16px;
  color: var(--text-secondary, #333);
}

.photo-desc {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--text-muted, #888);
}

.photo-tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--color-primary-light, #E6F1FB);
  color: var(--color-primary-dark, #185FA5);
  border-radius: 10px;
  font-size: 12px;
}
</style>
