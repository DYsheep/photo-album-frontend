<template>
  <div class="tag-manage">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="toolbar-hint" v-if="selectedTags.length === 0">
          选择标签进行合并操作
        </span>
        <span v-else class="toolbar-selected">
          已选 {{ selectedTags.length }} 个标签
        </span>
      </div>
      <div class="toolbar-right">
        <button
          v-if="selectedTags.length >= 2"
          class="btn-primary btn-sm"
          @click="openMergeDialog"
        >
          合并标签
        </button>
        <button class="btn-secondary btn-sm" @click="loadTags">
          <EmojiIcon name="arrows-counterclockwise" :size="15" class="icon-inline" /> 刷新
        </button>
      </div>
    </div>

    <!-- 标签卡片网格 -->
    <div class="tag-grid" v-if="tags.length > 0 && !isLoading">
      <div
        v-for="tag in tags"
        :key="tag.name"
        class="tag-card"
        :class="[
          getCountClass(tag.count),
          { selected: isSelected(tag.name) }
        ]"
        @click="toggleSelect(tag.name)"
      >
        <div class="tag-card-check" v-if="selectedTags.length > 0">
          <input type="checkbox" :checked="isSelected(tag.name)" @click.stop />
        </div>
        <div class="tag-card-name">{{ tag.name }}</div>
        <div class="tag-card-count">{{ tag.count }} 张</div>
        <div class="tag-card-actions" @click.stop>
          <button class="tag-action-btn" @click="openRename(tag)" title="重命名"><EmojiIcon name="pencil" :size="14" /></button>
          <button class="tag-action-btn del" @click="handleDelete(tag)" title="删除"><EmojiIcon name="wastebasket" :size="14" /></button>
        </div>
      </div>
    </div>

    <div v-else-if="isLoading" class="empty-state">加载中...</div>
    <div v-else class="empty-state">暂无标签数据</div>

    <!-- 重命名弹窗 -->
    <div v-if="renameVisible" class="modal-overlay" @click.self="closeRename">
      <div class="modal-content modal-sm">
        <h3>重命名标签</h3>
        <div class="form-group">
          <label>原名称</label>
          <input :value="renameTag.name" disabled class="input-disabled" />
        </div>
        <div class="form-group">
          <label>新名称</label>
          <input v-model="renameForm.newName" placeholder="输入新标签名" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeRename">取消</button>
          <button class="btn-primary" @click="saveRename" :disabled="renaming">确定</button>
        </div>
      </div>
    </div>

    <!-- 合并弹窗 -->
    <div v-if="mergeVisible" class="modal-overlay" @click.self="closeMerge">
      <div class="modal-content modal-sm">
        <h3>合并标签</h3>
        <div class="form-group">
          <label>源标签</label>
          <div class="source-tags">
            <span v-for="name in selectedTags" :key="name" class="source-tag">{{ name }}</span>
          </div>
        </div>
        <div class="form-group">
          <label>目标标签名</label>
          <input v-model="mergeTargetName" placeholder="合并后的标签名" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeMerge">取消</button>
          <button class="btn-primary" @click="saveMerge" :disabled="merging">合并</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getAdminTagListApi, renameTagApi, deleteTagApi, mergeTagsApi } from '../../api/admin-tag'
import EmojiIcon from '../../components/EmojiIcon.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const tags = ref([])
const isLoading = ref(false)
const selectedTags = ref([])

// 重命名
const renameVisible = ref(false)
const renaming = ref(false)
const renameTag = ref({})
const renameForm = reactive({ newName: '' })

// 合并
const mergeVisible = ref(false)
const merging = ref(false)
const mergeTargetName = ref('')

// ===== 数据加载 =====

async function loadTags() {
  isLoading.value = true
  try {
    const res = await getAdminTagListApi()
    if (res.code === 200 && res.data) {
      tags.value = res.data
    }
  } catch (err) {
    console.error('加载标签失败:', err)
    ElMessage.error('加载标签失败')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadTags()
})

// ===== 选择 =====

function isSelected(name) {
  return selectedTags.value.includes(name)
}

function toggleSelect(name) {
  const idx = selectedTags.value.indexOf(name)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(name)
  }
}

// ===== 样式 =====

function getCountClass(count) {
  if (count > 20) return 'tag-dark'
  if (count >= 10) return 'tag-mid'
  return 'tag-light'
}

// ===== 重命名 =====

function openRename(tag) {
  renameTag.value = tag
  renameForm.newName = ''
  renameVisible.value = true
}

function closeRename() {
  renameVisible.value = false
}

async function saveRename() {
  const newName = renameForm.newName.trim()
  if (!newName) {
    ElMessage.warning('请输入新名称')
    return
  }
  if (newName === renameTag.value.name) {
    ElMessage.warning('新旧名称相同')
    return
  }
  renaming.value = true
  try {
    await renameTagApi(renameTag.value.name, newName)
    ElMessage.success('重命名成功')
    closeRename()
    selectedTags.value = selectedTags.value.map(t =>
      t === renameTag.value.name ? newName : t
    )
    await loadTags()
  } catch (err) {
    ElMessage.error('重命名失败: ' + (err.message || '未知错误'))
  } finally {
    renaming.value = false
  }
}

// ===== 删除 =====

async function handleDelete(tag) {
  try {
    await ElMessageBox.confirm(
      `确定删除标签"${tag.name}"吗？将从所有照片中移除此标签。`,
      '删除标签',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  try {
    await deleteTagApi(tag.name)
    ElMessage.success('删除成功')
    selectedTags.value = selectedTags.value.filter(t => t !== tag.name)
    await loadTags()
  } catch (err) {
    ElMessage.error('删除失败: ' + (err.message || '未知错误'))
  }
}

// ===== 合并 =====

function openMergeDialog() {
  mergeTargetName.value = ''
  mergeVisible.value = true
}

function closeMerge() {
  mergeVisible.value = false
}

async function saveMerge() {
  const target = mergeTargetName.value.trim()
  if (!target) {
    ElMessage.warning('请输入目标标签名')
    return
  }
  merging.value = true
  try {
    await mergeTagsApi(selectedTags.value, target)
    ElMessage.success('合并成功')
    closeMerge()
    selectedTags.value = []
    await loadTags()
  } catch (err) {
    ElMessage.error('合并失败: ' + (err.message || '未知错误'))
  } finally {
    merging.value = false
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-hint {
  font-size: 13px;
  color: #aaa;
}

.toolbar-selected {
  font-size: 13px;
  color: #378ADD;
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.btn-sm {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: inline-flex;
  align-items: center;
}

.btn-primary {
  background: #378ADD;
  color: #fff;
}

.btn-primary:hover {
  background: #2B6FC4;
}

.btn-secondary {
  background: #f5f5f5;
  color: #555;
  border: 1.5px solid #ddd !important;
}

.btn-secondary:hover {
  border-color: #378ADD !important;
  color: #378ADD;
}

/* 标签网格 */
.tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.tag-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  border: 0.5px solid #eee;
  position: relative;
}

.tag-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.tag-card.selected {
  border-color: #378ADD;
  background: #F5FAFF;
}

.tag-card-check {
  position: absolute;
  top: 10px;
  left: 10px;
}

.tag-card-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  text-align: center;
}

.tag-card-count {
  font-size: 13px;
  text-align: center;
  margin-bottom: 12px;
}

/* 数量颜色 */
.tag-dark .tag-card-name { color: #1a1a2e; }
.tag-dark .tag-card-count { color: #378ADD; font-weight: 500; }

.tag-mid .tag-card-name { color: #444; }
.tag-mid .tag-card-count { color: #888; }

.tag-light .tag-card-name { color: #888; }
.tag-light .tag-card-count { color: #bbb; }

.tag-card-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.tag-action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.2s;
}

.tag-action-btn:hover {
  border-color: #378ADD;
  color: #378ADD;
}

.tag-action-btn.del:hover {
  border-color: #E24B4A;
  color: #E24B4A;
}

/* 弹窗 */
.modal-content.modal-sm {
  max-width: 420px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #378ADD;
}

.input-disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.source-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-tag {
  display: inline-block;
  padding: 3px 12px;
  background: #E6F1FB;
  color: #185FA5;
  border-radius: 12px;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.modal-actions .btn-primary,
.modal-actions .btn-secondary {
  padding: 8px 22px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.modal-actions .btn-primary {
  background: #378ADD;
  color: #fff;
}

.modal-actions .btn-secondary {
  background: #f0f0f0;
  color: #555;
}

.modal-actions .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #aaa;
  font-size: 15px;
}
</style>
