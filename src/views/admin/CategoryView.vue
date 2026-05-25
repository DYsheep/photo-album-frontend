<template>
  <div class="category-manage">
    <!-- 工具栏 -->
    <div class="toolbar">
      <h3>分类列表</h3>
      <button class="btn-primary" @click="openAdd">+ 新建分类</button>
    </div>

    <!-- 分类卡片网格 -->
    <div class="category-grid">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="category-card"
      >
        <div class="card-header">
          <span class="cat-name">{{ cat.name }}</span>
          <span class="cat-count">{{ cat.photoCount ?? 0 }} 张照片</span>
        </div>
        <p class="cat-desc">{{ cat.description || '暂无描述' }}</p>
        <div class="card-actions">
          <button class="action-btn edit-btn" @click="openEdit(cat)"><EmojiIcon name="pencil" :size="14" class="icon-inline" /> 编辑</button>
          <button
            class="action-btn del-btn"
            :disabled="(cat.photoCount ?? 0) > 0"
            @click="handleDelete(cat)"
          >
            <EmojiIcon name="wastebasket" :size="14" class="icon-inline" /> 删除
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="categories.length === 0 && !loading" class="empty-state">
        暂无分类，点击上方按钮创建
      </div>
      <div v-if="loading" class="empty-state">加载中...</div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal-content">
        <h3>{{ editingId ? '编辑分类' : '新建分类' }}</h3>
        <div class="form-group">
          <label>分类名称</label>
          <input v-model="form.name" placeholder="例如：风景、人像、街拍..." />
        </div>
        <div class="form-group">
          <label>描述（可选）</label>
          <textarea v-model="form.description" rows="3" placeholder="简单描述这个分类..."></textarea>
        </div>
        <div class="form-group">
          <label>排序权重</label>
          <input v-model.number="form.sortOrder" type="number" min="0" placeholder="数字越小越靠前" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeForm">取消</button>
          <button class="btn-primary" @click="handleSubmit" :disabled="!form.name || saving">
            {{ saving ? '保存中...' : (editingId ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getCategoryListApi, createCategoryApi, updateCategoryApi, deleteCategoryApi } from '../../api/category'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmojiIcon from '../../components/EmojiIcon.vue'

const categories = ref([])
const loading = ref(false)

// 表单状态
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const form = reactive({
  name: '',
  description: '',
  sortOrder: 0
})

// ===== 数据加载 =====

async function loadCategories() {
  loading.value = true
  try {
    const res = await getCategoryListApi()
    categories.value = res.data || []
  } catch (err) {
    console.error('加载分类失败:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategories()
})

// ===== 表单操作 =====

function openAdd() {
  editingId.value = null
  form.name = ''
  form.description = ''
  form.sortOrder = 0
  showForm.value = true
}

function openEdit(cat) {
  editingId.value = cat.id
  form.name = cat.name
  form.description = cat.description || ''
  form.sortOrder = cat.sortOrder ?? 0
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

async function handleSubmit() {
  if (!form.name.trim()) return
  saving.value = true

  try {
    if (editingId.value) {
      await updateCategoryApi(editingId.value, {
        name: form.name,
        description: form.description,
        sortOrder: form.sortOrder
      })
      ElMessage.success('分类已更新')
    } else {
      await createCategoryApi({
        name: form.name,
        description: form.description,
        sortOrder: form.sortOrder
      })
      ElMessage.success('分类已创建')
    }
    closeForm()
    await loadCategories()
  } catch (err) {
    const msg = err.response?.data?.message || err.message || '操作失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

async function handleDelete(cat) {
  if ((cat.photoCount ?? 0) > 0) {
    ElMessage.warning('该分类下还有照片，无法删除')
    return
  }

  try {
    await ElMessageBox.confirm(`确定删除分类「${cat.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteCategoryApi(cat.id)
    ElMessage.success('分类已删除')
    await loadCategories()
  } catch (err) {
    const msg = err.response?.data?.message || err.message || '删除失败'
    ElMessage.error(msg)
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
}

.toolbar h3 {
  font-size: 17px;
  color: #333;
  font-weight: 500;
}

.btn-primary {
  padding: 9px 20px;
  border-radius: 6px;
  background: #378ADD;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-primary:hover { background: #185FA5; }
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 分类卡片 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.category-card {
  background: #fff;
  border: 0.5px solid #eee;
  border-radius: 12px;
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.cat-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.cat-count {
  font-size: 12px;
  color: #999;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.cat-desc {
  font-size: 13px;
  color: #888;
  margin-bottom: 14px;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 0.5px solid #f5f5f5;
}

.action-btn {
  padding: 5px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover { border-color: #378ADD; color: #378ADD; }
.del-btn:hover { border-color: #E24B4A; color: #E24B4A; }
.del-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 50px;
  color: #aaa;
  font-size: 15px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 14px;
  padding: 28px;
  width: 480px;
  max-width: 90vw;
}

.modal-content h3 {
  font-size: 17px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #378ADD;
}

.form-group textarea {
  height: auto;
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.btn-secondary {
  padding: 9px 22px;
  border-radius: 6px;
  background: #f0f0f0;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  border: none;
}
</style>
