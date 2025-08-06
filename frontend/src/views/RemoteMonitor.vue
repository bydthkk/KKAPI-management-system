<template>
  <div class="remote-monitor">
    <div class="page-header">
      <h2>远程服务器监控</h2>
      <div class="header-actions">
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
        >
          刷新全部
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="monitor-content">
      <div v-if="!servers.length" class="no-servers">
        <el-empty description="暂无服务器数据">
          <el-button type="primary" @click="$router.push('/servers')">
            添加服务器
          </el-button>
        </el-empty>
      </div>

      <div v-else class="servers-container">
        <div 
          v-for="server in servers" 
          :key="server.serverId"
          class="server-monitor-card"
          :class="{ 'offline': server.status === 'offline' }"
        >
          <!-- 服务器头部信息 -->
          <div class="server-header">
            <div class="server-basic-info">
              <div class="server-title-row">
                <div class="os-info" v-if="server.osName">
                  <img 
                    :src="`/icon/${server.osIcon || 'ubuntu'}.svg`" 
                    :alt="server.osName"
                    class="os-icon-svg"
                    @error="handleIconError"
                  />
                  <div class="os-details">
                    <span class="os-name">{{ server.osName }}</span>
                    <span v-if="server.osVersion" class="os-version">{{ server.osVersion }}</span>
                  </div>
                </div>
                <h3 class="server-name">{{ server.serverName }}</h3>
              </div>
              <div class="server-details">
                <span class="server-host">{{ server.host }}</span>
                <el-tag 
                  :type="server.status === 'online' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ server.status === 'online' ? '在线' : '离线' }}
                </el-tag>
              </div>
            </div>
            <div class="server-actions">
              <el-tooltip content="查看详情" placement="top">
                <el-button 
                  :icon="View" 
                  size="small" 
                  circle 
                  @click="viewDetails(server)"
                />
              </el-tooltip>
              <el-tooltip content="刷新数据" placement="top">
                <el-button 
                  :icon="Refresh" 
                  size="small" 
                  circle 
                  :loading="refreshingServers.has(server.serverId)"
                  @click="refreshServer(server.serverId)"
                />
              </el-tooltip>
            </div>
          </div>

          <!-- 监控指标 -->
          <div class="metrics-grid">
            <!-- CPU -->
            <div class="metric-item">
              <div class="metric-info">
                <el-icon class="metric-icon cpu"><Cpu /></el-icon>
                <div class="metric-details">
                  <span class="metric-label">CPU</span>
                  <span class="metric-value">{{ server.cpu?.usage || 0 }}%</span>
                </div>
              </div>
              <div class="metric-progress">
                <el-progress 
                  :percentage="server.cpu?.usage || 0"
                  :color="getProgressColor(server.cpu?.usage || 0)"
                  :stroke-width="6"
                  :show-text="false"
                />
                <span class="metric-detail">{{ server.cpu?.cores || 0 }} 核心</span>
              </div>
            </div>

            <!-- Memory -->
            <div class="metric-item">
              <div class="metric-info">
                <el-icon class="metric-icon memory"><MostlyCloudy /></el-icon>
                <div class="metric-details">
                  <span class="metric-label">内存</span>
                  <span class="metric-value">{{ server.memory?.usage || 0 }}%</span>
                </div>
              </div>
              <div class="metric-progress">
                <el-progress 
                  :percentage="server.memory?.usage || 0"
                  :color="getProgressColor(server.memory?.usage || 0)"
                  :stroke-width="6"
                  :show-text="false"
                />
                <span class="metric-detail">
                  {{ formatBytes(server.memory?.used * 1024 * 1024) }} / 
                  {{ formatBytes(server.memory?.total * 1024 * 1024) }}
                </span>
              </div>
            </div>

            <!-- Disk -->
            <div class="metric-item">
              <div class="metric-info">
                <el-icon class="metric-icon disk"><FolderOpened /></el-icon>
                <div class="metric-details">
                  <span class="metric-label">磁盘</span>
                  <span class="metric-value">{{ server.disk?.usage || 0 }}%</span>
                </div>
              </div>
              <div class="metric-progress">
                <el-progress 
                  :percentage="server.disk?.usage || 0"
                  :color="getProgressColor(server.disk?.usage || 0)"
                  :stroke-width="6"
                  :show-text="false"
                />
                <span class="metric-detail">
                  {{ server.disk?.used || 0 }}GB / {{ server.disk?.total || 0 }}GB
                </span>
              </div>
            </div>

            <!-- Network Speed (实时速度) - 放在磁盘右侧 -->
            <div class="metric-item">
              <div class="metric-info">
                <el-icon class="metric-icon speed"><Connection /></el-icon>
                <div class="metric-details">
                  <span class="metric-label">网络速度</span>
                </div>
              </div>
              <div class="network-speed-values">
                <div class="speed-item">
                  <span class="speed-label">下载</span>
                  <span class="speed-value">{{ formatSpeed(server.network?.rxSpeed || 0) }}</span>
                </div>
                <div class="speed-item">
                  <span class="speed-label">上传</span>
                  <span class="speed-value">{{ formatSpeed(server.network?.txSpeed || 0) }}</span>
                </div>
              </div>
            </div>

            <!-- Network Flow (累计流量) -->
            <div class="metric-item">
              <div class="metric-info">
                <el-icon class="metric-icon network"><Monitor /></el-icon>
                <div class="metric-details">
                  <span class="metric-label">网络流量</span>
                </div>
              </div>
              <div class="network-values">
                <div class="network-value-item">
                  <span class="network-direction">下载</span>
                  <span class="network-value">{{ server.network?.rxMB || 0 }} MB</span>
                </div>
                <div class="network-value-item">
                  <span class="network-direction">上传</span>
                  <span class="network-value">{{ server.network?.txMB || 0 }} MB</span>
                </div>
              </div>
            </div>

            <!-- Load Average -->
            <div class="metric-item">
              <div class="metric-info">
                <el-icon class="metric-icon load"><TrendCharts /></el-icon>
                <div class="metric-details">
                  <span class="metric-label">系统负载</span>
                </div>
              </div>
              <div class="load-values">
                <div class="load-item">
                  <span class="load-label">1分钟</span>
                  <span class="load-value">{{ server.load?.load1 || 0 }}</span>
                </div>
                <div class="load-item">
                  <span class="load-label">5分钟</span>
                  <span class="load-value">{{ server.load?.load5 || 0 }}</span>
                </div>
                <div class="load-item">
                  <span class="load-label">15分钟</span>
                  <span class="load-value">{{ server.load?.load15 || 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 服务器底部信息 -->
          <div class="server-footer">
            <span class="last-update">
              更新: {{ formatTime(server.timestamp) }}
            </span>
            <span v-if="server.error" class="error-info">
              错误: {{ server.error }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog 
      v-model="detailsVisible" 
      :title="`${selectedServer?.serverName} - 详细监控`"
      width="800px"
      @closed="selectedServer = null"
    >
      <div v-if="selectedServer" class="server-details-content">
        <!-- 这里可以添加更详细的监控数据 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="服务器名称">{{ selectedServer.serverName }}</el-descriptions-item>
          <el-descriptions-item label="主机地址">{{ selectedServer.host }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedServer.status === 'online' ? 'success' : 'danger'">
              {{ selectedServer.status === 'online' ? '在线' : '离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="CPU使用率">{{ selectedServer.cpu?.usage || 0 }}%</el-descriptions-item>
          <el-descriptions-item label="CPU核心数">{{ selectedServer.cpu?.cores || 0 }} 核心</el-descriptions-item>
          <el-descriptions-item label="内存使用率">{{ selectedServer.memory?.usage || 0 }}%</el-descriptions-item>
          <el-descriptions-item label="内存详情">
            {{ formatBytes(selectedServer.memory?.used * 1024 * 1024) }} / 
            {{ formatBytes(selectedServer.memory?.total * 1024 * 1024) }}
          </el-descriptions-item>
          <el-descriptions-item label="磁盘使用率">{{ selectedServer.disk?.usage || 0 }}%</el-descriptions-item>
          <el-descriptions-item label="磁盘详情">
            {{ selectedServer.disk?.used || 0 }}GB / {{ selectedServer.disk?.total || 0 }}GB
          </el-descriptions-item>
          <el-descriptions-item label="网络流量">
            下载: {{ selectedServer.network?.rxMB || 0 }} MB, 
            上传: {{ selectedServer.network?.txMB || 0 }} MB
          </el-descriptions-item>
          <el-descriptions-item label="实时速度">
            下载: {{ formatSpeed(selectedServer.network?.rxSpeed || 0) }}, 
            上传: {{ formatSpeed(selectedServer.network?.txSpeed || 0) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Cpu, MostlyCloudy, FolderOpened, Monitor, View, Connection, TrendCharts } from '@element-plus/icons-vue'
import api from '../utils/axios'

const loading = ref(false)
const autoRefresh = ref(true)
const detailsVisible = ref(false)
const selectedServer = ref(null)
const servers = ref([])
const refreshingServers = ref(new Set()) // 正在刷新的服务器ID
let refreshInterval = null

// 获取远程服务器监控数据
const fetchRemoteMonitoring = async (forceRefresh = false) => {
  try {
    loading.value = true
    
    // 添加时间戳参数防止缓存
    const params = forceRefresh ? { _t: Date.now() } : {}
    
    const response = await api.get('/api/monitor/servers', {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (response.data.success) {
      servers.value = response.data.data || []
      console.log('远程监控数据已更新:', servers.value.length, '个服务器')
    } else {
      throw new Error(response.data.message || '获取数据失败')
    }
  } catch (error) {
    console.error('获取远程监控数据失败:', error)
    ElMessage.error(`获取远程监控数据失败: ${error.message}`)
    // 不清空已有数据，避免闪烁
    if (!servers.value.length) {
      servers.value = []
    }
  } finally {
    loading.value = false
  }
}

// 刷新单个服务器数据
const refreshServer = async (serverId) => {
  try {
    refreshingServers.value.add(serverId)
    
    const response = await api.get(`/api/monitor/servers/${serverId}`, {
      params: { _t: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (response.data.success) {
      const updatedServer = response.data.data
      
      const index = servers.value.findIndex(s => s.serverId === serverId)
      if (index !== -1) {
        servers.value[index] = updatedServer
        console.log(`服务器 ${updatedServer.serverName} 数据已更新`)
      }
      
      ElMessage.success('服务器数据已刷新')
    } else {
      throw new Error(response.data.message || '刷新失败')
    }
  } catch (error) {
    console.error('刷新服务器数据失败:', error)
    ElMessage.error(`刷新服务器数据失败: ${error.message}`)
  } finally {
    refreshingServers.value.delete(serverId)
  }
}

// 刷新所有数据
const refreshData = async () => {
  console.log('手动刷新所有监控数据')
  await fetchRemoteMonitoring(true) // 强制刷新
}

// 查看服务器详情
const viewDetails = (server) => {
  selectedServer.value = server
  detailsVisible.value = true
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
  
  console.log('启动自动刷新，间隔30秒')
  refreshInterval = setInterval(() => {
    console.log('自动刷新监控数据...')
    fetchRemoteMonitoring(false) // 自动刷新不强制防缓存
  }, 30000) // 30秒刷新一次
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshInterval) {
    console.log('停止自动刷新')
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

// 格式化网络速度
const formatSpeed = (speed) => {
  if (!speed || speed === 0) return '0 KB/s'
  
  if (speed >= 1024) {
    return `${(speed / 1024).toFixed(1)} MB/s`
  }
  return `${speed} KB/s`
}

// 处理图标加载错误
const handleIconError = (event) => {
  // 如果图标加载失败，使用默认的 ubuntu 图标
  event.target.src = '/icon/ubuntu.svg'
}

onMounted(() => {
  console.log('RemoteMonitor 组件已挂载')
  fetchRemoteMonitoring(true) // 初始加载强制刷新
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  console.log('RemoteMonitor 组件即将卸载')
  stopAutoRefresh()
})
</script>

<style scoped>
.remote-monitor {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.monitor-content {
  min-height: 400px;
}

.no-servers {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.servers-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 24px;
}

.server-monitor-card {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.server-monitor-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.server-monitor-card.offline {
  opacity: 0.7;
  background: #f8f9fa;
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.server-basic-info {
  flex: 1;
}

.server-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.server-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

/* 操作系统图标样式 */
.os-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.os-icon-svg {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  object-fit: contain;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.os-icon-svg:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.os-details {
  display: flex;
  flex-direction: column;
}

.os-name {
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  line-height: 1.2;
}

.os-version {
  font-size: 10px;
  color: #64748b;
  line-height: 1.2;
}

.server-details {
  display: flex;
  align-items: center;
  gap: 12px;
}

.server-host {
  font-size: 14px;
  color: var(--text-muted, #64748b);
}

.server-actions {
  display: flex;
  gap: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.metric-item {
  padding: 16px;
  background: var(--bg-primary, #f8fafc);
  border-radius: 8px;
}

.metric-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.metric-icon {
  width: 18px;
  height: 18px;
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

.metric-icon.network {
  color: #8b5cf6;
}

.metric-icon.speed {
  color: #06b6d4;
}

.metric-icon.load {
  color: #f97316;
}

.metric-details {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #475569);
}

.metric-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.metric-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-detail {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}


.network-values {
  display: flex;
  justify-content: space-around;
  gap: 12px;
}

.network-value-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 8px;
  background: white;
  border-radius: 6px;
}

.network-direction {
  font-size: 11px;
  color: var(--text-muted, #64748b);
  margin-bottom: 2px;
}

.network-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

/* 网络速度样式 */
.network-speed-values {
  display: flex;
  justify-content: space-around;
  gap: 12px;
}

.speed-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 8px;
  background: white;
  border-radius: 6px;
}

.speed-label {
  font-size: 11px;
  color: var(--text-muted, #64748b);
  margin-bottom: 2px;
}

.speed-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

/* 系统负载样式 */
.load-values {
  display: flex;
  justify-content: space-around;
  gap: 8px;
}

.load-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 6px;
  background: white;
  border-radius: 4px;
}

.load-label {
  font-size: 10px;
  color: var(--text-muted, #64748b);
  margin-bottom: 2px;
}

.load-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.server-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.last-update,
.error-info {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

.error-info {
  color: var(--danger-color, #dc2626);
}

.server-details-content {
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .servers-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .remote-monitor {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: space-between;
  }
  
  .server-monitor-card {
    padding: 16px;
  }
  
  .server-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .network-item {
    grid-column: span 1;
  }
}
</style>