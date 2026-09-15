<template>
  <div class="collection-manage">
    <div class="page-header">
      <h2>合集管理</h2>
      <div class="row-actions">
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
      <table class="data-table collection-table-desktop" v-if="collections.length > 0">
        <thead>
          <tr>
            <th class="col-drag"></th>
            <th class="col-index">#</th>
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
              <button class="action-btn" @click="openShareDialog(col)" title="分享">
                <EmojiIcon name="outbox-tray" :size="16" />
              </button>              <button v-if="canManageCollections" class="action-btn" @click="openMembers(col)" title="协作者">
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

      <!-- 移动端：卡片列表（操作按钮直接可见，无需横向滑动）；桌面端由媒体查询隐藏 -->
      <div v-if="collections.length > 0" class="collection-cards">
        <div v-for="col in collections" :key="col.id" class="collection-card">
          <div class="collection-card-head">
            <span class="collection-card-name">{{ col.name }}</span>
            <span class="collection-card-badge" :class="col.isPublished === 1 ? 'is-published' : 'is-draft'">
              {{ col.isPublished === 1 ? '已发布' : '草稿' }}
            </span>
          </div>
          <div class="collection-card-meta">
            <span>{{ col.photoCount || 0 }} 张照片</span>
            <span>排序 {{ col.sortOrder || 0 }}</span>
            <span>创建于 {{ formatDateShort(col.createdAt) }}</span>
          </div>
          <div class="collection-card-desc">{{ col.description || '暂无描述' }}</div>
          <div class="collection-card-actions">
            <button class="btn-sm btn-secondary" @click="managePhotos(col)">管理照片</button>
            <button v-if="canManageCollections" class="btn-sm btn-secondary" @click="openMembers(col)">协作者</button>
            <button class="btn-sm btn-secondary" @click="openShareDialog(col)">分享</button>
            <button class="btn-sm btn-secondary" @click="openEditDialog(col)">编辑</button>
            <button class="btn-sm btn-danger" @click="confirmDelete(col)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <!-- 分享合集（自研模态：有效期 / 含私密开关 / 可选口令 / 链接复制） -->
    <div v-if="shareDialogVisible" class="modal-overlay" @click.self="shareDialogVisible = false">
      <div class="modal-content modal-collection">
        <h3>分享合集 · {{ shareTarget && shareTarget.name }}</h3>

        <div class="form-group">
          <label>有效期</label>
          <select v-model="shareForm.expiry">
            <option value="permanent">永久有效</option>
            <option value="7">7 天</option>
            <option value="30">30 天</option>
          </select>
        </div>

        <div class="form-group">
          <label class="check-inline">
            <input type="checkbox" v-model="shareForm.includePrivate" />
            包含私密照片（以你的可见范围为准，你列入黑名单的照片不会出现）
          </label>
        </div>

        <div class="form-group">
          <label>访问口令（可选）</label>
          <input v-model="shareForm.accessCode" placeholder="留空表示无需口令" maxlength="32" />
        </div>

        <div v-if="shareResultUrl" class="form-group share-result">
          <label>分享链接</label>
          <div class="share-url-row">
            <input :value="shareResultUrl" readonly @focus="$event.target.select()" />
            <button class="btn-primary btn-sm" @click="copyShareUrl">复制</button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="shareDialogVisible = false">关闭</button>
          <button class="btn-primary" @click="submitShare" :disabled="shareSaving">
            {{ shareSaving ? '处理中…' : (shareResultUrl ? '更新分享设置' : '生成分享链接') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 新建/编辑合集（自研模态：不依赖 Element Plus 弹窗内部渲染，兼容性更稳） -->
    <div v-if="dialogVisible" class="modal-overlay" @click.self="dialogVisible = false">
      <div class="modal-content modal-collection">
        <h3>{{ isEditing ? '编辑合集' : '新建合集' }}</h3>

        <div class="form-group">
          <label>合集名称 *</label>
          <input v-model="formData.name" placeholder="请输入合集名称" maxlength="100" />
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea v-model="formData.description" rows="3" placeholder="请输入合集描述（选填）" maxlength="500"></textarea>
        </div>

        <div class="form-group">
          <label>排序序号</label>
          <input v-model.number="formData.sortOrder" type="number" min="0" max="999" />
        </div>

        <div class="form-group">
          <label>发布状态</label>
          <label class="check-inline">
            <input type="checkbox" v-model="formData.isPublishedBool" />
            发布（不勾选则为草稿）
          </label>
        </div>

        <div v-if="canManageCollections" class="form-group">
          <label>私密状态</label>
          <label class="check-inline">
            <input type="checkbox" v-model="formData.isPrivateBool" />
            私密（仅授权账号可见）
          </label>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="dialogVisible = false">取消</button>
          <button class="btn-primary" @click="handleSave" :disabled="saving">
            {{ saving ? '保存中…' : (isEditing ? '保存修改' : '创建合集') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <el-dialog v-model="deleteDialogVisible" title="确认删除" width="400px">
      <p class="delete-confirm">
        确定要删除合集「{{ deleteTarget?.name }}」吗？<br />
        <span class="cell-muted">此操作不可撤销</span>
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
      <div class="photo-manage-section mt-lg">
        <h4>添加照片</h4>
        <div class="add-photo-controls">
          <el-select
            v-model="selectedPhotoId"
            placeholder="选择照片"
            filterable
            class="grow"
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
            <span class="cell-muted">{{ row.username }}</span>
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

      <div class="field-row">
        <el-select v-model="selectedUserId" placeholder="选择账号" filterable class="grow">
          <el-option
            v-for="u in candidateUsers"
            :key="u.id"
            :label="`${u.nickname || u.username} (${u.username})`"
            :value="u.id"
          />
        </el-select>
        <el-button type="primary" @click="addMember" :disabled="!selectedUserId">指派</el-button>
      </div>
      <p class="cell-muted hint-block">
        协作者可维护该合集（改名、封面、增删合集内照片），但不具备全站管理权，也看不到其他合集。
      </p>
    </el-dialog>
  </div>
</template>

<script setup>
import { createCollectionShareApi } from '../../api/share'
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

// ===== 分享合集 =====
const shareDialogVisible = ref(false)
const shareTarget = ref(null)
const shareSaving = ref(false)
const shareResultUrl = ref('')
const shareForm = reactive({ expiry: 'permanent', includePrivate: false, accessCode: '' })

/** 打开分享弹窗 */
function openShareDialog(col) {
  shareTarget.value = col
  shareResultUrl.value = ''
  shareForm.expiry = 'permanent'
  shareForm.includePrivate = false
  shareForm.accessCode = ''
  shareDialogVisible.value = true
}

/** 有效期 → ISO（永久返回 undefined） */
function shareExpiryIso() {
  if (shareForm.expiry === 'permanent') return undefined
  const days = Number(shareForm.expiry)
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString()
}

/** 提交（生成或更新分享设置） */
async function submitShare() {
  if (!shareTarget.value) return
  shareSaving.value = true
  try {
    const res = await createCollectionShareApi(shareTarget.value.id, {
      expiresAt: shareExpiryIso(),
      includePrivate: shareForm.includePrivate,
      accessCode: shareForm.accessCode.trim() || undefined
    })
    if (res.code === 200 && res.data && res.data.shareUrl) {
      shareResultUrl.value = res.data.shareUrl
      ElMessage.success('分享链接已生成')
    } else {
      ElMessage.error(res.message || '生成失败')
    }
  } catch (e) {
    ElMessage.error('生成失败，请稍后重试')
  } finally {
    shareSaving.value = false
  }
}

/** 复制链接 */
async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(shareResultUrl.value)
    ElMessage.success('链接已复制')
  } catch (e) {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}
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

/* 表格样式（视觉对齐页面内 el-table） */
.table-container {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  border: 0.5px solid var(--border-light, #eee);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  background: var(--bg-hover, #f5f5f5);
  padding: 10px 16px;
  text-align: left;
  font-weight: 500;
  color: var(--text-regular, #555);
  font-size: 13px;
  border-bottom: 1px solid var(--border-light, #eee);
}

.data-table td {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-secondary, #333);
  border-bottom: 1px solid var(--border-light, #eee);
}

.data-table tbody tr:hover {
  background: var(--bg-hover, #f5f5f5);
}

/* 拖拽手柄列 / 序号列固定宽度 */
.col-drag {
  width: 30px;
}

.col-index {
  width: 50px;
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

/* 删除确认弹窗文案 */
.delete-confirm {
  text-align: center;
  font-size: 15px;
}

/* 表单控件行：下拉 + 按钮横向排列 */
.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

/* 弹窗内说明段落（配合 .cell-muted 使用） */
.hint-block {
  margin: 8px 0 0;
}

/* 撑满剩余宽度的表单控件 */
.grow {
  flex: 1;
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
  padding: 10px 6px !important;
}
.drag-handle:active { cursor: grabbing; }
.data-table tr.drag-over td {
  border-top: 2px solid var(--color-primary, #378ADD);
}

/* ============================================================
   移动端合集卡片列表：颜色一律走 theme.css 设计令牌，不写死色值；
   默认隐藏，≤768px 时替换表格（与 UserManageView / PhotoManageView 同一套模式）。
   ============================================================ */
.collection-cards {
  display: none;
}

.collection-card {
  padding: 14px;
  border: 0.5px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-card);
}

.collection-card + .collection-card {
  margin-top: 10px;
}

.collection-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.collection-card-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collection-card-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  white-space: nowrap;
}

.collection-card-badge.is-published {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.collection-card-badge.is-draft {
  background: var(--bg-hover);
  color: var(--text-muted);
}

.collection-card-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.collection-card-desc {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collection-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  .collection-table-desktop {
    display: none;
  }

  .collection-cards {
    display: block;
  }

  /* 触摸热区 ≥44px，按钮均分整行宽度 */
  .collection-card-actions .btn-sm {
    flex: 1;
    justify-content: center;
    min-height: 44px;
    padding: 10px 8px;
    font-size: 14px;
    white-space: nowrap;
  }
}

/* 新建/编辑合集：自研模态内的表单控件样式（与站内 .form-group 约定一致） */
.modal-collection {
  width: 520px;
  max-width: 92vw;
}

.modal-collection .form-group {
  margin-bottom: 14px;
}

.modal-collection input[type="text"],
.modal-collection input[type="number"],
.modal-collection input:not([type]),
.modal-collection textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #333);
}

.modal-collection input:focus,
.modal-collection textarea:focus {
  outline: none;
  border-color: var(--color-primary, #378ADD);
}

.check-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-regular, #555);
  cursor: pointer;
  min-height: 36px;
}

.check-inline input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary, #378ADD);
}

/* 分享弹窗：链接展示与复制 */
.share-url-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.share-url-row input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  font-size: 13px;
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #333);
}
</style>
