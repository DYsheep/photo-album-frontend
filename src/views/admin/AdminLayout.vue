<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
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

const currentTitle = computed(() => {
  const titleMap = {
    '/admin/dashboard': '数据概览',
    '/admin/upload': '上传图片',
    '/admin/photos': '照片管理',
    '/admin/categories': '分类管理',
    '/admin/tags': '标签管理',
    '/admin/collections': '合集管理',
    '/admin/share': '分享管理'
  }
  return titleMap[route.path] || '管理后台'
})

function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    authStore.logout()
    router.push('/admin/login')
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
</style>
