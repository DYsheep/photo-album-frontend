<template>
  <div class="photo-manage">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索照片标题..."
          class="search-input"
          @keyup.enter="loadPhotos"
        />
        <select v-model="filterCategory" class="filter-select" @change="loadPhotos">
          <option value="">全部分类</option>
          <option v-for="cat in categoryList" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <button class="btn-secondary btn-sm" @click="loadPhotos">搜索</button>
      </div>
      <div class="toolbar-right">
        <button
          v-if="selectedIds.length > 0"
          class="btn-secondary btn-sm"
          @click="openBatchEdit"
        >
          批量编辑 ({{ selectedIds.length }})
        </button>
        <button
          v-if="selectedIds.length > 0"
          class="btn-danger btn-sm"
          @click="handleBatchDelete"
        >
          批量删除 ({{ selectedIds.length }})
        </button>
        <router-link to="/admin/upload" class="btn-primary btn-sm">+ 上传新图片</router-link>
      </div>
    </div>

    <!-- 照片列表（表格模式） -->
    <div class="photo-table-wrap">
      <table class="photo-table" v-if="photos.length > 0 && !isLoading">
        <thead>
          <tr>
            <th width="36"><input type="checkbox" v-model="selectAll" /></th>
            <th>预览</th>
            <th>标题</th>
            <th>分类</th>
            <th>描述</th>
            <th width="160">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="photo in photos" :key="photo.id" :class="{ rowSelected: isSelected(photo.id) }">
            <td><input type="checkbox" :value="photo.id" v-model="selectedIds" /></td>
            <td>
              <div class="thumb-cell">
                <img v-if="photo.url" :src="photo.thumbnailUrl || photo.url" alt="" class="thumb-img" />
                <EmojiIcon v-else name="camera" :size="20" />
              </div>
            </td>
            <td>{{ photo.title }}</td>
            <td><span class="cat-tag">{{ photo.categoryName }}</span></td>
            <td class="desc-cell">{{ photo.description || '-' }}</td>
            <td>
              <button class="action-btn edit-btn" @click="openEdit(photo)"><EmojiIcon name="pencil" :size="14" class="icon-inline" /> 编辑</button>
              <button class="action-btn del-btn" @click="handleDelete(photo.id)"><EmojiIcon name="wastebasket" :size="14" class="icon-inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else-if="isLoading" class="empty-state">加载中...</div>
      <div v-else class="empty-state"><EmojiIcon name="framed-picture" :size="40" /> 暂无照片数据</div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">&laquo;</button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">&raquo;</button>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editingPhoto" class="modal-overlay" @click.self="closeEdit">
      <div class="modal-content">
        <h3>编辑照片</h3>
        <div class="form-group">
          <label>标题</label>
          <input v-model="editForm.title" />
        </div>
        <div class="form-group">
          <label>分类</label>
          <select v-model="editForm.categoryId">
            <option :value="null">请选择</option>
            <option v-for="cat in categoryList" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="editForm.description" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeEdit">取消</button>
          <button class="btn-primary" @click="saveEdit" :disabled="saving">保存</button>
        </div>
      </div>
    </div>

    <!-- 批量编辑弹窗 -->
    <div v-if="batchEditVisible" class="modal-overlay" @click.self="closeBatchEdit">
      <div class="modal-content">
        <h3>批量编辑 ({{ selectedIds.length }} 张照片)</h3>
        <div class="form-group">
          <label>修改分类</label>
          <select v-model="batchForm.categoryId">
            <option :value="null">不修改</option>
            <option v-for="cat in categoryList" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>追加标签（逗号分隔）</label>
          <input v-model="batchForm.appendTags" placeholder="例如：风景,日出" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeBatchEdit">取消</button>
          <button class="btn-primary" @click="saveBatchEdit" :disabled="batchSaving">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { getPhotoListApi, updatePhotoApi, deletePhotoApi, batchDeletePhotosApi, batchUpdatePhotosApi } from '../../api/photo'
import EmojiIcon from '../../components/EmojiIcon.vue'
import { getCategoryListApi } from '../../api/category'
import { ElMessage, ElMessageBox } from 'element-plus'

// 搜索和筛选
const searchText = ref('')
const filterCategory = ref('')
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)

// 照片数据
const photos = ref([])
const isLoading = ref(false)
const categoryList = ref([])

// 选择相关
const selectAll = computed({
  get: () => photos.value.length > 0 && selectedIds.value.length === photos.value.length,
  set: (val) => {
    selectedIds.value = val ? photos.value.map(p => p.id) : []
  }
})
const selectedIds = ref([])

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

// ===== 数据加载 =====

async function loadCategories() {
  try {
    const res = await getCategoryListApi()
    categoryList.value = res.data || []
  } catch (err) {
    console.error('加载分类失败:', err)
  }
}

async function loadPhotos() {
  isLoading.value = true
  try {
    const res = await getPhotoListApi({
      pageNum: currentPage.value,
      pageSize: pageSize,
      keyword: searchText.value || undefined,
      categoryIdFilter: filterCategory.value || undefined
    })
    if (res.code === 200 && res.data) {
      photos.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (err) {
    console.error('加载照片失败:', err)
  } finally {
    isLoading.value = false
  }
}

function goPage(page) {
  currentPage.value = page
  selectedIds.value = []
  loadPhotos()
}

onMounted(async () => {
  await loadCategories()
  await loadPhotos()
})

// ===== 选择 =====

function isSelected(id) {
  return selectedIds.value.includes(id)
}

// ===== 编辑 =====

const editingPhoto = ref(null)
const saving = ref(false)
const editForm = reactive({ title: '', categoryId: null, description: '' })

function openEdit(photo) {
  editingPhoto.value = photo
  editForm.title = photo.title
  editForm.categoryId = photo.categoryId
  editForm.description = photo.description || ''
}

function closeEdit() {
  editingPhoto.value = null
}

async function saveEdit() {
  if (!editingPhoto.value) return
  saving.value = true
  try {
    await updatePhotoApi(editingPhoto.value.id, {
      title: editForm.title,
      categoryId: editForm.categoryId,
      description: editForm.description
    })
    ElMessage.success('保存成功')
    closeEdit()
    await loadPhotos()
  } catch (err) {
    ElMessage.error('保存失败: ' + (err.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// ===== 删除 =====

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定删除这张照片吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return // 用户取消
  }

  try {
    await deletePhotoApi(id)
    ElMessage.success('删除成功')
    selectedIds.value = selectedIds.value.filter(sid => sid !== id)
    currentPage.value = 1
    await loadPhotos()
  } catch (err) {
    ElMessage.error('删除失败: ' + (err.message || '未知错误'))
  }
}

async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 张照片吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await batchDeletePhotosApi(selectedIds.value)
    ElMessage.success(`成功删除 ${selectedIds.value.length} 张照片`)
    selectedIds.value = []
    currentPage.value = 1
    await loadPhotos()
  } catch (err) {
    ElMessage.error('批量删除失败: ' + (err.message || '未知错误'))
  }
}

// ===== 批量编辑 =====

const batchEditVisible = ref(false)
const batchSaving = ref(false)
const batchForm = reactive({ categoryId: null, appendTags: '' })

function openBatchEdit() {
  batchForm.categoryId = null
  batchForm.appendTags = ''
  batchEditVisible.value = true
}

function closeBatchEdit() {
  batchEditVisible.value = false
}

async function saveBatchEdit() {
  if (!batchForm.categoryId && !batchForm.appendTags.trim()) {
    ElMessage.warning('请至少选择一项修改')
    return
  }
  batchSaving.value = true
  try {
    await batchUpdatePhotosApi({
      ids: selectedIds.value,
      categoryId: batchForm.categoryId || undefined,
      appendTags: batchForm.appendTags.trim() || undefined
    })
    ElMessage.success('批量编辑成功')
    closeBatchEdit()
    selectedIds.value = []
    await loadPhotos()
  } catch (err) {
    ElMessage.error('批量编辑失败: ' + (err.message || '未知错误'))
  } finally {
    batchSaving.value = false
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input,
.filter-select {
  height: 36px;
  padding: 0 12px;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.search-input:focus,
.filter-select:focus {
  border-color: #378ADD;
}

.search-input {
  width: 220px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.btn-sm {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: inline-flex;
  align-items: center;
}

.btn-secondary {
  background: #f5f5f5;
  color: #555;
  border: 1.5px solid #ddd !important;
}

/* 表格 */
.photo-table-wrap {
  background: #fff;
  border-radius: 12px;
  border: 0.5px solid #eee;
  overflow-x: auto;
}

.photo-table {
  width: 100%;
  border-collapse: collapse;
}

.photo-table th {
  background: #fafafa;
  padding: 12px 14px;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  border-bottom: 1px solid #eee;
}

.photo-table td {
  padding: 12px 14px;
  font-size: 14px;
  border-bottom: 0.5px solid #f5f5f5;
  vertical-align: middle;
}

.photo-table tr:hover {
  background: #FAFDFF;
}

.rowSelected {
  background: #F5FAFF !important;
}

.thumb-cell {
  width: 48px;
  height: 40px;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 28px;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cat-tag {
  display: inline-block;
  padding: 2px 10px;
  background: #E6F1FB;
  color: #185FA5;
  border-radius: 10px;
  font-size: 12px;
}

.desc-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #888;
  font-size: 13px;
}

.action-btn {
  padding: 4px 10px;
  margin-right: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover { border-color: #378ADD; color: #378ADD; }
.del-btn:hover { border-color: #E24B4A; color: #E24B4A; }

.empty-state {
  text-align: center;
  padding: 50px;
  color: #aaa;
  font-size: 15px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 12px;
  align-items: center;
  margin-top: 20px;
}

.pagination button {
  padding: 6px 14px;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.pagination button:not(:disabled):hover {
  border-color: #378ADD;
  color: #378ADD;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 编辑弹窗 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.form-group textarea {
  height: auto;
  resize: vertical;
}

.modal-actions .btn-secondary {
  background: #f0f0f0;
  color: #555;
}
</style>
