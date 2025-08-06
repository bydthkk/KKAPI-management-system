<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>服务器管理</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            添加服务器
          </el-button>
        </div>
      </template>

      <el-table :data="servers" style="width: 100%" v-loading="loading" element-loading-text="加载中...">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="系统" width="120">
          <template #default="scope">
            <div class="os-info" v-if="scope.row.osName">
              <img 
                :src="`/icon/${scope.row.osIcon || 'ubuntu'}.svg`" 
                :alt="scope.row.osName"
                class="os-icon-svg"
                @error="handleIconError"
              />
              <span class="os-name">{{ scope.row.osName }}</span>
            </div>
            <span v-else class="os-unknown">未检测</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="服务器名称" />
        <el-table-column prop="host" label="主机地址" />
        <el-table-column prop="port" label="端口" width="100" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag 
              :type="scope.row.status === 'online' ? 'success' : 
                     scope.row.status === 'testing' ? 'warning' : 'danger'"
            >
              {{ scope.row.status === 'online' ? '在线' : 
                 scope.row.status === 'offline' ? '离线' : 
                 scope.row.status === 'testing' ? '测试中' : '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column prop="lastTestTime" label="最后测试" width="160" />
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <div class="action-buttons-grid">
              <el-button size="small" @click="testConnection(scope.row)" :icon="Link">
                测试
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click="deleteServer(scope.row)"
                :icon="Delete"
              >
                删除
              </el-button>
              <el-button size="small" @click="editServer(scope.row)" :icon="Edit">
                编辑
              </el-button>
              <el-button 
                size="small" 
                type="success" 
                @click="openTerminal(scope.row)"
                :disabled="scope.row.status !== 'online'"
                :icon="Monitor"
              >
                终端
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态提示 -->
      <div v-if="!loading && servers.length === 0" class="empty-state">
        <el-empty description="暂无服务器">
          <el-button type="primary" @click="showAddDialog">添加第一台服务器</el-button>
        </el-empty>
      </div>
    </el-card>

    <!-- 添加/编辑服务器对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form
        ref="serverFormRef"
        :model="serverForm"
        :rules="serverRules"
        label-width="100px"
      >
        <el-form-item label="服务器名称" prop="name">
          <el-input v-model="serverForm.name" placeholder="请输入服务器名称" />
        </el-form-item>
        <el-form-item label="主机地址" prop="host">
          <el-input v-model="serverForm.host" placeholder="请输入主机地址" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number 
            v-model="serverForm.port" 
            :min="1" 
            :max="65535" 
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="serverForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="serverForm.password" 
            type="password" 
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input 
            v-model="serverForm.description" 
            type="textarea" 
            placeholder="请输入服务器描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveServer" :loading="saving">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 终端组件 -->
    <Terminal 
      v-model="terminalVisible"
      :server-id="currentServer.id"
      :server-name="currentServer.name"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Link, Monitor, Edit, Delete } from '@element-plus/icons-vue'
import api from '../utils/axios'
import Terminal from '../components/Terminal.vue'

const servers = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加服务器')
const serverFormRef = ref()
const saving = ref(false)
const editingId = ref(null)
const loading = ref(false)

// 终端相关状态
const terminalVisible = ref(false)
const currentServer = ref({ id: null, name: '' })

const serverForm = reactive({
  name: '',
  host: '',
  port: 22,
  username: '',
  password: '',
  description: ''
})

const serverRules = {
  name: [
    { required: true, message: '请输入服务器名称', trigger: 'blur' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

// 强制刷新服务器列表，绕过任何可能的缓存
const forceReloadServers = async () => {
  loading.value = true
  try {
    console.log('强制重新加载服务器列表...')
    
    // 清空当前数组
    servers.value = []
    
    // 添加随机参数防止缓存
    const timestamp = Date.now()
    const response = await api.get(`/api/servers?t=${timestamp}`)
    
    console.log('API响应:', response.data)
    
    if (response.data.success) {
      servers.value = response.data.data || []
      console.log(`加载了 ${servers.value.length} 个服务器`)
    } else {
      console.error('API返回失败状态:', response.data)
      servers.value = []
    }
  } catch (error) {
    console.error('强制重新加载失败:', error)
    servers.value = []
    if (error.response) {
      ElMessage.error(`加载失败: ${error.response.status} - ${error.response.data?.message || '未知错误'}`)
    } else {
      ElMessage.error('网络错误，无法加载服务器列表')
    }
  } finally {
    loading.value = false
  }
}

const loadServers = forceReloadServers

const showAddDialog = () => {
  dialogTitle.value = '添加服务器'
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

const editServer = (server) => {
  dialogTitle.value = '编辑服务器'
  editingId.value = server.id
  Object.assign(serverForm, {
    name: server.name,
    host: server.host,
    port: server.port,
    username: server.username,
    password: '', // 不显示原密码
    description: server.description || ''
  })
  dialogVisible.value = true
}

const resetForm = () => {
  Object.assign(serverForm, {
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    description: ''
  })
  if (serverFormRef.value) {
    serverFormRef.value.resetFields()
  }
}

const saveServer = async () => {
  if (!serverFormRef.value) return

  await serverFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        let response
        if (editingId.value) {
          response = await api.put(`/api/servers/${editingId.value}`, serverForm)
          ElMessage.success('服务器更新成功')
        } else {
          response = await api.post('/api/servers', serverForm)
          ElMessage.success('服务器添加成功')
        }
        dialogVisible.value = false
        
        // 强制重新加载服务器列表
        await forceReloadServers()
      } catch (error) {
        console.error('Save server error:', error)
        if (error.response?.data?.message) {
          ElMessage.error(error.response.data.message)
        } else if (error.response?.data?.errors) {
          ElMessage.error(error.response.data.errors.join(', '))
        } else {
          ElMessage.error('操作失败，请重试')
        }
      } finally {
        saving.value = false
      }
    }
  })
}

const testConnection = async (server) => {
  console.log('开始测试连接:', server)
  
  try {
    // 先更新状态为测试中
    const serverIndex = servers.value.findIndex(s => s.id === server.id)
    if (serverIndex !== -1) {
      servers.value[serverIndex] = {
        ...servers.value[serverIndex],
        status: 'testing'
      }
      console.log('设置服务器状态为测试中')
    }
    
    const response = await api.post(`/api/servers/${server.id}/test`)
    console.log('测试响应:', response.data)
    
    const testResult = response.data
    if (testResult.success) {
      ElMessage.success(testResult.message || '连接测试成功')
      
      // 如果后端返回了更新后的服务器信息，直接使用它
      if (testResult.data.server && serverIndex !== -1) {
        servers.value[serverIndex] = {
          ...servers.value[serverIndex],
          ...testResult.data.server
        }
        console.log('使用后端返回的服务器信息更新状态:', testResult.data.server.status)
      }
    } else {
      ElMessage.error(testResult.message || '连接测试失败')
      
      // 测试失败时也更新服务器信息
      if (testResult.data.server && serverIndex !== -1) {
        servers.value[serverIndex] = {
          ...servers.value[serverIndex],
          ...testResult.data.server
        }
        console.log('测试失败，使用后端返回的状态:', testResult.data.server.status)
      }
    }
    
    // 延迟强制刷新确保数据一致性
    setTimeout(async () => {
      console.log('延迟刷新服务器列表')
      await forceReloadServers()
    }, 1000)
    
  } catch (error) {
    console.error('测试连接错误:', error)
    ElMessage.error(error.response?.data?.message || '连接测试失败')
    
    // 测试失败后强制刷新状态
    setTimeout(async () => {
      await forceReloadServers()
    }, 1000)
  }
}

const openTerminal = (server) => {
  console.log('Opening terminal for server:', server)
  console.log('Server status:', server.status)
  
  if (server.status !== 'online') {
    ElMessage.warning(`服务器状态为"${server.status}"，无法打开终端`)
    return
  }
  
  currentServer.value = {
    id: server.id,
    name: server.name
  }
  terminalVisible.value = true
}

const deleteServer = async (server) => {
  console.log('开始删除服务器:', server)
  
  try {
    await ElMessageBox.confirm(
      `确定要删除服务器 "${server.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    console.log(`发送删除请求，服务器ID: ${server.id}`)
    
    try {
      // 绕过axios拦截器直接发送请求
      const response = await fetch(`/api/servers/${server.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      console.log('删除请求响应状态:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('删除响应数据:', data)
        
        if (data.success) {
          ElMessage.success(data.message || '服务器删除成功')
          console.log('删除成功，立即移除并重新加载')
          
          // 立即从数组中移除
          const index = servers.value.findIndex(s => s.id === server.id)
          if (index !== -1) {
            servers.value.splice(index, 1)
            console.log(`从数组中移除服务器，剩余: ${servers.value.length}`)
          }
          
          // 强制重新加载
          await forceReloadServers()
        } else {
          ElMessage.error(data.message || '删除失败')
          await forceReloadServers()
        }
      } else if (response.status === 404) {
        ElMessage.error('请求的资源不存在')
        console.log('服务器不存在(404)，从前端移除')
        
        // 如果服务器不存在，从前端移除
        const index = servers.value.findIndex(s => s.id === server.id)
        if (index !== -1) {
          servers.value.splice(index, 1)
          console.log(`因404移除服务器，剩余: ${servers.value.length}`)
        }
        
        await forceReloadServers()
      } else {
        const errorText = await response.text()
        console.error('删除请求失败:', response.status, errorText)
        ElMessage.error(`删除失败: HTTP ${response.status}`)
        await forceReloadServers()
      }
      
    } catch (fetchError) {
      console.error('发送删除请求时出错:', fetchError)
      ElMessage.error('删除请求发送失败')
      await forceReloadServers()
    }
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除过程出错:', error)
      await forceReloadServers()
    }
  }
}

const handleIconError = (event) => {
  // 如果图标加载失败，使用默认的 ubuntu 图标
  event.target.src = '/icon/ubuntu.svg'
}

onMounted(() => {
  loadServers()
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

/* 四宫格布局 - 2x2网格 */
.action-buttons-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  width: 100%;
  align-items: stretch;
}

.action-buttons-grid .el-button {
  width: 100%;
  min-width: unset;
  max-width: unset;
  padding: 6px 4px;
  font-size: 12px;
  border-radius: 6px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  align-self: stretch;
  line-height: 1;
}

.action-buttons-grid .el-button .el-icon {
  margin-right: 3px;
  font-size: 13px;
  flex-shrink: 0;
}

.action-buttons-grid .el-button span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-footer {
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

:deep(.el-button--success) {
  background: #059669;
  border: none;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-button--success:hover) {
  background: #047857;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(5, 150, 105, 0.4);
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

/* 表单样式 */
:deep(.el-form-item__label) {
  font-weight: 500;
  color: #2c3e50;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 180, 219, 0.15);
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-input-number) {
  border-radius: 8px;
}

/* Linux 发行版图标样式 */
.os-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.os-icon-svg {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: contain;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.os-icon-svg:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.os-name {
  font-size: 12px;
  font-weight: 500;
  color: #2c3e50;
}

.os-unknown {
  font-size: 12px;
  color: #999;
  font-style: italic;
}
</style>