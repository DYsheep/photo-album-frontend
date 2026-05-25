# 组件化重构变更清单

## 新增组件 (3)

### `src/components/PhotoCard.vue`
- 从 HomeView.vue 提取照片卡片组件
- Props: `photo` (Object, required), `clickable` (Boolean, default: true)
- Emits: `click` — 点击时传递 photo 对象
- 保留骨架屏 shimmer 动画和 `@load`/`@error` 降级处理
- 样式完整迁移自 HomeView `.photo-card*` 相关 CSS（`<style scoped>`）

### `src/components/Lightbox.vue`
- 从 HomeView.vue 提取全屏灯箱组件
- Props: `photos` (Array, required), `modelValue` (Boolean, v-model 双向绑定), `initialIndex` (Number, default: 0)
- Emits: `update:modelValue`
- 完整保留原有功能：图片预览、左右箭头切换、键盘导航（ArrowLeft/ArrowRight/Esc）、滚轮缩放（1x~5x）、拖拽平移、底部信息栏（标题/分类/EXIF/描述/索引）、Teleport to body、Transition 动画
- 事件监听（keydown/mousemove/mouseup）在组件生命周期内管理
- 样式完整迁移自 HomeView `.lightbox*` 相关 CSS

### `src/components/ImageUploader.vue`
- 从 UploadView.vue 提取拖拽上传区域组件
- Props: `modelValue` (Array, v-model 绑定 `[{ file, previewUrl, _key }]` 列表)
- Emits: `update:modelValue`
- 功能：拖拽区域 + 点击选择 + 文件预览网格 + 移除按钮 + 继续添加按钮
- 文件校验：仅图片类型，单张最大 10MB
- 自动管理 Object URL 生命周期（revokeObjectURL）
- 样式完整迁移自 UploadView `.drop-zone*` 相关 CSS

---

## 修改的视图 (3)

### `src/views/HomeView.vue`
- **模板变更**：照片卡片改用 `<PhotoCard>`，灯箱改用 `<Lightbox v-model>`
- **JS 清理**：移除灯箱状态管理（reactive lightbox）、缩放/拖拽变量和函数（imgScale, imgTranslateX/Y, isDragging, onWheelZoom, onDragStart/Move/End, resetImageTransform）、键盘事件处理（onKeydown）、图片 load/error 处理（onImageLoad/Error, onLightboxImgLoad/Error）、事件监听注册/清理
- **新增 JS**：`lightboxVisible` ref、`lightboxInitialIndex` ref、简化的 `openLightbox(photo)` 函数
- **CSS 清理**：移除 `.photo-card*`（约 50 行 → 移至 PhotoCard.vue）、`.lightbox*`（约 170 行 → 移至 Lightbox.vue）、`@keyframes shimmer`、`@keyframes zoomIn`
- **保留**：`.hero`、`.category-filter`、`.photo-grid`、`.empty-hint`、`.loading`
- **代码行数**：584 → ~100 行

### `src/views/admin/UploadView.vue`
- **模板变更**：拖拽区域改用 `<ImageUploader v-model="rawFiles">`
- **JS 清理**：移除 `fileInput` ref、拖拽处理函数（onDragOver/onDrop）、文件选择函数（triggerFileInput/onFileSelected）、文件管理函数（addFiles/removeFile）
- **新增 JS**：`rawFiles` ref、watch 同步 rawFiles → selectedFiles（保留表单数据）
- **CSS 清理**：移除 `.drop-zone*`、`.drop-hint*`、`.file-preview*`、`.preview-item*`、`.remove-btn*`、`.add-more*`（约 100 行 → 移至 ImageUploader.vue）；移除 `.btn-primary` 颜色声明（全局已有）
- **保留**：上传表单、进度条、结果展示、操作按钮
- **代码行数**：534 → ~240 行

### `src/views/admin/PhotoManageView.vue`
- **无模板/JS 变更**（表格模式保留）
- **CSS 清理**：移除 `.btn-primary` / `.btn-danger` 颜色声明（全局已有）、`.modal-overlay` / `.modal-content` / `.modal-actions` 基础样式（全局已有）、`.form-group label` 重复属性、`.form-group input:focus` 等 focus 样式
- **保留**：表格样式、工具栏样式、分页样式、编辑弹窗中的局部覆盖样式（`.modal-actions .btn-secondary` 的 `#f0f0f0` 背景色）

---

## 全局样式变更

### `src/assets/main.css`
- **新增**：`.btn-primary`、`.btn-secondary`、`.btn-danger`、`.btn-sm` 全局按钮基础样式
- **新增**：`.form-group label` 全局表单标签样式
- **新增**：`.form-group input:focus` / `select:focus` / `textarea:focus` 全局 focus 样式
- **新增**：`.modal-overlay`、`.modal-content`、`.modal-actions` 全局模态框样式
- **原有**：CSS Reset、字体、配色保持不变

---

## 未修改文件

- `src/views/AboutView.vue`
- `src/views/admin/AdminLayout.vue`
- `src/views/admin/CategoryView.vue`
- `src/views/admin/DashboardView.vue`
- `src/views/admin/LoginView.vue`
- `src/stores/album.js`
- `src/stores/auth.js`
- `src/api/*`
- `src/router/*`

---

## 关键设计决策

1. **Lightbox 改为声明式 API**：原 HomeView 通过 `openLightbox(photo)` 命令式打开，现改为 `v-model` + `initialIndex` 声明式控制，父组件只需设置 index 和 visible 即可
2. **ImageUploader 与表单数据分离**：ImageUploader 仅管理原始文件列表（含 previewUrl），UploadView 通过 watch 将文件列表同步到带表单数据的 selectedFiles，保持上传逻辑不变
3. **全局样式提取不改变视觉效果**：从各 View 移除的颜色/布局声明已完整复制到 main.css，确保渲染结果完全一致
