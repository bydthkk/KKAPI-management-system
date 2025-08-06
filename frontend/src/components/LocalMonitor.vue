<template>
  <div class="local-monitor">
    <div class="monitor-header">
      <h3>{{ t('localMonitor.title') }}</h3>
      <div class="refresh-controls">
        <el-switch 
          v-model="autoRefresh" 
          :active-text="t('localMonitor.autoRefresh')" 
          @change="toggleAutoRefresh"
        />
        <el-button 
          type="primary" 
          :icon="Refresh" 
          @click="refreshData"
          :loading="loading"
          size="small"
        >
          {{ t('localMonitor.refresh') }}
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="monitor-content">
      <div class="server-info">
        <div class="info-item">
          <el-icon class="info-icon"><Monitor /></el-icon>
          <div class="info-content">
            <div class="info-label">{{ t('localMonitor.serverLabel') }}</div>
            <div class="info-value">{{ serverData.serverName }}</div>
          </div>
        </div>
        <div class="info-item">
          <el-icon class="info-icon"><Timer /></el-icon>
          <div class="info-content">
            <div class="info-label">{{ t('localMonitor.uptimeLabel') }}</div>
            <div class="info-value">{{ formatUptime(serverData.uptime) }}</div>
          </div>
        </div>
        <div class="info-item">
          <el-icon class="info-icon"><Connection /></el-icon>
          <div class="info-content">
            <div class="info-label">{{ t('localMonitor.statusLabel') }}</div>
            <div class="info-value">
              <el-tag type="success" size="small">{{ t('localMonitor.onlineStatus') }}</el-tag>
            </div>
          </div>
        </div>
      </div>

      <div class="metrics-container">
        <!-- CPU -->
        <div class="metric-card">
          <div class="metric-header">
            <el-icon class="metric-icon cpu"><Cpu /></el-icon>
            <div class="metric-title">
              <span class="metric-name">{{ t('localMonitor.cpuUsage') }}</span>
              <span class="metric-cores">{{ serverData.cpu?.cores || 0 }} {{ t('localMonitor.cores') }}</span>
            </div>
            <div class="metric-value">{{ serverData.cpu?.usage || 0 }}%</div>
          </div>
          <div class="metric-progress">
            <el-progress 
              :percentage="serverData.cpu?.usage || 0"
              :color="getProgressColor(serverData.cpu?.usage || 0)"
              :stroke-width="8"
              :show-text="false"
            />
          </div>
        </div>

        <!-- Memory -->
        <div class="metric-card">
          <div class="metric-header">
            <el-icon class="metric-icon memory"><MostlyCloudy /></el-icon>
            <div class="metric-title">
              <span class="metric-name">{{ t('localMonitor.memoryUsage') }}</span>
              <span class="metric-detail">
                {{ formatBytes(serverData.memory?.used * 1024 * 1024) }} / 
                {{ formatBytes(serverData.memory?.total * 1024 * 1024) }}
              </span>
            </div>
            <div class="metric-value">{{ serverData.memory?.usage || 0 }}%</div>
          </div>
          <div class="metric-progress">
            <el-progress 
              :percentage="serverData.memory?.usage || 0"
              :color="getProgressColor(serverData.memory?.usage || 0)"
              :stroke-width="8"
              :show-text="false"
            />
          </div>
        </div>

        <!-- Disk -->
        <div class="metric-card">
          <div class="metric-header">
            <el-icon class="metric-icon disk"><FolderOpened /></el-icon>
            <div class="metric-title">
              <span class="metric-name">{{ t('localMonitor.diskUsage') }}</span>
              <span class="metric-detail">
                {{ serverData.disk?.used || 0 }}GB / {{ serverData.disk?.total || 0 }}GB
              </span>
            </div>
            <div class="metric-value">{{ serverData.disk?.usage || 0 }}%</div>
          </div>
          <div class="metric-progress">
            <el-progress 
              :percentage="serverData.disk?.usage || 0"
              :color="getProgressColor(serverData.disk?.usage || 0)"
              :stroke-width="8"
              :show-text="false"
            />
          </div>
        </div>

        <!-- System Load -->
        <div class="metric-card load-card">
          <div class="metric-header">
            <el-icon class="metric-icon load"><TrendCharts /></el-icon>
            <div class="metric-title">
              <span class="metric-name">{{ t('localMonitor.systemLoad') }}</span>
              <span class="metric-detail">{{ serverData.platform }} {{ serverData.arch }}</span>
            </div>
          </div>
          <div class="load-values">
            <div class="load-item">
              <span class="load-period">{{ t('localMonitor.minute1') }}</span>
              <span class="load-value">{{ serverData.system?.loadAverage?.load1 || 0 }}</span>
            </div>
            <div class="load-item">
              <span class="load-period">{{ t('localMonitor.minutes5') }}</span>
              <span class="load-value">{{ serverData.system?.loadAverage?.load5 || 0 }}</span>
            </div>
            <div class="load-item">
              <span class="load-period">{{ t('localMonitor.minutes15') }}</span>
              <span class="load-value">{{ serverData.system?.loadAverage?.load15 || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="server-footer">
        <span class="last-update">
          {{ t('localMonitor.lastUpdate') }}: {{ formatTime(serverData.timestamp) }}
        </span>
        <span class="node-version">
          {{ t('localMonitor.nodeVersion') }} {{ serverData.nodeVersion }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Refresh, Cpu, MostlyCloudy, FolderOpened, TrendCharts, Monitor, Timer, Connection } from '@element-plus/icons-vue'
import api from '../utils/axios'

const { t } = useI18n()

const loading = ref(false)
const autoRefresh = ref(true)
let refreshInterval = null

const serverData = reactive({
  serverName: 'API 管理服务器',
  host: 'localhost',
  status: 'online',
  cpu: { usage: 0, cores: 0 },
  memory: { used: 0, total: 0, usage: 0 },
  disk: { used: 0, total: 0, usage: 0 },
  system: { loadAverage: { load1: 0, load5: 0, load15: 0 } },
  uptime: 0,
  nodeVersion: '',
  platform: '',
  arch: '',
  timestamp: new Date()
})

// 获取本地监控数据
const fetchLocalMonitoring = async () => {
  try {
    loading.value = true
    const response = await api.get('/api/monitor/local')
    Object.assign(serverData, response.data.data)
  } catch (error) {
    console.error('获取本地监控数据失败:', error)
    ElMessage.error('获取本地监控数据失败')
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = async () => {
  await fetchLocalMonitoring()
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
    fetchLocalMonitoring()
  }, 15000) // 15秒刷新一次
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

// 格式化运行时间
const formatUptime = (seconds) => {
  if (!seconds) return '0秒'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  let result = []
  if (days > 0) result.push(`${days}天`)
  if (hours > 0) result.push(`${hours}小时`)
  if (minutes > 0) result.push(`${minutes}分钟`)
  
  return result.join(' ') || '0分钟'
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleTimeString()
}

onMounted(() => {
  fetchLocalMonitoring()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.local-monitor {
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
}

.server-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  background: var(--bg-primary, #f8fafc);
  border-radius: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-icon {
  width: 16px;
  height: 16px;
  color: var(--primary-color, #6366f1);
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: var(--text-muted, #64748b);
  margin-bottom: 2px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.metrics-container {
  display: grid;
  gap: 20px;
  margin-bottom: 24px;
}

.metric-card {
  padding: 20px;
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.metric-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.metric-icon {
  width: 20px;
  height: 20px;
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

.metric-title {
  flex: 1;
}

.metric-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.metric-cores,
.metric-detail {
  display: block;
  font-size: 12px;
  color: var(--text-muted, #64748b);
  margin-top: 2px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary, #0f172a);
}

.metric-progress {
  width: 100%;
}

.load-card .load-values {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.load-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--bg-primary, #f8fafc);
  border-radius: 8px;
}

.load-period {
  font-size: 11px;
  color: var(--text-muted, #64748b);
  margin-bottom: 4px;
}

.load-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.server-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.last-update,
.node-version {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .server-info {
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
  
  .server-footer {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>