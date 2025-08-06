<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务管理</span>
          <div style="display: flex; gap: 10px;">
            <el-button @click="loadTasks(true)">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button @click="clearTasks" type="danger">
              <el-icon><Delete /></el-icon>
              清空任务
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <div class="search-bar">
        <el-row :gutter="20" class="mobile-responsive-row">
          <el-col :span="6" :xs="24" :sm="12" :md="6">
            <el-select v-model="searchForm.status" placeholder="选择状态" clearable style="width: 100%">
              <el-option label="全部" value="" />
              <el-option label="等待中" value="waiting" />
              <el-option label="运行中" value="running" />
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
            </el-select>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6">
            <el-select v-model="searchForm.method" placeholder="选择方法" clearable style="width: 100%">
              <el-option label="全部" value="" />
              <el-option label="远程执行" value="remote-execute" />
            </el-select>
          </el-col>
          <el-col :span="8" :xs="24" :sm="24" :md="8">
            <el-input v-model="searchForm.command" placeholder="命令关键词" clearable />
          </el-col>
          <el-col :span="4" :xs="24" :sm="24" :md="4">
            <el-button type="primary" @click="searchTasks" style="width: 100%">搜索</el-button>
          </el-col>
        </el-row>
      </div>

      <el-table :data="tasks" style="width: 100%" class="mobile-table">
        <el-table-column prop="id" label="任务ID" width="80" />
        <el-table-column prop="parameterId" label="参数组ID" width="100" class-name="mobile-hide" />
        <el-table-column prop="method" label="方法" width="150" class-name="mobile-hide">
          <template #default="scope">
            <el-tag :type="scope.row.method === 'remote-execute' ? 'success' : 'warning'">
              {{ scope.row.method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="command" label="命令" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.command" placement="top">
              <span style="display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ scope.row.command }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="服务器" width="200" class-name="mobile-hide">
          <template #default="scope">
            {{ scope.row.parameter?.server ? `${scope.row.parameter.server.name} (${scope.row.parameter.server.host}:${scope.row.parameter.server.port})` : '未知服务器' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="120" class-name="mobile-hide">
          <template #default="scope">
            <el-progress 
              :percentage="scope.row.progress" 
              :status="scope.row.status === 'failed' ? 'exception' : undefined"
              style="width: 100px"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" class-name="mobile-hide" />
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button 
              size="small" 
              @click="viewTaskDetail(scope.row)"
            >
              详情
            </el-button>
            <el-button 
              v-if="scope.row.status === 'running'"
              size="small" 
              type="danger" 
              @click="stopTask(scope.row)"
            >
              停止
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 任务详情对话框 -->
    <el-dialog
      title="任务详情"
      v-model="detailDialogVisible"
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务ID">{{ taskDetail.id }}</el-descriptions-item>
        <el-descriptions-item label="参数组ID">{{ taskDetail.parameterId }}</el-descriptions-item>
        <el-descriptions-item label="执行方法">
          <el-tag :type="taskDetail.method === 'remote-execute' ? 'success' : 'warning'">
            {{ taskDetail.method }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="执行命令">{{ taskDetail.command }}</el-descriptions-item>
        <el-descriptions-item label="目标服务器">
          {{ taskDetail.parameter?.server ? `${taskDetail.parameter.server.name} (${taskDetail.parameter.server.host}:${taskDetail.parameter.server.port})` : '未知服务器' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(taskDetail.status)">
            {{ getStatusText(taskDetail.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="进度">
          <el-progress :percentage="taskDetail.progress" />
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ taskDetail.createTime }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ taskDetail.startTime }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ taskDetail.endTime }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="taskDetail.output" style="margin-top: 20px;">
        <h4>执行输出</h4>
        <el-input
          v-model="taskDetail.output"
          type="textarea"
          :rows="10"
          readonly
          style="font-family: monospace;"
        />
      </div>

      <div v-if="taskDetail.error" style="margin-top: 20px;">
        <h4>错误信息</h4>
        <el-input
          v-model="taskDetail.error"
          type="textarea"
          :rows="5"
          readonly
          style="font-family: monospace; color: #f56c6c;"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete } from '@element-plus/icons-vue'
import api from '../utils/axios'

const tasks = ref([])
const detailDialogVisible = ref(false)

const searchForm = reactive({
  status: '',
  method: '',
  command: ''
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

const taskDetail = reactive({
  id: '',
  parameterId: '',
  method: '',
  command: '',
  serverId: 0,
  status: '',
  progress: 0,
  createTime: '',
  startTime: '',
  endTime: '',
  output: '',
  error: '',
  parameter: null
})

const getStatusType = (status) => {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'running': return 'warning'
    case 'waiting': return 'info'
    default: return 'info'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'success': return '成功'
    case 'failed': return '失败'
    case 'running': return '运行中'
    case 'waiting': return '等待中'
    default: return '未知'
  }
}

const loadTasks = async (forceRefresh = false) => {
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...searchForm
    }
    
    // 添加时间戳防止缓存，特别是在强制刷新时
    if (forceRefresh) {
      params._t = Date.now()
    }
    
    const response = await api.get('/api/tasks', { 
      params,
      // 禁用缓存
      headers: forceRefresh ? {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      } : {}
    })
    tasks.value = response.data.data.list
    pagination.total = response.data.data.total
  } catch (error) {
    console.error('加载任务列表失败:', error)
    ElMessage.error('加载任务列表失败，请检查网络连接')
    // 清空数据而不是使用模拟数据
    tasks.value = []
    pagination.total = 0
  }
}

const searchTasks = () => {
  pagination.currentPage = 1
  loadTasks()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadTasks()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadTasks()
}

const viewTaskDetail = async (task) => {
  try {
    const response = await api.get(`/api/tasks/${task.id}`)
    Object.assign(taskDetail, response.data.data)
    detailDialogVisible.value = true
  } catch (error) {
    console.error('加载任务详情失败:', error)
    ElMessage.error('加载任务详情失败，请重试')
  }
}

const stopTask = async (task) => {
  try {
    await ElMessageBox.confirm(
      `确定要停止任务 ${task.id} 吗？`,
      '确认停止',
      {
        confirmButtonText: '停止',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await api.post(`/api/tasks/${task.id}/stop`)
    ElMessage.success('任务停止成功')
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('停止任务失败，请重试')
    }
  }
}

const clearTasks = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有任务记录吗？此操作不可恢复！',
      '确认清空',
      {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const response = await api.delete('/api/tasks', {
      // 禁用缓存
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    console.log('清空任务响应:', response.data)
    ElMessage.success(response.data.message || '任务记录清空成功')
    
    // 立即清空本地数据以获得即时反馈
    tasks.value = []
    pagination.total = 0
    
    // 由于后端异步处理，稍微延迟刷新
    setTimeout(() => {
      loadTasks(true)
    }, 1000) // 给后端更多时间处理
    
  } catch (error) {
    console.error('清空任务失败:', error)
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '清空任务记录失败，请重试')
      // 失败时也强制刷新以确保数据一致
      loadTasks(true)
    }
  }
}

// 自动刷新运行中的任务
let refreshInterval = null

onMounted(() => {
  loadTasks()
  
  // 每5秒刷新一次任务状态
  refreshInterval = setInterval(() => {
    const hasRunningTasks = tasks.value.some(task => task.status === 'running')
    if (hasRunningTasks) {
      loadTasks()
    }
  }, 5000)
})

// 清理定时器
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.page-container {
  padding: 20px;
  min-height: 100vh;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.search-bar {
  margin-bottom: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

/* 现代化表格样式 */
:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

:deep(.el-table th.el-table__cell) {
  background: #6366f1;
  color: white;
  font-weight: 600;
  border: none;
}

:deep(.el-table tr:hover > td) {
  background-color: rgba(99, 102, 241, 0.05) !important;
}

:deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* 卡片样式 */
:deep(.el-card) {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

:deep(.el-card__header) {
  background: rgba(99, 102, 241, 0.05);
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 16px 16px 0 0;
}

/* 按钮样式 */
:deep(.el-button--primary) {
  background: #6366f1;
  border: none;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-button--primary:hover) {
  background: #5855eb;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
}

:deep(.el-button--danger) {
  background: #dc2626;
  border: none;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-button--danger:hover) {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
}

:deep(.el-button) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

/* 标签样式 */
:deep(.el-tag) {
  border-radius: 20px;
  font-weight: 500;
  border: none;
}

/* 进度条样式 */
:deep(.el-progress-bar__outer) {
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.1);
}

:deep(.el-progress-bar__inner) {
  border-radius: 10px;
  background: #6366f1;
}

/* 对话框样式 */
:deep(.el-dialog) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

:deep(.el-dialog__header) {
  background: rgba(99, 102, 241, 0.05);
  border-radius: 16px 16px 0 0;
  padding: 20px;
}

:deep(.el-dialog__title) {
  font-weight: 600;
  color: #2c3e50;
}

/* 描述列表样式 */
:deep(.el-descriptions) {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 16px;
}

:deep(.el-descriptions__header) {
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  margin-bottom: 16px;
}

/* 选择器样式 */
:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-select .el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

/* 输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

/* 分页样式 */
:deep(.el-pagination) {
  --el-color-primary: #6366f1;
}

:deep(.el-pager li) {
  border-radius: 6px;
  margin: 0 2px;
}

:deep(.el-pagination button) {
  border-radius: 6px;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .page-container {
    padding: 12px;
  }
  
  .search-bar {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .mobile-responsive-row .el-col {
    margin-bottom: 12px;
  }
  
  .card-header {
    font-size: 14px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .card-header div {
    width: 100%;
  }
  
  .card-header .el-button {
    width: 100%;
  }
  
  /* Hide mobile-unfriendly table columns */
  .mobile-table :deep(.mobile-hide) {
    display: none !important;
  }
  
  .pagination {
    text-align: center;
    margin-top: 16px;
  }
}

@media (max-width: 480px) {
  .page-container {
    padding: 8px;
  }
  
  .search-bar {
    padding: 12px;
  }
}
</style>