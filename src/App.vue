<template>
  <div id="app">
    <header class="app-header">
      <nav class="nav-container">
        <router-link to="/" class="logo">
          <EmojiIcon name="camera" :size="24" />
          <span>我的摄影相册</span>
        </router-link>
        <div class="nav-links">
          <router-link to="/">首页</router-link>
          <router-link to="/collections">合集</router-link>
          <router-link to="/map">地图</router-link>
          <router-link to="/about">关于</router-link>
          <router-link to="/admin/login" class="admin-link"><EmojiIcon name="gear" :size="16" class="icon-inline" /> 管理</router-link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import EmojiIcon from './components/EmojiIcon.vue'
import ThemeToggle from './components/ThemeToggle.vue'
</script>

<style scoped>
.app-header {
  background: var(--nav-bg, #1a1a2e);
  padding: 0 24px;
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
  height: 60px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  text-decoration: none;
  font-size: 18px;
  font-weight: 500;
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: #fff;
}

.nav-links {
  display: flex;
  gap: 24px;
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

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}
</style>
