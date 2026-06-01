<template>
  <div class="user-manage">
    <div class="page-header">
      <h2>用户管理</h2>
      <button class="btn-primary btn-sm" @click="openCreate">新建用户</button>
    </div>

    <table class="data-table" v-if="users.length">
      <thead>
        <tr>
          <th>用户名</th>
          <th>昵称</th>
          <th>角色</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.username }}</td>
          <td>{{ u.nickname || '-' }}</td>
          <td>
            <span :class="u.role === 'admin' ? 'role-admin' : u.role === 'viewer' ? 'role-viewer' : 'role-user'">
              {{ roleLabel(u.role) }}
            </span>
          </td>
          <td>{{ formatDate(u.createdAt) }}</td>
          <td>
            <button class="btn-sm btn-secondary" @click="openEdit(u)">编辑</button>
            <button class="btn-sm btn-secondary" @click="openPermissions(u)" style="margin-left:4px;">权限</button>
            <button v-if="u.role !== 'admin'" class="btn-sm btn-danger" @click="confirmDelete(u)" style="margin-left:4px;">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty-state">暂无用户</div>

    <!-- 创建 / 编辑弹窗 -->
    <div v-if="dialogVisible" class="modal-overlay" @click.self="dialogVisible = false">
      <div class="modal-content" style="max-width:420px;">
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
            <option value="viewer">查看者（可看私密）</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="dialogVisible = false">取消</button>
          <button class="btn-primary" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 权限弹窗 -->
    <div v-if="permVisible" class="modal-overlay" @click.self="permVisible = false">
      <div class="modal-content" style="max-width:500px;">
        <h3>{{ permUser?.username }} 的访问权限</h3>
        <p class="perm-hint">不设权限 = 可看全部私密内容；设白名单 = 仅看列表中内容；设黑名单 = 排除列表中内容</p>
        <div v-for="(p, i) in permissions" :key="p.id" class="perm-row">
          <span :class="p.permType === 'W' ? 'tag-whitelist' : 'tag-blacklist'">{{ p.permType === 'W' ? '白名单' : '黑名单' }}</span>
          <img v-if="p.thumbUrl" :src="p.thumbUrl" class="perm-thumb" />
          <span class="perm-name">{{ p.targetName || (p.targetType === 'photo' ? '照片' : '合集') + ' #' + p.targetId }}</span>
          <button class="btn-sm btn-danger" @click="removePerm(p.id)">删除</button>
        </div>
        <div v-if="!permissions.length" class="empty-state" style="padding:20px 0;">无特殊权限，默认可查看全部私密内容</div>
        <hr />
        <div style="display:flex;gap:8px;align-items:center;">
          <select v-model="newPerm.type" style="flex:1;">
            <option value="W">白名单（仅允许）</option>
            <option value="B">黑名单（排除）</option>
          </select>
          <select v-model="newPerm.targetType" style="width:80px;">
            <option value="photo">照片</option>
            <option value="collection">合集</option>
          </select>
          <button class="btn-primary btn-sm" @click="openSelector">选择</button>
          <span v-if="selectedItem" class="selected-preview">
            <img v-if="selectedItem.thumb" :src="selectedItem.thumb" class="perm-thumb" />
            {{ selectedItem.name }}
          </span>
          <button v-if="selectedItem" class="btn-primary btn-sm" @click="addPerm">添加</button>
        </div>
        <div class="modal-actions" style="margin-top:16px;">
          <button class="btn-secondary" @click="permVisible = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 选择器弹窗 -->
    <div v-if="selectorVisible" class="modal-overlay" @click.self="selectorVisible = false">
      <div class="modal-content" style="max-width:700px;max-height:70vh;overflow-y:auto;">
        <h3>选择{{ newPerm.targetType === 'photo' ? '照片' : '合集' }}</h3>
        <input v-model="selectorKeyword" placeholder="搜索..." class="filter-input" style="width:100%;margin-bottom:12px;" />
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
        <div v-if="!filteredSelectorItems.length" class="empty-state" style="padding:20px;">无匹配结果</div>
        <div class="modal-actions" style="margin-top:12px;">
          <button class="btn-secondary" @click="selectorVisible = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { getUsersApi, createUserApi, updateUserApi, deleteUserApi, getUserPermissionsApi, addUserPermissionApi, removeUserPermissionApi } from '../../api/user'
import { getPhotoListApi } from '../../api/photo'
import { getAdminCollectionsApi } from '../../api/collection'
import { ElMessage, ElMessageBox } from 'element-plus'

const users = ref([])
const dialogVisible = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const form = reactive({ username: '', password: '', nickname: '', role: 'user' })

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

async function loadUsers() {
  const res = await getUsersApi()
  if (res.code === 200) users.value = res.data || []
}

function openCreate() {
  editingUser.value = null
  form.username = ''; form.password = ''; form.nickname = ''; form.role = 'user'
  dialogVisible.value = true
}
function openEdit(u) {
  editingUser.value = u
  form.username = u.username; form.password = ''; form.nickname = u.nickname; form.role = u.role
  dialogVisible.value = true
}
async function handleSave() {
  saving.value = true
  const data = { nickname: form.nickname, role: form.role, password: form.password || undefined }
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
  const res = await getUserPermissionsApi(u.id)
  permissions.value = (res.code === 200 && res.data) ? res.data : []
  // 补全每条权限的名称和缩略图
  for (const p of permissions.value) {
    if (!p.targetName) await fillPermName(p)
  }
  permVisible.value = true
}

async function fillPermName(p) {
  try {
    if (p.targetType === 'photo') {
      const r = await getPhotoListApi({ pageSize: 500 })
      if (r.code === 200) {
        const found = (r.data?.list || []).find(ph => ph.id == p.targetId)
        if (found) { p.targetName = found.title; p.thumbUrl = found.thumbnailUrl || found.url }
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
}

async function removePerm(permId) {
  await removeUserPermissionApi(permUser.value.id, permId)
  ElMessage.success('已删除')
  openPermissions(permUser.value)
}

onMounted(loadUsers)
</script>

<style scoped>
.user-manage { max-width: 900px; }
.role-admin { color: #F56C6C; font-weight: 500; }
.role-viewer { color: #409EFF; font-weight: 500; }
.role-user { color: #909399; }
.perm-hint { font-size: 12px; color: var(--text-muted, #888); margin-bottom: 12px; }
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
</style>
