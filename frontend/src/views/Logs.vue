<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>日志查看</span>
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-switch
              v-model="autoRefresh"
              @change="toggleAutoRefresh"
              active-text="自动刷新"
              inactive-text="手动刷新"
              size="small"
            />
            <el-button @click="loadLogs" :loading="loading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button @click="clearLogs" type="danger">
              <el-icon><Delete /></el-icon>
              清空日志
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <div class="search-bar">
        <el-row :gutter="20">
          <el-col :span="4">
            <el-select v-model="searchForm.level" placeholder="日志级别" clearable>
              <el-option label="全部" value="" />
              <el-option label="ERROR" value="error" />
              <el-option label="WARN" value="warn" />
              <el-option label="INFO" value="info" />
              <el-option label="DEBUG" value="debug" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="searchForm.service" placeholder="服务模块" clearable>
              <el-option label="全部" value="" />
              <el-option label="SSH" value="ssh" />
              <el-option label="任务" value="task" />
              <el-option label="认证" value="auth" />
              <el-option label="系统" value="system" />
            </el-select>
          </el-col>
          <el-col :span="8">
            <el-input 
              v-model="searchForm.keyword" 
              placeholder="关键词搜索" 
              clearable 
              @input="debouncedSearch"
            />
          </el-col>
          <el-col :span="8">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </el-col>
        </el-row>
        <div style="margin-top: 10px;">
          <el-button type="primary" @click="searchLogs">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </div>
      </div>

      <!-- 日志列表 -->
      <div class="log-container" v-loading="loading" element-loading-text="加载日志中...">
        <div v-if="logs.length === 0 && !loading" class="empty-logs">
          <div class="empty-icon">📝</div>
          <div class="empty-text">暂无日志数据</div>
          <div class="empty-subtext">请检查日志文件或调整筛选条件</div>
        </div>
        
        <div 
          v-for="log in logs" 
          :key="log.id" 
          :class="['log-item', `log-${log.level}`]"
        >
          <div class="log-header">
            <span class="log-time">{{ log.timestamp }}</span>
            <el-tag :type="getLevelType(log.level)" size="small">
              {{ log.level.toUpperCase() }}
            </el-tag>
            <span class="log-service">{{ log.service }}</span>
          </div>
          <div class="log-content">
            {{ log.message }}
          </div>
          <div v-if="log.details" class="log-details">
            <el-collapse>
              <el-collapse-item title="详细信息">
                <div class="details-viewer">
                  <pre v-if="typeof log.details === 'string'">{{ formatJsonString(log.details) }}</pre>
                  <pre v-else>{{ JSON.stringify(log.details, null, 2) }}</pre>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>

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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete } from '@element-plus/icons-vue'
import api from '../utils/axios'

const logs = ref([])

const searchForm = reactive({
  level: '',
  service: '',
  keyword: '',
  dateRange: []
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 20, // 减少默认页面大小提升加载速度
  total: 0
})

const loading = ref(false) // 添加加载状态
const autoRefresh = ref(false) // 自动刷新开关
let refreshTimer = null // 刷新定时器

const getLevelType = (level) => {
  switch (level) {
    case 'error': return 'danger'
    case 'warn': return 'warning'  
    case 'info': return 'success'
    case 'debug': return 'info'
    default: return 'info'
  }
}

const loadLogs = async () => {
  loading.value = true
  
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      level: searchForm.level,
      service: searchForm.service,
      keyword: searchForm.keyword
    }
    
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startTime = searchForm.dateRange[0]
      params.endTime = searchForm.dateRange[1]
    }
    
    const response = await api.get('/api/logs', { params })
    logs.value = response.data.data.list
    pagination.total = response.data.data.total
  } catch (error) {
    console.error('加载日志失败:', error)
    ElMessage.error('加载日志失败，请检查网络连接')
    logs.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const searchLogs = () => {
  pagination.currentPage = 1
  loadLogs()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    level: '',
    service: '',
    keyword: '',
    dateRange: []
  })
  searchLogs()
}

const clearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日志吗？此操作不可恢复！',
      '确认清空',
      {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const response = await api.delete('/api/logs', {
      // 禁用缓存
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    console.log('清空日志响应:', response.data)
    ElMessage.success(response.data.message || '日志清空成功')
    
    // 立即清空本地数据以获得即时反馈
    logs.value = []
    pagination.total = 0
    
    // 由于后端异步处理，稍微延迟刷新
    setTimeout(() => {
      loadLogs()
    }, 1000) // 给后端更多时间处理文件清空
    
  } catch (error) {
    console.error('清空日志失败:', error)
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '清空日志失败，请重试')
      // 失败时也刷新以确保数据一致
      loadLogs()
    }
  }
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadLogs()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadLogs()
}

// 格式化JSON字符串
const formatJsonString = (jsonStr) => {
  try {
    const parsed = JSON.parse(jsonStr)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return jsonStr
  }
}

// 防抖搜索
let searchTimer = null
const debouncedSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  
  searchTimer = setTimeout(() => {
    searchLogs()
  }, 300)
}

// 自动刷新控制
const toggleAutoRefresh = (enabled) => {
  if (enabled) {
    // 开启自动刷新，每30秒刷新一次
    refreshTimer = setInterval(() => {
      if (!loading.value) { // 避免重复请求
        loadLogs()
      }
    }, 30000)
    ElMessage.success('已开启自动刷新 (30秒)')
  } else {
    // 关闭自动刷新
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    ElMessage.info('已关闭自动刷新')
  }
}

// 组件卸载时清理定时器

onMounted(() => {
  loadLogs()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
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

.log-container {
  max-height: 600px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.log-item {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  transition: all 0.2s ease;
}

.log-item:hover {
  background-color: rgba(0, 180, 219, 0.05);
  transform: translateX(2px);
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.log-error {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.08) 0%, rgba(255, 82, 82, 0.08) 100%);
  border-left: 4px solid #f56c6c;
}

.log-item.log-warn {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.08) 0%, rgba(245, 166, 35, 0.08) 100%);
  border-left: 4px solid #e6a23c;
}

.log-item.log-info {
  background: rgba(99, 102, 241, 0.05);
  border-left: 4px solid #6366f1;
}

.log-item.log-debug {
  background: linear-gradient(135deg, rgba(144, 147, 153, 0.08) 0%, rgba(96, 98, 102, 0.08) 100%);
  border-left: 4px solid #909399;
}

.log-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
}

.log-time {
  color: #2c3e50;
  font-weight: 600;
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
}

.log-service {
  color: #6c757d;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  background: rgba(108, 117, 125, 0.1);
  border-radius: 4px;
}

.log-content {
  color: #2c3e50;
  line-height: 1.6;
  margin-bottom: 8px;
  font-weight: 500;
}

.log-details {
  margin-top: 12px;
}

.log-details pre {
  background: rgba(248, 249, 250, 0.8);
  backdrop-filter: blur(5px);
  padding: 12px;
  border-radius: 8px;
  font-size: 11px;
  overflow-x: auto;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #495057;
}

.pagination {
  margin-top: 20px;
  text-align: right;
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

/* 选择器和输入框样式 */
:deep(.el-select .el-input__wrapper),
:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-select .el-input__wrapper:hover),
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}

/* 日期选择器样式 */
:deep(.el-date-editor) {
  border-radius: 8px;
}

/* 折叠面板样式 */
:deep(.el-collapse) {
  border: none;
  background: transparent;
}

:deep(.el-collapse-item__header) {
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  border: none;
  padding: 8px 12px;
  font-weight: 500;
}

:deep(.el-collapse-item__content) {
  padding: 12px 0;
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

/* 空状态样式 */
.empty-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #606266;
}

.empty-subtext {
  font-size: 14px;
  color: #909399;
}

/* 详情查看器样式 */
.details-viewer {
  max-height: 300px;
  overflow-y: auto;
}

.details-viewer pre {
  background: rgba(248, 249, 250, 0.8);
  backdrop-filter: blur(5px);
  padding: 12px;
  border-radius: 8px;
  font-size: 11px;
  overflow-x: auto;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #495057;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 加载状态优化 */
:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
}

:deep(.el-loading-text) {
  color: #6366f1;
  font-weight: 500;
}
</style>