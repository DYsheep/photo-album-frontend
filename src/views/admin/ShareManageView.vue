<template>
  <div class="share-manage">
    <div class="page-header">
      <h3><EmojiIcon name="link" :size="18" class="icon-inline" /> 分享管理</h3>
      <span class="header-desc">管理所有照片的分享链接</span>
    </div>

    <!-- 表格 -->
    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe size="default" empty-text="暂无分享链接">
        <el-table-column prop="code" label="分享码" min-width="140">
          <template #default="{ row }">
            <code class="share-code">{{ row.code }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="photoTitle" label="关联照片" min-width="200">
          <template #default="{ row }">
            <span class="photo-title-cell">{{ row.photoTitle || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="expiresAt" label="有效期" min-width="180">
          <template #default="{ row }">
            <span v-if="!row.expiresAt" style="color:#0F6E56;">永久有效</span>
            <span v-else :style="{ color: row.expired ? '#A32D2D' : '#854F0B' }">
              {{ row.expired ? '已过期 · ' : '' }}{{ formatTime(row.expiresAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <button class="action-btn copy-action" @click="copyLink(row)">
                <EmojiIcon name="clipboard" :size="14" /> 复制
              </button>
              <button class="action-btn delete-action" @click="handleDelete(row)">
                <EmojiIcon name="wastebasket" :size="14" /> 删除
              </button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && list.length === 0" class="empty-state">
        <EmojiIcon name="link" :size="40" />
        <p>暂无分享链接</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getShareLinksApi, deleteShareLinkApi } from '../../api/share'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmojiIcon from '../../components/EmojiIcon.vue'

const list = ref([])
const loading = ref(false)

async function loadList() {
  loading.value = true
  try {
    const res = await getShareLinksApi()
    if (res.code === 200 && res.data) {
      list.value = res.data
    }
  } catch (err) {
    console.error('获取分享链接列表失败:', err)
  } finally {
    loading.value = false
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return dateStr }
}

async function copyLink(row) {
  try {
    await navigator.clipboard.writeText(row.shareUrl)
    ElMessage.success('链接已复制到剪贴板')
  } catch {
    ElMessage.info('分享链接: ' + row.shareUrl)
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除分享码为「${row.code}」的链接吗？删除后该分享链接将立即失效。`,
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
    const res = await deleteShareLinkApi(row.id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      await loadList()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel' && err !== 'close') {
      console.error('删除分享链接失败:', err)
    }
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.share-manage {
  max-width: 1000px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  color: var(--text-primary, #1a1a2e);
  margin: 0 0 4px;
}

.header-desc {
  font-size: 13px;
  color: var(--text-muted, #888);
}

.table-card {
  background: var(--bg-card, #fff);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm, 0 2px 12px rgba(0, 0, 0, 0.05));
  border: 0.5px solid var(--border-light, #eee);
}

.share-code {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  background: var(--bg-hover, #f5f5f5);
  padding: 3px 10px;
  border-radius: 5px;
  color: var(--color-primary, #378ADD);
  letter-spacing: 1px;
}

.photo-title-cell {
  color: var(--text-regular, #555);
}

.action-btns {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-card, #fff);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-action {
  color: var(--color-primary, #378ADD);
  border-color: var(--color-primary, #378ADD);
}

.copy-action:hover {
  background: var(--color-primary, #378ADD);
  color: #fff;
}

.delete-action {
  color: var(--color-danger, #E24B4A);
  border-color: var(--color-danger, #E24B4A);
}

.delete-action:hover {
  background: var(--color-danger, #E24B4A);
  color: #fff;
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: var(--text-muted, #999);
}

.empty-state p {
  margin-top: 10px;
  font-size: 14px;
}
</style>
