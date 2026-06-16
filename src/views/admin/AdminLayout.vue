<template>
  <div class="admin-layout">
    <!-- 手机遮罩 -->
    <Transition name="fade">
      <div v-if="mobileMenuOpen" class="mobile-overlay" @click="mobileMenuOpen = false"></div>
    </Transition>
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed, 'mobile-open': mobileMenuOpen }">
      <div class="sidebar-header">
        <EmojiIcon name="camera" :size="22" />
        <span v-show="!isCollapsed" class="sidebar-title">相册管理</span>
        <button class="collapse-btn" @click="isCollapsed = !isCollapsed">
          <ChevronRight v-if="isCollapsed" :size="14" />
          <ChevronLeft v-else :size="14" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/admin/dashboard" class="nav-item" active-class="active">
          <EmojiIcon name="bar-chart" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">数据概览</span>
        </router-link>
        <router-link to="/admin/upload" class="nav-item" active-class="active">
          <EmojiIcon name="outbox-tray" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">上传图片</span>
        </router-link>
        <router-link to="/admin/photos" class="nav-item" active-class="active">
          <EmojiIcon name="framed-picture" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">照片管理</span>
        </router-link>
        <router-link to="/admin/categories" class="nav-item" active-class="active">
          <EmojiIcon name="file-folder" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">分类管理</span>
        </router-link>
        <router-link to="/admin/tags" class="nav-item" active-class="active">
          <EmojiIcon name="label" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">标签管理</span>
        </router-link>
        <router-link to="/admin/collections" class="nav-item" active-class="active">
          <EmojiIcon name="open-book" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">合集管理</span>
        </router-link>
        <router-link to="/admin/share" class="nav-item" active-class="active">
          <EmojiIcon name="link" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">分享管理</span>
        </router-link>
        <router-link to="/admin/users" class="nav-item" active-class="active">
          <EmojiIcon name="people" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">用户管理</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <a href="/" target="_self" class="nav-item preview-link">
          <EmojiIcon name="house" class="nav-icon" :size="22" />
          <span v-show="!isCollapsed" class="nav-text">预览网站</span>
        </a>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-area">
      <!-- 顶栏 -->
      <header class="topbar">
        <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen" aria-label="菜单">
          <span></span><span></span><span></span>
        </button>
        <div class="breadcrumb">
          <h2>{{ currentTitle }}</h2>
        </div>
        <div class="topbar-right">
          <span class="user-info">
            <EmojiIcon name="bust-in-silhouette" :size="15" class="icon-inline" /> {{ authStore.userInfo.nickname || '管理员' }}
          </span>
          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import EmojiIcon from '../../components/EmojiIcon.vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCollapsed = ref(false)
const mobileMenuOpen = ref(false)

const currentTitle = computed(() => {
  const titleMap = {
    '/admin/dashboard': '数据概览',
    '/admin/upload': '上传图片',
    '/admin/photos': '照片管理',
    '/admin/categories': '分类管理',
    '/admin/tags': '标签管理',
    '/admin/collections': '合集管理',
    '/admin/share': '分享管理',
    '/admin/users': '用户管理'
  }
  return titleMap[route.path] || '管理后台'
})

function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    authStore.logout()
    window.location.href = '/'
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-secondary, #f0f2f5);
}

/* ===== 侧边栏 ===== */
.sidebar {
  width: 220px;
  background: var(--nav-bg, #1a1a2e);
  color: #ccc;
  display: flex;
  flex-direction: column;
  transition: width 0.25s;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
}

.sidebar-logo {
  width: 22px;
  height: 22px;
  color: #5DADE2;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  margin-left: 8px;
  white-space: nowrap;
}

.collapse-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.collapse-btn:hover {
  color: #fff;
}

/* 导航 */
.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 8px;
  color: #aaa;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.nav-item.active {
  background: rgba(55, 138, 221, 0.2);
  color: #5DADE2;
}

.nav-icon {
  min-width: 22px;
  text-align: center;
  flex-shrink: 0;
}

.collapsed .nav-item {
  justify-content: center;
  padding: 11px;
}

.sidebar-footer {
  padding: 12px 8px;
  border-top: 0.5px solid rgba(255, 255, 255, 0.08);
}

.preview-link:hover {
  color: #97C459;
}

/* ===== 主区域 ===== */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  height: 58px;
  background: var(--bg-card, #fff);
  border-bottom: 0.5px solid var(--border-color, #e8e8e8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  flex-shrink: 0;
}

.breadcrumb h2 {
  font-size: 17px;
  color: var(--text-secondary, #333);
  font-weight: 500;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  font-size: 14px;
  color: var(--text-regular, #555);
}

.logout-btn {
  padding: 6px 16px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-card, #fff);
  color: var(--text-regular, #555);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  border-color: var(--color-danger, #E24B4A);
  color: var(--color-danger, #E24B4A);
}

.content-area {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}

/* 手机汉堡按钮 */
.mobile-menu-btn {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  margin-right: 12px;
}
.mobile-menu-btn span {
  width: 20px;
  height: 2px;
  background: var(--text-regular, #555);
  border-radius: 2px;
}

/* 遮罩 */
.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 98;
}

/* 过渡 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 手机适配 */
@media (max-width: 768px) {
  .mobile-menu-btn { display: flex; }
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 99;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
  }
  .sidebar.collapsed { width: 220px; }
  .mobile-overlay { display: block; }
  .collapse-btn { display: none; }
  .topbar { padding: 0 12px; }
  .content-area { padding: 12px 10px; }
}
</style>
