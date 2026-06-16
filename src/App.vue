<template>
  <div id="app">
    <header class="app-header">
      <nav class="nav-container">
        <router-link to="/" class="logo" @click.prevent="goHome">
          <EmojiIcon name="camera" :size="24" />
          <span>我的摄影相册</span>
        </router-link>
        <!-- 桌面导航 -->
        <div class="nav-links">
          <router-link to="/">首页</router-link>
          <router-link to="/collections">合集</router-link>
          <router-link to="/map">地图</router-link>
          <router-link to="/about">关于</router-link>
          <router-link v-if="authStore.isAdmin" to="/admin/dashboard" class="admin-link"><EmojiIcon name="gear" :size="16" class="icon-inline" /> 管理</router-link>
          <router-link v-else-if="!authStore.isLoggedIn" to="/admin/login" class="admin-link"><EmojiIcon name="gear" :size="16" class="icon-inline" /> 管理</router-link>
          <button v-if="authStore.isLoggedIn" class="logout-btn" @click="handleLogout">退出</button>
          <ThemeToggle />
        </div>
        <!-- 手机汉堡按钮 -->
        <button class="hamburger" @click="menuOpen = !menuOpen" aria-label="菜单">
          <span :class="{ open: menuOpen }"></span>
          <span :class="{ open: menuOpen }"></span>
          <span :class="{ open: menuOpen }"></span>
        </button>
      </nav>
    </header>

    <!-- 手机侧滑菜单 -->
    <Transition name="slide">
      <div v-if="menuOpen" class="mobile-overlay" @click="menuOpen = false">
        <nav class="mobile-menu" @click.stop>
          <router-link to="/" @click="menuOpen = false">首页</router-link>
          <router-link to="/collections" @click="menuOpen = false">合集</router-link>
          <router-link to="/map" @click="menuOpen = false">地图</router-link>
          <router-link to="/about" @click="menuOpen = false">关于</router-link>
          <router-link v-if="authStore.isAdmin" to="/admin/dashboard" @click="menuOpen = false">⚙ 管理</router-link>
          <router-link v-else-if="!authStore.isLoggedIn" to="/admin/login" @click="menuOpen = false">⚙ 管理</router-link>
          <a v-if="authStore.isLoggedIn" class="logout-link" @click="handleLogout">退出登录</a>
          <ThemeToggle />
        </nav>
      </div>
    </Transition>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import EmojiIcon from './components/EmojiIcon.vue'
import ThemeToggle from './components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const menuOpen = ref(false)

function handleLogout() {
  authStore.logout()
  goHome()
}

function goHome() {
  menuOpen.value = false
  if (route.path === '/') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => window.location.reload(), 300)
  } else {
    router.push('/')
  }
}

watch(() => route.path, () => { menuOpen.value = false })
</script>

<style scoped>
.app-header {
  background: var(--nav-bg, #1a1a2e);
  padding: 0 16px;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background-color 0.3s ease;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  text-decoration: none;
  font-size: 18px;
  font-weight: 500;
  flex-shrink: 0;
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: #fff;
}

/* 桌面导航链接 */
.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-links a {
  color: #ccc;
  text-decoration: none;
  font-size: 15px;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: #fff;
}

.nav-links .admin-link {
  color: #5DADE2;
}
.nav-links .admin-link:hover {
  color: #85C1E9;
}

.logout-btn {
  background: none;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  color: var(--text-muted, #888);
  cursor: pointer;
}
.logout-btn:hover { color: #F56C6C; border-color: #F56C6C; }
.logout-link { color: #F56C6C; font-size: 16px; cursor: pointer; }

/* 汉堡按钮 - 默认隐藏 */
.hamburger {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  z-index: 101;
}
.hamburger span {
  display: block;
  width: 22px;
  height: 2px;
  background: #ccc;
  border-radius: 2px;
  transition: all 0.3s;
}
.hamburger span.open:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}
.hamburger span.open:nth-child(2) { opacity: 0; }
.hamburger span.open:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

/* 手机菜单 */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 99;
}
.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: 240px;
  height: 100%;
  background: var(--nav-bg, #1a1a2e);
  padding: 80px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mobile-menu a {
  color: #ccc;
  text-decoration: none;
  font-size: 17px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.mobile-menu a:hover,
.mobile-menu a.router-link-active {
  color: #fff;
}
.mobile-menu :deep(.theme-toggle) {
  margin-top: 16px;
}

/* 滑入动画 */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.25s;
}
.slide-enter-active .mobile-menu,
.slide-leave-active .mobile-menu {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to { opacity: 0; }
.slide-enter-from .mobile-menu,
.slide-leave-to .mobile-menu { transform: translateX(100%); }

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* 手机 */
@media (max-width: 768px) {
  .nav-links { display: none; }
  .hamburger { display: flex; }
  .logo { font-size: 15px; }
  .logo span { display: none; }
  .main-content {
    padding: 16px 8px;
  }
}

/* 平板：显示导航但缩小间距 */
@media (min-width: 769px) and (max-width: 1024px) {
  .nav-links { gap: 16px; }
  .nav-links a { font-size: 14px; }
}
</style>
