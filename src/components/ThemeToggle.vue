<template>
  <button class="theme-toggle" @click="themeStore.toggleMode()" :title="tooltipText">
    <EmojiIcon v-if="themeStore.mode === 'dark'" name="crescent-moon" :size="20" />
    <EmojiIcon v-else-if="themeStore.mode === 'light'" name="sun" :size="20" />
    <EmojiIcon v-else name="desktop-computer" :size="20" />
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import EmojiIcon from './EmojiIcon.vue'

const themeStore = useThemeStore()

const tooltipText = computed(() => {
  if (themeStore.mode === 'dark') return '暗色模式'
  if (themeStore.mode === 'light') return '亮色模式'
  return '跟随系统'
})
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
</style>
