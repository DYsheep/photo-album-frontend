<template>
  <div class="about">
    <header class="about-hero">
      <h1>关于本站</h1>
      <p class="about-lead">这里收录我拍摄的风光、城市与人文影像，按分类与合集整理，便于按主题浏览与回溯。</p>
    </header>

    <div class="about-grid">
      <section class="about-card card-panel">
        <h2>本站能做什么</h2>
        <ul class="feature-list">
          <li>按分类浏览作品，或用关键词检索标题与描述</li>
          <li>以合集形式策展系列作品，支持在合集内连续翻阅</li>
          <li>在地图上按拍摄地点查看照片的位置分布</li>
          <li>对喜欢的作品点赞，或生成分享链接转给朋友</li>
        </ul>
      </section>

      <section class="about-card card-panel">
        <h2>图片与版权</h2>
        <p>站内照片均由作者拍摄并保留著作权，欢迎交流与转载申请；未经许可请勿用于商业用途。</p>
        <p class="cell-muted">私密内容仅对已授权的账号可见，通过分享链接访问时同样遵循该可见性规则。</p>
      </section>
    </div>

    <section class="about-card card-panel mt-lg">
      <h2>技术实现</h2>
      <p class="cell-muted">
        本站为个人独立开发与维护：前端 Vue 3 + Vite，后端 Spring Boot，图片存储于对象存储，
        私密内容采用短期签名地址访问。
      </p>
    </section>
  </div>
</template>

<script setup>
// About page
</script>

<style scoped>
.about {
  max-width: 860px;
}

.about-hero {
  margin-bottom: 24px;
}

.about-hero h1 {
  font-size: 28px;
  color: var(--text-primary, #1a1a2e);
  margin-bottom: 12px;
}

.about-lead {
  font-size: 15px;
  color: var(--text-regular, #555);
  line-height: 1.8;
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.about-card h2 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary, #333);
  margin-bottom: 12px;
}

.about-card p {
  font-size: 14px;
  color: var(--text-regular, #555);
  line-height: 1.8;
}

.about-card p + p {
  margin-top: 8px;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  position: relative;
  padding: 6px 0 6px 18px;
  font-size: 14px;
  color: var(--text-regular, #555);
  line-height: 1.7;
}

.feature-list li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 14px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary, #378ADD);
}

@media (max-width: 768px) {
  .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>
