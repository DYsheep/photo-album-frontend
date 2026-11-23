<template>
  <div class="tag-cloud" v-if="tags.length > 0">
    <div class="tag-cloud-header" @click="isExpanded = !isExpanded">
      <span class="tag-cloud-title">标签云</span>
      <span class="tag-cloud-toggle">
        <ChevronDown v-if="!isExpanded" :size="14" />
        <ChevronUp v-else :size="14" />
      </span>
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
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

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
  /* 折叠入口与首页标题、搜索框对齐到同一中轴；展开后的标签仍左对齐铺满 */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tag-cloud-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 8px 14px;
  margin-bottom: 8px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #eee);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.18s ease;
}

.tag-cloud-header:hover {
  border-color: var(--color-primary, #378ADD);
}

.tag-cloud-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary, #333);
}

.tag-cloud-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: var(--text-muted, #999);
}

.tag-cloud-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  align-self: stretch;
  justify-content: flex-start;
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

/* 触摸设备无 hover：只在支持 hover 的设备上做高亮 */
@media (hover: hover) {
  .tag-item:hover {
    border-color: var(--color-primary, #378ADD);
    color: var(--color-primary, #378ADD);
  }
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

/* ========== 移动端适配 ========== */
@media (max-width: 768px) {
  /* 折叠标题做成 ≥44px 的点击热区 */
  .tag-cloud-header {
    min-height: 44px;
    padding: 10px 0;
    margin-bottom: 4px;
  }

  .tag-cloud-body {
    gap: 6px;
  }

  .tag-item {
    padding: 5px 12px;
  }

  .tag-lg {
    font-size: 15px;
    padding: 6px 14px;
  }

  .tag-md {
    font-size: 13px;
  }

  .tag-sm {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .tag-cloud {
    margin-bottom: 16px;
  }

  .tag-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}
</style>
