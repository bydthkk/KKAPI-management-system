<template>
  <div class="server-monitor">
    <div class="monitor-header">
      <h3>服务器监控</h3>
      <div class="refresh-controls">
        <el-switch 
          v-model="autoRefresh" 
          active-text="自动刷新" 
          @change="toggleAutoRefresh"
        />
        <el-button 
          type="primary" 
          :icon="Refresh" 
          @click="refreshData"
          :loading="loading"
          size="small"
        >
          刷新
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="monitor-content">
      <div v-if="!servers.length" class="no-servers">
        <el-empty description="暂无服务器数据" />
      </div>

      <div v-else class="servers-grid">
        <div 
          v-for="server in servers" 
          :key="server.serverId"
          class="server-card"
          :class="{ 'offline': server.status === 'offline' }"
        >
          <div class="server-header">
            <div class="server-info">
              <h4>{{ server.serverName }}</h4>
              <span class="server-host">{{ server.host }}</span>
            </div>
            <div class="server-status">
              <el-tag 
                :type="server.status === 'online' ? 'success' : 'danger'"
                size="small"
              >
                {{ server.status === 'online' ? '在线' : '离线' }}
              </el-tag>
            </div>
          </div>

          <div class="metrics-grid">
            <!-- CPU -->
            <div class="metric-item">
              <div class="metric-header">
                <el-icon class="metric-icon cpu"><Cpu /></el-icon>
                <span class="metric-label">CPU</span>
              </div>
              <div class="metric-progress">
                <el-progress 
                  :percentage="server.cpu.usage"
                  :color="getProgressColor(server.cpu.usage)"
                  :stroke-width="8"
                  :show-text="false"
                />
                <span class="metric-value">{{ server.cpu.usage }}%</span>
              </div>
              <div class="metric-detail">{{ server.cpu.cores }} 核心</div>
            </div>

            <!-- Memory -->
            <div class="metric-item">
              <div class="metric-header">
                <el-icon class="metric-icon memory"><MostlyCloudy /></el-icon>
                <span class="metric-label">内存</span>
              </div>
              <div class="metric-progress">
                <el-progress 
                  :percentage="server.memory.usage"
                  :color="getProgressColor(server.memory.usage)"
                  :stroke-width="8"
                  :show-text="false"
                />
                <span class="metric-value">{{ server.memory.usage }}%</span>
              </div>
              <div class="metric-detail">
                {{ formatBytes(server.memory.used * 1024 * 1024) }} / 
                {{ formatBytes(server.memory.total * 1024 * 1024) }}
              </div>
            </div>

            <!-- Disk -->
            <div class="metric-item">
              <div class="metric-header">
                <el-icon class="metric-icon disk"><FolderOpened /></el-icon>
                <span class="metric-label">磁盘</span>
              </div>
              <div class="metric-progress">
                <el-progress 
                  :percentage="server.disk.usage"
                  :color="getProgressColor(server.disk.usage)"
                  :stroke-width="8"
                  :show-text="false"
                />
                <span class="metric-value">{{ server.disk.usage }}%</span>
              </div>
              <div class="metric-detail">
                {{ server.disk.used }}GB / {{ server.disk.total }}GB
              </div>
            </div>

            <!-- Load Average -->
            <div class="metric-item load-average">
              <div class="metric-header">
                <el-icon class="metric-icon load"><TrendCharts /></el-icon>
                <span class="metric-label">负载</span>
              </div>
              <div class="load-values">
                <div class="load-item">
                  <span class="load-period">1m</span>
                  <span class="load-value">{{ server.load.load1 }}</span>
                </div>
                <div class="load-item">
                  <span class="load-period">5m</span>
                  <span class="load-value">{{ server.load.load5 }}</span>
                </div>
                <div class="load-item">
                  <span class="load-period">15m</span>
                  <span class="load-value">{{ server.load.load15 }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="server-footer">
            <span class="last-update">
              更新时间: {{ formatTime(server.timestamp) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Cpu, MostlyCloudy, FolderOpened, TrendCharts } from '@element-plus/icons-vue'
import api from '../utils/axios'

const loading = ref(false)
const autoRefresh = ref(true)
const servers = ref([])
let refreshInterval = null

// 获取监控数据
const fetchMonitoringData = async () => {
  try {
    loading.value = true
    const response = await api.get('/api/monitor/servers')
    servers.value = response.data.data || []
  } catch (error) {
    console.error('获取监控数据失败:', error)
    ElMessage.error('获取监控数据失败')
    
    // 使用模拟数据
    servers.value = [
      {
        serverId: 1,
        serverName: '示例服务器',
        host: '192.168.1.100',
        status: 'online',
        cpu: { usage: 45.2, cores: 4 },
        memory: { used: 2048, total: 8192, usage: 25.0 },
        disk: { used: 50.5, total: 100.0, usage: 50.5 },
        load: { load1: 0.15, load5: 0.25, load15: 0.18 },
        timestamp: new Date()
      }
    ]
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = async () => {
  await fetchMonitoringData()
}

// 切换自动刷新
const toggleAutoRefresh = (enabled) => {
  if (enabled) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (refreshInterval) return
  
  refreshInterval = setInterval(() => {
    fetchMonitoringData()
  }, 30000) // 30秒刷新一次
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// 获取进度条颜色
const getProgressColor = (percentage) => {
  if (percentage >= 90) return '#dc2626'
  if (percentage >= 70) return '#f59e0b'
  if (percentage >= 50) return '#f59e0b'
  return '#059669'
}

// 格式化字节
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleTimeString()
}

onMounted(() => {
  fetchMonitoringData()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.server-monitor {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-secondary, white);
}

.monitor-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.refresh-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.monitor-content {
  padding: 24px;
  min-height: 300px;
}

.no-servers {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.server-card {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.server-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.server-card.offline {
  opacity: 0.7;
  background: #f8f9fa;
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.server-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.server-host {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

.metrics-grid {
  display: grid;
  gap: 16px;
}

.metric-item {
  padding: 12px;
  background: var(--bg-primary, #f8fafc);
  border-radius: 8px;
}

.metric-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.metric-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.metric-icon.cpu {
  color: #6366f1;
}

.metric-icon.memory {
  color: #059669;
}

.metric-icon.disk {
  color: #f59e0b;
}

.metric-icon.load {
  color: #dc2626;
}

.metric-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #475569);
}

.metric-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.metric-progress .el-progress {
  flex: 1;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  min-width: 40px;
  text-align: right;
}

.metric-detail {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

.load-average .load-values {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.load-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 8px;
  background: white;
  border-radius: 6px;
}

.load-period {
  font-size: 11px;
  color: var(--text-muted, #64748b);
  margin-bottom: 2px;
}

.load-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.server-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.last-update {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .servers-grid {
    grid-template-columns: 1fr;
  }
  
  .monitor-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .refresh-controls {
    justify-content: space-between;
  }
}
</style>