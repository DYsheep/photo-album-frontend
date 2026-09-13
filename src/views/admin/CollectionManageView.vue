<template>
  <div class="collection-manage">
    <div class="page-header">
      <h2>合集管理</h2>
      <div style="display:flex;gap:8px;align-items:center;">
        <button v-if="dragChanged" class="btn-secondary btn-sm" @click="saveOrder" :disabled="savingOrder">
          {{ savingOrder ? '保存中...' : '保存排序' }}
        </button>
        <button class="btn-primary btn-sm" @click="openCreateDialog">
          <EmojiIcon name="plus" :size="16" class="icon-inline" /> 新建合集
        </button>
      </div>
    </div>

    <!-- 合集列表表格 -->
    <div class="table-container">
      <table class="data-table" v-if="collections.length > 0">
        <thead>
          <tr>
            <th style="width:30px"></th>
            <th style="width:50px">#</th>
            <th>名称</th>
            <th>照片数</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(col, index) in collections"
            :key="col.id"
            :draggable="true"
            @dragstart="onDragStart($event, index)"
            @dragover.prevent="onDragOver"
            @drop="onDrop($event, index)"
            @dragend="onDragEnd"
            :class="{ 'drag-over': dropIndex === index }"
          >
            <td class="drag-handle">⋮⋮</td>
            <td>{{ index + 1 }}</td>
            <td class="name-cell">{{ col.name }}</td>
            <td>{{ col.photoCount || 0 }}</td>
            <td>
              <span :class="col.isPublished === 1 ? 'status-published' : 'status-draft'">
                {{ col.isPublished === 1 ? '已发布' : '草稿' }}
              </span>
            </td>
            <td>{{ formatDateShort(col.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-btn" @click="managePhotos(col)" title="管理照片">
                <EmojiIcon name="framed-picture" :size="16" />
              </button>
              <button v-if="canManageCollections" class="action-btn" @click="openMembers(col)" title="协作者">
                <EmojiIcon name="people" :size="16" />
              </button>
              <button class="action-btn" @click="openEditDialog(col)" title="编辑">
                <EmojiIcon name="pencil" :size="16" />
              </button>
              <button class="action-btn danger" @click="confirmDelete(col)" title="删除">
                <EmojiIcon name="wastebasket" :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-table">
        <p>暂无合集，点击"新建合集"开始创建</p>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑合集' : '新建合集'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-position="top">
        <el-form-item label="合集名称" required>
          <el-input v-model="formData.name" placeholder="请输入合集名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入合集描述（选填）"
            maxlength="500"
          />
        </el-form-item>
        <el-form-item label="排序序号">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="发布状态">
          <el-switch
            v-model="formData.isPublishedBool"
            active-text="发布"
            inactive-text="草稿"
          />
        </el-form-item>
        <el-form-item label="私密状态">
          <el-switch
            v-model="formData.isPrivateBool"
            active-text="私密"
            inactive-text="公开"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          {{ isEditing ? '保存修改' : '创建合集' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除确认弹窗 -->
    <el-dialog v-model="deleteDialogVisible" title="确认删除" width="400px">
      <p style="text-align:center; font-size:15px;">
        确定要删除合集「{{ deleteTarget?.name }}」吗？<br />
        <span style="color:#888; font-size:13px;">此操作不可撤销</span>
      </p>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleDelete" :loading="deleting">确认删除</el-button>
      </template>
    </el-dialog>

    <!-- 管理照片弹窗 -->
    <el-dialog
      v-model="photoDialogVisible"
      :title="`管理照片 - ${manageTarget?.name}`"
      width="700px"
      :close-on-click-modal="false"
    >
      <!-- 已添加的照片 -->
      <div class="photo-manage-section">
        <h4>已添加的照片（{{ collectionPhotos.length }}）</h4>
        <div class="photo-thumb-grid" v-if="collectionPhotos.length > 0">
          <div v-for="photo in collectionPhotos" :key="photo.id" class="photo-thumb-item">
            <img :src="photo.thumbnailUrl || photo.url" :alt="photo.title" class="thumb-img" />
            <span class="thumb-title">{{ photo.title }}</span>
            <button class="thumb-remove" @click="removePhoto(photo.id)" title="移除">
              <EmojiIcon name="cross-mark" :size="14" />
            </button>
          </div>
        </div>
        <p v-else class="no-photos-hint">暂无照片</p>
      </div>

      <!-- 添加照片区域 -->
      <div class="photo-manage-section" style="margin-top:20px;">
        <h4>添加照片</h4>
        <div class="add-photo-controls">
          <el-select
            v-model="selectedPhotoId"
            placeholder="选择照片"
            filterable
            style="flex:1;"
          >
            <el-option
              v-for="photo in availablePhotos"
              :key="photo.id"
              :label="`#${photo.id} ${photo.title}`"
              :value="photo.id"
            />
          </el-select>
          <el-button type="primary" @click="addPhoto" :loading="addingPhoto" :disabled="!selectedPhotoId">
            添加
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="photoDialogVisible = false">完成</el-button>
      </template>
    </el-dialog>

    <!-- 协作者弹窗（对象级管理权：被指派的账号可维护该合集） -->
    <el-dialog v-model="memberDialogVisible" :title="`协作者 · ${memberCollection?.name || ''}`" width="520px">
      <el-table :data="members" size="small" empty-text="暂无协作者">
        <el-table-column label="账号" min-width="160">
          <template #default="{ row }">
            {{ row.nickname || row.username || ('#' + row.userId) }}
            <span style="color:var(--text-muted,#999);font-size:12px;">{{ row.username }}</span>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">{{ row.memberRole === 'editor' ? '可维护' : row.memberRole }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="danger" @click="removeMember(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display:flex;gap:8px;align-items:center;margin-top:16px;">
        <el-select v-model="selectedUserId" placeholder="选择账号" filterable style="flex:1;">
          <el-option
            v-for="u in candidateUsers"
            :key="u.id"
            :label="`${u.nickname || u.username} (${u.username})`"
            :value="u.id"
          />
        </el-select>
        <el-button type="primary" @click="addMember" :disabled="!selectedUserId">指派</el-button>
      </div>
      <p style="font-size:12px;color:var(--text-muted,#999);margin:8px 0 0;">
        协作者可维护该合集（改名、封面、增删合集内照片），但不具备全站管理权，也看不到其他合集。
      </p>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import {
  getAdminCollectionsApi,
  createCollectionApi,
  updateCollectionApi,
  deleteCollectionApi,
  addPhotoToCollectionApi,
  removePhotoFromCollectionApi,
  getCollectionDetailApi
} from '../../api/collection'
import { getPhotoListApi } from '../../api/photo'
import { reorderCollectionsApi, getCollectionMembersApi, addCollectionMemberApi, removeCollectionMemberApi } from '../../api/collection'
import { getUsersApi } from '../../api/user'
import { useAuthStore } from '../../stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateShort } from '../../utils/format'
import EmojiIcon from '../../components/EmojiIcon.vue'

const authStore = useAuthStore()

// ===== 合集列表 =====
const collections = ref([])

async function loadCollections() {
  try {
    const res = await getAdminCollectionsApi()
    if (res.code === 200 && res.data) {
      collections.value = res.data
    }
  } catch (err) {
    console.error('加载合集列表失败:', err)
    collections.value = []
  }
}

// ===== 新建/编辑弹窗 =====
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const saving = ref(false)

const formData = reactive({
  name: '',
  description: '',
  sortOrder: 0,
  isPublishedBool: true,
  isPrivateBool: false
})

function openCreateDialog() {
  isEditing.value = false
  editingId.value = null
  formData.name = ''
  formData.description = ''
  formData.sortOrder = 0
  formData.isPublishedBool = true
  formData.isPrivateBool = false
  dialogVisible.value = true
}

function openEditDialog(col) {
  isEditing.value = true
  editingId.value = col.id
  formData.name = col.name || ''
  formData.description = col.description || ''
  formData.sortOrder = col.sortOrder || 0
  formData.isPublishedBool = col.isPublished === 1
  formData.isPrivateBool = col.isPrivate === 1
  dialogVisible.value = true
}

async function handleSave() {
  if (!formData.name.trim()) {
    ElMessage.warning('请输入合集名称')
    return
  }

  saving.value = true
  try {
    const data = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      sortOrder: formData.sortOrder,
      isPublished: formData.isPublishedBool ? 1 : 0,
      isPrivate: formData.isPrivateBool ? 1 : 0
    }

    let res
    if (isEditing.value) {
      res = await updateCollectionApi(editingId.value, data)
    } else {
      res = await createCollectionApi(data)
    }

    if (res.code === 200) {
      ElMessage.success(isEditing.value ? '合集已更新' : '合集已创建')
      dialogVisible.value = false
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (err) {
    console.error('保存合集失败:', err)
    ElMessage.error('操作失败，请重试')
  } finally {
    saving.value = false
    await nextTick()
    await loadCollections()
  }
}

// ===== 删除 =====
const deleteDialogVisible = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

function confirmDelete(col) {
  deleteTarget.value = col
  deleteDialogVisible.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const res = await deleteCollectionApi(deleteTarget.value.id)
    if (res.code === 200) {
      ElMessage.success('合集已删除')
      deleteDialogVisible.value = false
      deleteTarget.value = null
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (err) {
    console.error('删除合集失败:', err)
    ElMessage.error('删除失败，请重试')
  } finally {
    deleting.value = false
    await nextTick()
    await loadCollections()
  }
}

// ===== 管理照片弹窗 =====
const photoDialogVisible = ref(false)
const manageTarget = ref(null)
const collectionPhotos = ref([])
const allPhotos = ref([])
const selectedPhotoId = ref(null)
const addingPhoto = ref(false)

// 可添加的照片（排除已在合集中的）
const availablePhotos = computed(() => {
  const existingIds = new Set(collectionPhotos.value.map(p => p.id))
  return allPhotos.value.filter(p => !existingIds.has(p.id))
})

async function managePhotos(col) {
  manageTarget.value = col
  photoDialogVisible.value = true
  selectedPhotoId.value = null

  // 加载合集照片
  try {
    const res = await getCollectionDetailApi(col.id)
    if (res.code === 200 && res.data) {
      collectionPhotos.value = res.data
    } else {
      collectionPhotos.value = []
    }
  } catch {
    collectionPhotos.value = []
  }

  // 加载全部照片（用于选择器）
  try {
    const res = await getPhotoListApi({ pageSize: 500 })
    if (res.code === 200 && res.data) {
      allPhotos.value = res.data.list || []
    }
  } catch {
    allPhotos.value = []
  }
}

async function addPhoto() {
  if (!selectedPhotoId.value || !manageTarget.value) return
  addingPhoto.value = true
  try {
    const res = await addPhotoToCollectionApi(manageTarget.value.id, selectedPhotoId.value)
    if (res.code === 200) {
      ElMessage.success('照片已添加')
      selectedPhotoId.value = null
      // 刷新合集照片
      const detailRes = await getCollectionDetailApi(manageTarget.value.id)
      if (detailRes.code === 200 && detailRes.data) {
        collectionPhotos.value = detailRes.data
      }
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (err) {
    console.error('添加照片失败:', err)
    ElMessage.error('添加失败，请重试')
  } finally {
    addingPhoto.value = false
  }
}

async function removePhoto(photoId) {
  if (!manageTarget.value) return
  try {
    const res = await removePhotoFromCollectionApi(manageTarget.value.id, photoId)
    if (res.code === 200) {
      ElMessage.success('照片已移除')
      collectionPhotos.value = collectionPhotos.value.filter(p => p.id !== photoId)
    } else {
      ElMessage.error(res.message || '移除失败')
    }
  } catch (err) {
    console.error('移除照片失败:', err)
    ElMessage.error('移除失败，请重试')
  }
}

// ===== 拖拽排序 =====
const dragIndex = ref(-1)
const dropIndex = ref(-1)
const dragChanged = ref(false)
const savingOrder = ref(false)

function onDragStart(e, index) {
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(e) {
  e.dataTransfer.dropEffect = 'move'
}

function onDrop(e, index) {
  dropIndex.value = -1
  if (dragIndex.value === -1 || dragIndex.value === index) return
  const item = collections.value.splice(dragIndex.value, 1)[0]
  collections.value.splice(index, 0, item)
  dragChanged.value = true
}

function onDragEnd() {
  dragIndex.value = -1
  dropIndex.value = -1
}

async function saveOrder() {
  savingOrder.value = true
  try {
    const orderList = collections.value.map((col, i) => ({ id: col.id, sortOrder: i }))
    const res = await reorderCollectionsApi(orderList)
    if (res.code === 200) {
      ElMessage.success('排序已保存')
      dragChanged.value = false
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (err) {
    console.error('保存排序失败:', err)
    ElMessage.error('保存失败，请重试')
  } finally {
    savingOrder.value = false
  }
}

// ===== 协作者（对象级管理权） =====
const memberDialogVisible = ref(false)
const memberCollection = ref(null)
const members = ref([])
const selectedUserId = ref(null)
const candidateUsers = ref([])
/** 指派协作者需要全站管理权限（协作者本人只能查看） */
const canManageCollections = computed(() => authStore.isAdmin === true || authStore.canManage === true)

async function openMembers(col) {
  memberCollection.value = col
  memberDialogVisible.value = true
  selectedUserId.value = null
  await loadMembers()
  if (canManageCollections.value) {
    try {
      const res = await getUsersApi()
      candidateUsers.value = (res.code === 200 && res.data) ? res.data : []
    } catch { candidateUsers.value = [] }
  }
}

async function loadMembers() {
  try {
    const res = await getCollectionMembersApi(memberCollection.value.id)
    members.value = (res.code === 200 && res.data) ? res.data : []
  } catch { members.value = [] }
}

async function addMember() {
  if (!selectedUserId.value) return
  try {
    await addCollectionMemberApi(memberCollection.value.id, selectedUserId.value)
    ElMessage.success('已指派')
    selectedUserId.value = null
    await loadMembers()
  } catch { ElMessage.error('指派失败') }
}

async function removeMember(row) {
  try {
    await removeCollectionMemberApi(memberCollection.value.id, row.userId)
    ElMessage.success('已移除')
    await loadMembers()
  } catch { ElMessage.error('移除失败') }
}

onMounted(() => {
  loadCollections()
})
</script>

<style scoped>
.collection-manage {
  /* admin layout handles padding */
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 18px;
  color: var(--text-primary, #333);
  margin: 0;
  font-weight: 500;
}

/* 表格样式 */
.table-container {
  background: var(--bg-card, #fff);
  border-radius: 10px;
  border: 0.5px solid var(--border-light, #eee);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  background: var(--bg-secondary, #f0f2f5);
  padding: 12px 16px;
  text-align: left;
  font-weight: 500;
  color: var(--text-regular, #555);
  font-size: 13px;
  border-bottom: 0.5px solid var(--border-light, #eee);
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 0.5px solid var(--border-lighter, #f5f5f5);
  color: var(--text-secondary, #333);
}

.name-cell {
  font-weight: 500;
}

.status-published {
  display: inline-block;
  padding: 2px 10px;
  background: var(--color-primary-light, #E6F1FB);
  color: var(--color-primary-dark, #185FA5);
  border-radius: 10px;
  font-size: 12px;
}

.status-draft {
  display: inline-block;
  padding: 2px 10px;
  background: #f0f0f0;
  color: #888;
  border-radius: 10px;
  font-size: 12px;
}

.action-cell {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: 0.5px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-card, #fff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--color-primary, #378ADD);
  background: var(--color-primary-light, #F5FAFF);
}

.action-btn.danger:hover {
  border-color: var(--color-danger, #E24B4A);
  background: #FDF0F0;
}

.empty-table {
  text-align: center;
  padding: 60px 0;
  color: var(--text-placeholder, #aaa);
  font-size: 14px;
}

/* 照片管理弹窗 */
.photo-manage-section h4 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-regular, #555);
  margin: 0 0 12px;
}

.photo-thumb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  max-height: 240px;
  overflow-y: auto;
}

.photo-thumb-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-hover, #f5f5f5);
  border: 0.5px solid var(--border-light, #eee);
}

.thumb-img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
}

.thumb-title {
  display: block;
  padding: 4px 6px;
  font-size: 11px;
  color: var(--text-regular, #555);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumb-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.photo-thumb-item:hover .thumb-remove {
  opacity: 1;
}

.no-photos-hint {
  color: var(--text-placeholder, #aaa);
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}

.add-photo-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 拖拽排序 */
.drag-handle {
  cursor: grab;
  color: var(--text-muted, #ccc);
  font-size: 14px;
  user-select: none;
  padding: 12px 6px !important;
}
.drag-handle:active { cursor: grabbing; }
.data-table tr.drag-over td {
  border-top: 2px solid var(--color-primary, #378ADD);
}
</style>
