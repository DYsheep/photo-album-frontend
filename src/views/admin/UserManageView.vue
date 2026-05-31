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
          <span>{{ p.targetType === 'photo' ? '照片' : '合集' }} #{{ p.targetId }}</span>
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
          <input v-model="newPerm.targetId" placeholder="ID" style="width:70px;" />
          <button class="btn-primary btn-sm" @click="addPerm">添加</button>
        </div>
        <div class="modal-actions" style="margin-top:16px;">
          <button class="btn-secondary" @click="permVisible = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getUsersApi, createUserApi, updateUserApi, deleteUserApi, getUserPermissionsApi, addUserPermissionApi, removeUserPermissionApi } from '../../api/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const users = ref([])
const dialogVisible = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const form = reactive({ username: '', password: '', nickname: '', role: 'user' })

const permVisible = ref(false)
const permUser = ref(null)
const permissions = ref([])
const newPerm = reactive({ type: 'W', targetType: 'photo', targetId: '' })

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
  newPerm.type = 'W'; newPerm.targetType = 'photo'; newPerm.targetId = ''
  const res = await getUserPermissionsApi(u.id)
  permissions.value = (res.code === 200 && res.data) ? res.data : []
  permVisible.value = true
}
async function addPerm() {
  if (!newPerm.targetId) return
  await addUserPermissionApi(permUser.value.id, { permType: newPerm.type, targetType: newPerm.targetType, targetId: newPerm.targetId })
  ElMessage.success('已添加')
  newPerm.targetId = ''
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
</style>
