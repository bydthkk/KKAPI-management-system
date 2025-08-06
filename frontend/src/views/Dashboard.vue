<template>
  <div class="dashboard-container" v-loading="loading">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon server">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                <el-icon class="inline-icon"><Monitor /></el-icon>
                {{ stats.servers }}
              </div>
              <div class="stat-label">{{ t('dashboard.serverCount') }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon task">
              <el-icon><List /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                <el-icon class="inline-icon"><List /></el-icon>
                {{ stats.tasks }}
              </div>
              <div class="stat-label">{{ t('dashboard.totalTasks') }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon success">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                <el-icon class="inline-icon"><Check /></el-icon>
                {{ stats.successTasks }}
              </div>
              <div class="stat-label">{{ t('dashboard.successTasks') }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon error">
              <el-icon><Close /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                <el-icon class="inline-icon"><Close /></el-icon>
                {{ stats.failedTasks }}
              </div>
              <div class="stat-label">{{ t('dashboard.failedTasks') }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('dashboard.recentTasks') }}</span>
            </div>
          </template>
          <div class="card-content">
            <el-table :data="recentTasks" style="width: 100%">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="server" :label="t('dashboard.server')" />
              <el-table-column prop="method" :label="t('dashboard.method')" />
              <el-table-column prop="status" :label="t('common.status')">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" :label="t('dashboard.time')" />
            </el-table>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('dashboard.systemStatus') }}</span>
            </div>
          </template>
          <div class="card-content">
            <div class="system-status">
              <div class="status-item">
                <span>{{ t('dashboard.apiStatus') }}:</span>
                <el-tag :type="systemStatus.api ? 'success' : 'danger'">
                  {{ systemStatus.api ? t('dashboard.online') : t('dashboard.offline') }}
                </el-tag>
              </div>
              <div class="status-item">
                <span>{{ t('dashboard.sshStatus') }}:</span>
                <el-tag :type="systemStatus.ssh ? 'success' : 'danger'">
                  {{ systemStatus.ssh ? t('dashboard.online') : t('dashboard.offline') }}
                </el-tag>
              </div>
              <div class="status-item">
                <span>{{ t('dashboard.queueStatus') }}:</span>
                <el-tag :type="systemStatus.queue ? 'success' : 'warning'">
                  {{ systemStatus.queue ? t('dashboard.idle') : t('dashboard.busy') }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 本地服务器监控区域 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <LocalMonitor />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { List, Check, Close, Monitor } from '@element-plus/icons-vue'
import api from '../utils/axios'
import LocalMonitor from '../components/LocalMonitor.vue'

const { t } = useI18n()

const loading = ref(true)

const stats = reactive({
  servers: 0,
  tasks: 0,
  successTasks: 0,
  failedTasks: 0
})

const recentTasks = ref([])

const systemStatus = reactive({
  api: true,
  ssh: true,
  queue: true
})

const getStatusType = (status) => {
  switch (status) {
    case 'success':
    case '成功': return 'success'
    case 'failed':
    case '失败': return 'danger'
    case 'running':
    case '运行中': return 'warning'
    default: return 'info'
  }
}

const loadDashboardData = async () => {
  loading.value = true
  try {
    // 并行加载所有数据
    const [statsResponse, tasksResponse, statusResponse] = await Promise.allSettled([
      api.get('/api/dashboard/stats'),
      api.get('/api/dashboard/recent-tasks'), 
      api.get('/api/dashboard/status')
    ])

    // 处理统计数据
    if (statsResponse.status === 'fulfilled') {
      Object.assign(stats, statsResponse.value.data.data)
    }

    // 处理最近任务
    if (tasksResponse.status === 'fulfilled') {
      recentTasks.value = tasksResponse.value.data.data
    }

    // 处理系统状态
    if (statusResponse.status === 'fulfilled') {
      Object.assign(systemStatus, statusResponse.value.data.data)
    }

    // 如果所有请求都失败，使用模拟数据
    if (statsResponse.status === 'rejected' && 
        tasksResponse.status === 'rejected' && 
        statusResponse.status === 'rejected') {
      
      console.warn('所有API请求失败，使用模拟数据')
      
      // 使用模拟数据
      Object.assign(stats, {
        servers: 1,
        tasks: 12,
        successTasks: 8,
        failedTasks: 2
      })

      recentTasks.value = [
        { id: 1, server: '示例服务器', method: 'jj', status: '成功', createTime: new Date().toLocaleString() },
        { id: 2, server: '示例服务器', method: 'mm', status: '失败', createTime: new Date().toLocaleString() },
        { id: 3, server: '示例服务器', method: 'jj', status: '等待中', createTime: new Date().toLocaleString() }
      ]

      Object.assign(systemStatus, {
        api: true,
        ssh: false,
        queue: true
      })
    }
  } catch (error) {
    console.error('加载仪表板数据异常:', error)
    ElMessage.warning('数据加载失败，显示默认数据')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard-container {
  height: 100%;
  overflow-y: auto;
}

.stat-card {
  margin-bottom: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 28px;
  color: white;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.stat-icon.server {
  background: #6366f1;
}

.stat-icon.task {
  background: #64748b;
}

.stat-icon.success {
  background: #059669;
}

.stat-icon.error {
  background: #dc2626;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-number .inline-icon {
  font-size: 24px;
}

/* 不同状态的内联图标颜色 */
.stat-item .stat-content .stat-number .inline-icon {
  color: #6366f1; /* 默认颜色 */
}

.stat-icon.server + .stat-content .stat-number .inline-icon {
  color: #6366f1; /* 服务器 - 靛蓝 */
}

.stat-icon.task + .stat-content .stat-number .inline-icon {
  color: #64748b; /* 任务 - 中性灰 */
}

.stat-icon.success + .stat-content .stat-number .inline-icon {
  color: #059669; /* 成功 - 绿色 */
}

.stat-icon.error + .stat-content .stat-number .inline-icon {
  color: #dc2626; /* 失败 - 红色 */
}

.stat-label {
  font-size: 16px;
  color: #606266;
  font-weight: 500;
}

.el-card {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 仪表盘卡片统一高度 */
.dashboard-card {
  height: 400px;
  display: flex;
  flex-direction: column;
}

.dashboard-card .el-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
}

.card-content {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.system-status {
  padding: 20px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.status-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.status-item span {
  font-size: 15px;
  font-weight: 500;
  color: #475569;
}
</style>