import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 主题模式 Pinia Store
 * 支持三种模式: 'system'（跟随系统）、'light'（亮色）、'dark'（暗色）
 */
export const useThemeStore = defineStore('theme', () => {
  // ===== 状态 =====
  const mode = ref(loadInitialMode())

  // ===== 计算属性 =====
  const isDark = computed(() => {
    if (mode.value === 'dark') return true
    if (mode.value === 'light') return false
    // 'system' — 检测系统偏好
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // ===== 方法 =====

  /**
   * 设置主题模式，同步更新 DOM 和 localStorage
   */
  function setMode(newMode) {
    mode.value = newMode
    localStorage.setItem('theme-mode', newMode)
    applyTheme()
  }

  /**
   * 切换主题：暗色 → 亮色 → 系统 → 暗色（循环）
   */
  function toggleMode() {
    const order = ['dark', 'light', 'system']
    const currentIndex = order.indexOf(mode.value)
    const nextIndex = (currentIndex + 1) % order.length
    setMode(order[nextIndex])
  }

  /**
   * 应用主题到 document.documentElement
   */
  function applyTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  /**
   * 初始化时从 localStorage 读取模式
   */
  function loadInitialMode() {
    const stored = localStorage.getItem('theme-mode')
    if (stored && ['system', 'light', 'dark'].includes(stored)) {
      return stored
    }
    return 'system'
  }

  // ===== 初始化 =====
  // 页面加载时立即应用主题，避免闪烁
  applyTheme()

  // 监听系统主题变化（仅在 system 模式时需要重新计算）
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') {
        applyTheme()
      }
    })
  }

  return {
    mode,
    isDark,
    setMode,
    toggleMode,
    applyTheme
  }
})
