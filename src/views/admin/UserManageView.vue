<template>
  <div class="user-manage">
    <div class="page-header">
      <h2>用户管理</h2>
      <button class="btn-primary btn-sm" @click="openCreate">新建用户</button>
    </div>

    <!-- 用户列表：与同页审计表统一使用 Element Plus 表格（其暗色变量已在 theme.css 中映射） -->
    <el-table v-if="users.length" :data="users" class="table-full">
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column label="昵称" min-width="120">
        <template #default="{ row }">{{ row.nickname || '-' }}</template>
      </el-table-column>
      <el-table-column label="角色" width="110">
        <template #default="{ row }">
          <span :class="row.role === 'admin' ? 'role-admin' : row.role === 'viewer' ? 'role-viewer' : 'role-user'">
            {{ roleLabel(row.role) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="能力" min-width="220">
        <template #default="{ row }">
          <span v-if="row.role === 'admin'" class="cap-badge cap-all">全部</span>
          <template v-else>
            <span v-if="row.canViewPrivate === 1" class="cap-badge cap-private">私密</span>
            <span v-if="row.canUpload === 1" class="cap-badge cap-upload">上传</span>
            <span v-if="row.canManage === 1" class="cap-badge cap-manage">管理</span>
            <span v-if="!row.canViewPrivate && !row.canUpload && !row.canManage" class="cap-none">仅浏览</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210">
        <template #default="{ row }">
          <div class="row-actions">
            <button class="btn-sm btn-secondary" @click="openEdit(row)">编辑</button>
            <button class="btn-sm btn-secondary" @click="openPermissions(row)">权限</button>
            <button v-if="row.role !== 'admin'" class="btn-sm btn-danger" @click="confirmDelete(row)">删除</button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <div v-else class="empty-state">暂无用户</div>

    <!-- 操作审计（授权与账号管理动作） -->
    <div class="audit-card card-panel mt-lg">
      <div class="flex-between audit-head">
        <h3 class="audit-title">操作审计<span class="cell-muted audit-count">最近 {{ auditLogs.length }} 条</span></h3>
        <button class="btn-secondary btn-sm" @click="loadAuditLogs">刷新</button>
      </div>
      <el-table :data="auditLogs" size="small" empty-text="暂无审计记录">
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="actorName" label="操作人" width="110" />
        <el-table-column label="动作" width="110">
          <template #default="{ row }">{{ actionLabel(row.action) }}</template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="280" />
        <el-table-column prop="ip" label="来源IP" width="130" />
      </el-table>
    </div>

    <!-- 创建 / 编辑弹窗 -->
    <div v-if="dialogVisible" class="modal-overlay" @click.self="dialogVisible = false">
      <div class="modal-content modal-narrow">
        <h3>{{ editingUser ? '编辑用户' : '新建用户' }}</h3>
        <div class="form-group">
          <label>用户名</label>
          <input v-model="form.username" :disabled="!!editingUser" />
        </div>
        <div class="form-group">
          <label>密码{{ editingUser ? '（留空不修改）' : '' }}</label>
          <input v-model="form.password" type="password" />
        </div>
        <div class="form-group">
          <label>昵称</label>
          <input v-model="form.nickname" />
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="form.role">
            <option value="user">普通用户</option>
            <option value="viewer">查看者</option>
            <option value="admin">管理员</option>
          </select>
          <p class="form-hint">角色仅作标识，实际权限由下方能力位决定</p>
        </div>
        <div class="form-group">
          <label>能力</label>
          <div class="perm-checks">
            <label class="check-label">
              <input type="checkbox" v-model="form.canViewPrivate" /> 可查看私密内容
            </label>
            <label class="check-label">
              <input type="checkbox" v-model="form.canUpload" /> 可上传照片
            </label>
            <label class="check-label">
              <input type="checkbox" v-model="form.canManage" /> 可管理内容（照片/分类/标签/合集/分享）
            </label>
          </div>
          <p class="form-hint">"可查看私密内容"只表示具备能力，具体能看到哪些仍需在"权限"弹窗中逐项授权</p>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="dialogVisible = false">取消</button>
          <button class="btn-primary" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 权限弹窗 -->
    <div v-if="permVisible" class="modal-overlay" @click.self="permVisible = false">
      <div class="modal-content modal-medium">
        <h3>{{ permUser?.username }} 的访问权限</h3>
        <p class="perm-hint">默认看不到任何私密内容；白名单定义可见范围（全局=全部私密；照片/合集/分类=指定对象，合集与分类会级联到其内部照片）；黑名单在白名单范围内排除</p>
        <p class="perm-preview" v-if="preview">
          当前可见范围：共 {{ preview.totalPhotos }} 张，其中私密 {{ preview.privatePhotos }} 张（该账号可见私密 {{ preview.visiblePrivatePhotos }} 张）
        </p>
        <div v-for="(p, i) in permissions" :key="p.id" class="perm-row">
          <span :class="p.permType === 'W' ? 'tag-whitelist' : 'tag-blacklist'">{{ p.permType === 'W' ? '白名单' : '黑名单' }}</span>
          <img v-if="p.thumbUrl" :src="p.thumbUrl" class="perm-thumb" />
          <span class="perm-name">{{ permLabel(p) }}</span>
          <span class="perm-meta">{{ permMeta(p) }}</span>
          <button class="btn-sm btn-danger" @click="removePerm(p.id)">删除</button>
        </div>
        <div v-if="!permissions.length" class="empty-state perm-empty">无授权条目，该账号看不到任何私密内容</div>
        <hr />
        <div class="perm-add-row">
          <select v-model="newPerm.type" class="select-type">
            <option value="W">白名单（定义可见范围）</option>
            <option value="B">黑名单（在范围内排除）</option>
          </select>
          <select v-model="newPerm.targetType" class="select-target">
            <option value="global">全局</option>
            <option value="photo">照片</option>
            <option value="collection">合集</option>
            <option value="category">分类</option>
            <option value="tag">标签</option>
          </select>
          <template v-if="newPerm.targetType === 'global'">
            <button class="btn-primary btn-sm" @click="addGlobalPerm">添加</button>
          </template>
          <template v-else>
            <button class="btn-primary btn-sm" @click="openSelector">选择</button>
            <span v-if="selectedItem" class="selected-preview">
              <img v-if="selectedItem.thumb" :src="selectedItem.thumb" class="perm-thumb" />
              {{ selectedItem.name }}
            </span>
            <button v-if="selectedItem" class="btn-primary btn-sm" @click="addPerm">添加</button>
          </template>
        </div>
        <div class="modal-actions mt-md">
          <button class="btn-secondary" @click="permVisible = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 选择器弹窗 -->
    <div v-if="selectorVisible" class="modal-overlay" @click.self="selectorVisible = false">
      <div class="modal-content modal-wide">
        <h3>选择{{ newPerm.targetType === 'photo' ? '照片' : '合集' }}</h3>
        <input v-model="selectorKeyword" placeholder="搜索..." class="filter-input selector-search" />
        <div class="selector-grid">
          <div
            v-for="item in filteredSelectorItems"
            :key="item.id"
            class="selector-card"
            :class="{ selected: selectedItem && selectedItem.id === item.id }"
            @click="selectItem(item)"
          >
            <img v-if="item.thumb" :src="item.thumb" class="selector-thumb" />
            <div v-else class="selector-no-thumb">无封面</div>
            <div class="selector-name">{{ item.name }}</div>
          </div>
        </div>
        <div v-if="!filteredSelectorItems.length" class="empty-state selector-empty">无匹配结果</div>
        <div class="modal-actions selector-actions">
          <button class="btn-secondary" @click="selectorVisible = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { getUsersApi, createUserApi, updateUserApi, deleteUserApi, getUserPermissionsApi, addUserPermissionApi, removeUserPermissionApi, getAuditLogsApi, getUserPreviewApi } from '../../api/user'
import { getPhotoListApi } from '../../api/photo'
import { getCategoryListApi } from '../../api/category'
import { getAdminTagListApi } from '../../api/admin-tag'
import { getAdminCollectionsApi } from '../../api/collection'
import { ElMessage, ElMessageBox } from 'element-plus'

const users = ref([])
const dialogVisible = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const form = reactive({ username: '', password: '', nickname: '', role: 'user', canUpload: false, canManage: false, canViewPrivate: false })

const auditLogs = ref([])
/** 当前账号的可见范围预览 */
const preview = ref(null)

const permVisible = ref(false)
const permUser = ref(null)
const permissions = ref([])
const newPerm = reactive({ type: 'W', targetType: 'photo' })
const selectorVisible = ref(false)
const selectorItems = ref([])
const selectorKeyword = ref('')
const selectedItem = ref(null)

const filteredSelectorItems = computed(() => {
  if (!selectorKeyword.value) return selectorItems.value
  const kw = selectorKeyword.value.toLowerCase()
  return selectorItems.value.filter(i => i.name.toLowerCase().includes(kw))
})

function roleLabel(r) {
  return { admin: '管理员', viewer: '查看者', user: '普通用户' }[r] || r
}
function formatDate(d) { return d ? d.substring(0, 10) : '' }
function formatDateTime(d) {
  if (!d) return '-'
  return String(d).replace('T', ' ').slice(0, 16)
}

const ACTION_LABELS = {
  GRANT_ADD: '新增授权',
  GRANT_REMOVE: '移除授权',
  USER_CREATE: '创建账号',
  USER_UPDATE: '修改账号',
  USER_DELETE: '删除账号',
  LOGIN_SUCCESS: '登录成功',
  LOGIN_FAIL: '登录失败'
}
function actionLabel(action) {
  return ACTION_LABELS[action] || action
}

/** 授权条目元信息：操作人 + 授权时间 */
function permMeta(p) {
  const actor = users.value.find(u => u.id === p.createdBy)
  const who = actor ? actor.username : (p.createdBy ? '#' + p.createdBy : '系统')
  const when = formatDateTime(p.createdAt)
  return when === '-' ? who : `${who} · ${when}`
}

async function loadUsers() {
  const res = await getUsersApi()
  if (res.code === 200) users.value = res.data || []
}

async function loadAuditLogs() {
  try {
    const res = await getAuditLogsApi(50)
    if (res.code === 200) auditLogs.value = res.data || []
  } catch (err) {
    console.error('获取审计日志失败:', err)
  }
}

function openCreate() {
  editingUser.value = null
  form.username = ''; form.password = ''; form.nickname = ''; form.role = 'user'
  form.canUpload = false; form.canManage = false; form.canViewPrivate = false
  dialogVisible.value = true
}
function openEdit(u) {
  editingUser.value = u
  form.username = u.username; form.password = ''; form.nickname = u.nickname; form.role = u.role
  form.canUpload = u.canUpload === 1
  form.canManage = u.canManage === 1
  form.canViewPrivate = u.canViewPrivate === 1
  dialogVisible.value = true
}
async function handleSave() {
  saving.value = true
  const data = { nickname: form.nickname, role: form.role, password: form.password || undefined,
    canUpload: form.canUpload ? '1' : '0', canManage: form.canManage ? '1' : '0',
    canViewPrivate: form.canViewPrivate ? '1' : '0' }
  try {
    if (editingUser.value) {
      await updateUserApi(editingUser.value.id, data)
      ElMessage.success('用户已更新')
    } else {
      if (!form.username || !form.password) { ElMessage.warning('用户名和密码必填'); saving.value = false; return }
      data.username = form.username; data.password = form.password
      await createUserApi(data)
      ElMessage.success('用户已创建')
    }
    dialogVisible.value = false
    loadUsers()
  } catch { ElMessage.error('操作失败') }
  saving.value = false
}
async function confirmDelete(u) {
  try {
    await ElMessageBox.confirm(`确定删除用户 ${u.username}？`, '确认', { type: 'warning' })
    await deleteUserApi(u.id)
    ElMessage.success('已删除')
    loadUsers()
  } catch { /* cancelled */ }
}

async function openPermissions(u) {
  permUser.value = u
  newPerm.type = 'W'; newPerm.targetType = 'photo'
  selectedItem.value = null
  preview.value = null
  const res = await getUserPermissionsApi(u.id)
  permissions.value = (res.code === 200 && res.data) ? res.data : []
  // 补全每条权限的名称和缩略图
  for (const p of permissions.value) {
    if (!p.targetName) await fillPermName(p)
  }
  loadPreview(u.id)
  permVisible.value = true
}

/** 以该账号视角预览可见范围（配置核对用） */
async function loadPreview(userId) {
  try {
    const res = await getUserPreviewApi(userId)
    preview.value = (res.code === 200 && res.data) ? res.data : null
  } catch { preview.value = null }
}

async function fillPermName(p) {
  try {
    if (p.targetType === 'photo') {
      const r = await getPhotoListApi({ pageSize: 500 })
      if (r.code === 200) {
        const found = (r.data?.list || []).find(ph => ph.id == p.targetId)
        if (found) { p.targetName = found.title; p.thumbUrl = found.thumbnailUrl || found.url }
      }
    } else if (p.targetType === 'category') {
      const r = await getCategoryListApi()
      if (r.code === 200) {
        const found = (r.data || []).find(c => c.id == p.targetId)
        if (found) { p.targetName = found.name }
      }
    } else if (p.targetType === 'tag') {
      const r = await getAdminTagListApi()
      if (r.code === 200) {
        const found = (r.data || []).find(t => t.id == p.targetId)
        if (found) { p.targetName = found.name }
      }
    } else {
      const r = await getAdminCollectionsApi()
      if (r.code === 200) {
        const found = (r.data || []).find(c => c.id == p.targetId)
        if (found) { p.targetName = found.name; p.thumbUrl = found.coverUrl }
      }
    }
  } catch { /* ignore */ }
}

async function openSelector() {
  selectorVisible.value = true
  selectorKeyword.value = ''
  if (newPerm.targetType === 'photo') {
    const r = await getPhotoListApi({ pageSize: 500 })
    if (r.code === 200) selectorItems.value = (r.data?.list || []).map(p => ({ id: p.id, name: p.title || p.fileName, thumb: p.thumbnailUrl || p.url }))
  } else if (newPerm.targetType === 'category') {
    const r = await getCategoryListApi()
    if (r.code === 200) selectorItems.value = (r.data || []).map(c => ({ id: c.id, name: c.name }))
  } else if (newPerm.targetType === 'tag') {
    const r = await getAdminTagListApi()
    if (r.code === 200) selectorItems.value = (r.data || []).map(t => ({ id: t.id, name: `${t.name}（${t.count}）` }))
  } else {
    const r = await getAdminCollectionsApi()
    if (r.code === 200) selectorItems.value = (r.data || []).map(c => ({ id: c.id, name: c.name, thumb: c.coverUrl }))
  }
}

function selectItem(item) {
  selectedItem.value = item
  selectorVisible.value = false
}

async function addPerm() {
  if (!selectedItem.value) return
  await addUserPermissionApi(permUser.value.id, {
    permType: newPerm.type, targetType: newPerm.targetType, targetId: selectedItem.value.id
  })
  ElMessage.success('已添加')
  selectedItem.value = null
  openPermissions(permUser.value)
  loadAuditLogs()
}

/** 添加"全局"授权（白名单=全部私密内容可见） */
async function addGlobalPerm() {
  await addUserPermissionApi(permUser.value.id, {
    permType: newPerm.type, targetType: 'global'
  })
  ElMessage.success('已添加')
  openPermissions(permUser.value)
  loadAuditLogs()
}

/** 授权条目展示文案 */
function permLabel(p) {
  if (p.targetType === 'global') return '全部私密内容'
  if (p.targetName) return p.targetName
  const label = { photo: '照片', collection: '合集', category: '分类', tag: '标签' }[p.targetType] || p.targetType
  return label + ' #' + p.targetId
}

async function removePerm(permId) {
  await removeUserPermissionApi(permUser.value.id, permId)
  ElMessage.success('已删除')
  openPermissions(permUser.value)
  loadAuditLogs()
}

onMounted(() => {
  loadUsers()
  loadAuditLogs()
})
</script>

<style scoped>
.user-manage { max-width: 900px; }
.role-admin { color: #F56C6C; font-weight: 500; }
.role-viewer { color: #409EFF; font-weight: 500; }
.role-user { color: #909399; }
.perm-hint { font-size: 12px; color: var(--text-muted, #888); margin-bottom: 12px; }
.perm-preview { font-size: 12px; color: var(--text-regular, #555); margin: -6px 0 12px; }
.form-hint { font-size: 12px; color: var(--text-muted, #999); margin: 6px 0 0; }
.cap-badge { display: inline-block; padding: 1px 6px; margin-right: 4px; border-radius: 4px; font-size: 12px; }
.cap-all { background: #E6F1FB; color: #185FA5; }
.cap-private { background: #FCEBEB; color: #A32D2D; }
.cap-upload { background: #E1F5EE; color: #0F6E56; }
.cap-manage { background: #FAEEDA; color: #854F0B; }
.cap-none { font-size: 12px; color: var(--text-muted, #999); }
.audit-head { margin-bottom: 12px; }
.audit-title { margin: 0; font-size: 15px; font-weight: 500; color: var(--text-secondary, #333); }
.audit-count { margin-left: 8px; font-weight: 400; }
.perm-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 0.5px solid var(--border-light, #eee); }
.tag-whitelist { background: #E6F1FB; color: #409EFF; padding: 1px 8px; border-radius: 3px; font-size: 11px; }
.tag-blacklist { background: #FDE2E2; color: #F56C6C; padding: 1px 8px; border-radius: 3px; font-size: 11px; }

.perm-thumb { width: 32px; height: 32px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
.perm-name { flex: 1; font-size: 13px; }
.selected-preview { display: flex; align-items: center; gap: 6px; font-size: 13px; max-width: 200px; overflow: hidden; }

.filter-input { padding: 8px 12px; border: 1px solid var(--border-color, #ddd); border-radius: 6px; font-size: 14px; }
.selector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.selector-card { cursor: pointer; border: 2px solid transparent; border-radius: 8px; overflow: hidden; transition: all 0.15s; }
.selector-card:hover, .selector-card.selected { border-color: var(--color-primary, #378ADD); }
.selector-thumb { width: 100%; height: 80px; object-fit: cover; display: block; }
.selector-no-thumb { width: 100%; height: 80px; background: var(--bg-hover, #f0f0f0); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #aaa; }
.selector-name { padding: 4px 6px; font-size: 11px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.perm-checks { display: flex; flex-direction: column; gap: 8px; }
.check-label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-secondary, #555); cursor: pointer; }
.check-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }

/* 表格整宽 */
.table-full { width: 100%; }

/* 弹窗宽度修饰：窄（账号表单）/ 中（权限）/ 宽（选择器） */
.modal-narrow { max-width: 420px; }
.modal-medium { max-width: 500px; }
.modal-wide { max-width: 700px; max-height: 70vh; overflow-y: auto; }

/* 权限弹窗：无授权条目时的紧凑空态 */
.perm-empty { padding: 20px 0; }

/* 权限弹窗：新增授权的一行（类型 + 目标 + 操作） */
.perm-add-row { display: flex; gap: 8px; align-items: center; }
.select-type { flex: 1; }
.select-target { width: 80px; }

/* 选择器弹窗：搜索框、空态、底部操作 */
.selector-search { width: 100%; margin-bottom: 12px; }
.selector-empty { padding: 20px; }
.selector-actions { margin-top: 12px; }
</style>
