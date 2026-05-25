<template>
  <div class="tag-cloud" v-if="tags.length > 0">
    <div class="tag-cloud-header" @click="isExpanded = !isExpanded">
      <span class="tag-cloud-title">标签云</span>
      <span class="tag-cloud-toggle">{{ isExpanded ? '▲' : '▼' }}</span>
    </div>
    <div class="tag-cloud-body" v-show="isExpanded">
      <span
        v-for="tag in tags"
        :key="tag.name"
        class="tag-item"
        :class="[
          getSizeClass(tag.count),
          { active: activeTag === tag.name }
        ]"
        @click="$emit('select', tag.name)"
      >
        {{ tag.name }}
        <sup class="tag-count">{{ tag.count }}</sup>
      </span>
    </div>
  </div>
  <div v-else class="tag-cloud-empty">暂无标签</div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  tags: {
    type: Array,
    default: () => []
  },
  activeTag: {
    type: String,
    default: ''
  }
})

defineEmits(['select'])

const isExpanded = ref(false)

function getSizeClass(count) {
  if (count >= 10) return 'tag-lg'
  if (count >= 5) return 'tag-md'
  return 'tag-sm'
}
</script>

<style scoped>
.tag-cloud {
  margin-bottom: 24px;
}

.tag-cloud-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 6px 0;
  margin-bottom: 8px;
}

.tag-cloud-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary, #333);
}

.tag-cloud-toggle {
  font-size: 11px;
  color: var(--text-muted, #999);
}

.tag-cloud-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 14px;
  border-radius: 16px;
  border: 1.5px solid var(--border-color, #ddd);
  background: var(--bg-card, #fff);
  color: var(--text-regular, #555);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tag-item:hover {
  border-color: var(--color-primary, #378ADD);
  color: var(--color-primary, #378ADD);
}

.tag-item.active {
  background: var(--color-primary, #378ADD);
  border-color: var(--color-primary, #378ADD);
  color: var(--text-inverse, #fff);
}

.tag-item.active .tag-count {
  color: rgba(255, 255, 255, 0.7);
}

.tag-sm {
  font-size: 12px;
}

.tag-md {
  font-size: 14px;
}

.tag-lg {
  font-size: 16px;
  font-weight: 500;
  padding: 6px 18px;
}

.tag-count {
  font-size: 10px;
  color: var(--text-placeholder, #aaa);
  margin-left: 2px;
}

.tag-cloud-empty {
  font-size: 13px;
  color: var(--text-placeholder, #aaa);
  margin-bottom: 24px;
}
</style>
