<template>
  <div class="about">
    <h1>关于本站</h1>
    <div class="about-content">
      <p>这是一个用于展示个人摄影作品的前端项目。</p>
      <div class="tech-stack">
        <h2>技术栈</h2>
        <ul>
          <li><strong>Vue 3</strong> - 渐进式 JavaScript 框架</li>
          <li><strong>Vite</strong> - 新一代前端构建工具</li>
          <li><strong>Vue Router</strong> - 路由管理</li>
          <li><strong>Pinia</strong> - 状态管理</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
// About page
</script>

<style scoped>
.about h1 {
  font-size: 28px;
  color: var(--text-primary, #1a1a2e);
  margin-bottom: 24px;
}

.about-content {
  max-width: 600px;
}

.about-content p {
  font-size: 15px;
  color: var(--text-regular, #555);
  line-height: 1.8;
}

.tech-stack {
  margin-top: 32px;
  padding: 24px;
  background: var(--bg-hover, #f9f9f9);
  border-radius: 12px;
}

.tech-stack h2 {
  font-size: 18px;
  color: var(--text-secondary, #333);
  margin-bottom: 16px;
}

.tech-stack ul {
  list-style: none;
  padding: 0;
}

.tech-stack li {
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-regular, #555);
  border-bottom: 0.5px solid var(--border-light, #eee);
}

.tech-stack li:last-child {
  border-bottom: none;
}
</style>
