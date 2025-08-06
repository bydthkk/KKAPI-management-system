<template>
  <div class="system-settings">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <el-icon class="header-icon" size="28"><Setting /></el-icon>
          <div>
            <h1>系统设置</h1>
            <p>管理系统配置、安全和个性化选项</p>
          </div>
        </div>
        <div class="header-actions">
          <el-button 
            v-if="isAdmin"
            type="success" 
            @click="saveSettings"
            :loading="loading"
            :disabled="!hasChanges"
          >
            <el-icon><Document /></el-icon>
            保存设置
          </el-button>
          <el-button 
            v-if="isAdmin"
            type="warning" 
            plain
            @click="resetToDefaults"
            :loading="resetting"
          >
            <el-icon><RefreshLeft /></el-icon>
            恢复默认
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 侧边导航菜单 -->
      <div class="sidebar">
        <div class="nav-menu">
          <div 
            v-for="tab in tabList" 
            :key="tab.name"
            :class="['menu-item', { 'active': activeTab === tab.name }]"
            @click="activeTab = tab.name"
          >
            <div class="menu-icon" :class="tab.iconClass">
              <el-icon :size="18">
                <component :is="tab.icon" />
              </el-icon>
            </div>
            <span class="menu-label">{{ tab.label }}</span>
            <div v-if="activeTab === tab.name" class="active-indicator"></div>
          </div>
        </div>
      </div>

      <!-- 设置内容区域 -->
      <div class="content-area">
        <el-card class="settings-card">
          <!-- 常规设置 -->
          <div v-show="activeTab === 'general'" v-loading="loading">
            <div class="section-title">
              <el-icon size="20"><Setting /></el-icon>
              <span>常规设置</span>
            </div>
            
            <div class="form-section">
              <div class="form-item" v-if="settings.general?.system_title">
                <label>系统标题</label>
                <el-input 
                  v-model="settings.general.system_title.value"
                  @change="markAsChanged"
                  placeholder="请输入系统标题"
                  :disabled="!isAdmin"
                />
                <div class="description">{{ settings.general.system_title.description }}</div>
              </div>
              
              <div class="form-item" v-if="settings.general?.backend_title">
                <label>后台管理标题</label>
                <el-input 
                  v-model="settings.general.backend_title.value"
                  @change="markAsChanged"
                  placeholder="请输入后台管理系统标题"
                  :disabled="!isAdmin"
                />
                <div class="description">{{ settings.general.backend_title.description }}</div>
              </div>
              
              <div class="form-item" v-if="settings.general?.system_subtitle">
                <label>系统副标题</label>
                <el-input 
                  v-model="settings.general.system_subtitle.value"
                  @change="markAsChanged"
                  placeholder="请输入系统副标题"
                  :disabled="!isAdmin"
                />
                <div class="description">{{ settings.general.system_subtitle.description }}</div>
              </div>
              
              <div class="form-item" v-if="settings.general?.enable_notifications">
                <label>启用通知</label>
                <el-switch 
                  v-model="settings.general.enable_notifications.value"
                  @change="markAsChanged"
                  :disabled="!isAdmin"
                />
                <div class="description">{{ settings.general.enable_notifications.description }}</div>
              </div>
            </div>
          </div>

          <!-- 外观设置已移除，保持系统简洁 -->

          <!-- 安全设置 -->
          <div v-show="activeTab === 'security'" v-loading="loading">
            <div class="section-title">
              <el-icon size="20"><Lock /></el-icon>
              <span>安全设置</span>
            </div>
            
            <div class="form-section">
              <div class="subsection-title">登录安全</div>
              
              <div class="form-item" v-if="settings.security?.session_timeout">
                <label>会话超时时间</label>
                <div class="input-with-unit">
                  <el-input-number 
                    v-model="settings.security.session_timeout.value"
                    :min="5"
                    :max="1440"
                    @change="markAsChanged"
                    :disabled="!isAdmin"
                  />
                  <span class="unit">分钟</span>
                </div>
                <div class="description">{{ settings.security.session_timeout.description }}</div>
              </div>
              
              <div class="form-item" v-if="settings.security?.max_login_attempts">
                <label>最大登录尝试次数</label>
                <div class="input-with-unit">
                  <el-input-number 
                    v-model="settings.security.max_login_attempts.value"
                    :min="3"
                    :max="10"
                    @change="markAsChanged"
                    :disabled="!isAdmin"
                  />
                  <span class="unit">次</span>
                </div>
                <div class="description">{{ settings.security.max_login_attempts.description }}</div>
              </div>
            </div>

            <!-- 密码管理 -->
            <div class="form-section" v-if="isAdmin">
              <div class="subsection-title">密码管理</div>
              <el-form :model="passwordForm" ref="passwordFormRef" class="password-form">
                <el-form-item 
                  label="当前密码" 
                  prop="currentPassword"
                  :rules="[{ required: true, message: '请输入当前密码' }]"
                >
                  <el-input 
                    v-model="passwordForm.currentPassword"
                    type="password"
                    show-password
                  />
                </el-form-item>
                
                <el-form-item 
                  label="新密码" 
                  prop="newPassword"
                  :rules="[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码长度不能少于6位' }
                  ]"
                >
                  <el-input 
                    v-model="passwordForm.newPassword"
                    type="password"
                    show-password
                  />
                </el-form-item>
                
                <el-form-item 
                  label="确认新密码" 
                  prop="confirmPassword"
                  :rules="[
                    { required: true, message: '请确认新密码' },
                    { validator: validatePasswordConfirm }
                  ]"
                >
                  <el-input 
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    show-password
                  />
                </el-form-item>
                
                <el-form-item>
                  <el-button 
                    type="primary" 
                    @click="changePassword"
                    :loading="changingPassword"
                  >
                    <el-icon><Lock /></el-icon>
                    修改密码
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
            <el-alert v-if="!isAdmin" title="只有管理员可以修改系统设置" type="warning" :closable="false" style="margin-top: 24px" />
          </div>

          <!-- 日志设置 -->
          <div v-show="activeTab === 'logging'" v-loading="loading">
            <div class="section-title">
              <el-icon size="20"><Files /></el-icon>
              <span>日志设置</span>
            </div>
            
            <div class="form-section">
              <div class="form-item" v-if="settings.logging?.log_level">
                <label>日志级别</label>
                <el-select 
                  v-model="settings.logging.log_level.value"
                  @change="markAsChanged"
                  :disabled="!isAdmin"
                >
                  <el-option label="错误 (Error)" value="error" />
                  <el-option label="警告 (Warn)" value="warn" />
                  <el-option label="信息 (Info)" value="info" />
                  <el-option label="调试 (Debug)" value="debug" />
                </el-select>
                <div class="description">{{ settings.logging.log_level.description }}</div>
              </div>
              
              <div class="form-item" v-if="settings.logging?.max_log_files">
                <label>最大日志文件数</label>
                <div class="input-with-unit">
                  <el-input-number 
                    v-model="settings.logging.max_log_files.value"
                    :min="1"
                    :max="50"
                    @change="markAsChanged"
                    :disabled="!isAdmin"
                  />
                  <span class="unit">个</span>
                </div>
                <div class="description">{{ settings.logging.max_log_files.description }}</div>
              </div>
            </div>
          </div>

          <!-- 维护设置 -->
          <div v-show="activeTab === 'maintenance'" v-loading="loading">
            <div class="section-title">
              <el-icon size="20"><Tools /></el-icon>
              <span>维护设置</span>
            </div>
            
            <div class="form-section">
              <div class="form-item" v-if="settings.maintenance?.backup_enabled">
                <label>启用自动备份</label>
                <el-switch 
                  v-model="settings.maintenance.backup_enabled.value"
                  @change="markAsChanged"
                  :disabled="!isAdmin"
                />
                <div class="description">{{ settings.maintenance.backup_enabled.description }}</div>
              </div>
              
              <div class="form-item" 
                v-if="settings.maintenance?.backup_enabled?.value && settings.maintenance?.backup_interval"
              >
                <label>备份间隔时间</label>
                <div class="input-with-unit">
                  <el-input-number 
                    v-model="settings.maintenance.backup_interval.value"
                    :min="1"
                    :max="168"
                    @change="markAsChanged"
                    :disabled="!isAdmin"
                  />
                  <span class="unit">小时</span>
                </div>
                <div class="description">{{ settings.maintenance.backup_interval.description }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Document, 
  RefreshLeft, 
  Lock, 
  Setting,
  Files,
  Tools
} from '@element-plus/icons-vue'
import { useUserStore } from '../store/user'
import api from '../utils/axios'

const userStore = useUserStore()

// 检查是否为管理员
const isAdmin = computed(() => userStore.user.role === 'admin')

// 菜单配置 - 美化的图标和颜色
const tabList = [
  { 
    name: 'general', 
    label: '常规设置', 
    icon: Setting,
    iconClass: 'icon-general'
  },
  { 
    name: 'security', 
    label: '安全设置', 
    icon: Lock,
    iconClass: 'icon-security'
  },
  { 
    name: 'logging', 
    label: '日志设置', 
    icon: Files,
    iconClass: 'icon-logging'
  },
  { 
    name: 'maintenance', 
    label: '维护设置', 
    icon: Tools,
    iconClass: 'icon-maintenance'
  }
]

// 响应式数据
const activeTab = ref('general')
const loading = ref(false)
const resetting = ref(false)
const changingPassword = ref(false)
const hasChanges = ref(false)
const passwordFormRef = ref()

// 设置数据
const settings = reactive({
  general: {},
  security: {},
  logging: {},
  maintenance: {}
})

// 密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 验证确认密码
const validatePasswordConfirm = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 标记为已修改
const markAsChanged = () => {
  hasChanges.value = true
}

// 获取系统设置
const fetchSettings = async () => {
  try {
    loading.value = true
    const response = await api.get('/api/system-settings')
    
    if (response.data.success) {
      Object.assign(settings, response.data.data)
      hasChanges.value = false
    } else {
      ElMessage.error('获取设置失败: ' + response.data.message)
    }
  } catch (error) {
    console.error('获取设置失败:', error)
    ElMessage.error('获取设置失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 保存设置
const saveSettings = async () => {
  try {
    loading.value = true
    const response = await api.put('/api/system-settings', {
      settings: settings
    })
    
    if (response.data.success) {
      ElMessage.success('设置保存成功')
      hasChanges.value = false
    } else {
      ElMessage.error('保存设置失败: ' + response.data.message)
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存设置失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 恢复默认设置
const resetToDefaults = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将恢复所有设置为默认值，是否继续？',
      '确认恢复默认设置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    resetting.value = true
    const response = await api.post('/api/system-settings/reset-defaults')
    
    if (response.data.success) {
      ElMessage.success('已恢复默认设置')
      await fetchSettings()
    } else {
      ElMessage.error('恢复默认设置失败: ' + response.data.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复默认设置失败:', error)
      ElMessage.error('恢复默认设置失败: ' + error.message)
    }
  } finally {
    resetting.value = false
  }
}

// 修改密码
const changePassword = async () => {
  if (!passwordFormRef.value) return
  
  try {
    await passwordFormRef.value.validate()
    
    changingPassword.value = true
    const response = await api.post('/api/system-settings/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    
    if (response.data.success) {
      ElMessage.success('密码修改成功')
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      passwordFormRef.value.resetFields()
    } else {
      ElMessage.error('密码修改失败: ' + response.data.message)
    }
  } catch (error) {
    if (error.message) {
      console.error('密码修改失败:', error)
      ElMessage.error('密码修改失败: ' + error.message)
    }
  } finally {
    changingPassword.value = false
  }
}

// 组件挂载
onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.system-settings {
  min-height: 100vh;
  background: #f5f7fa;
  transition: all 0.3s ease;
}

/* 页面头部 */
.page-header {
  background: white;
  padding: 24px 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  color: #409eff;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-left p {
  margin: 4px 0 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 主内容区域 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
}

/* 侧边导航 */
.sidebar {
  position: sticky;
  top: 24px;
  height: fit-content;
}

.nav-menu {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin: 4px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #606266;
}

.menu-item:hover {
  background: #f0f9ff;
  color: #409eff;
  transform: translateX(4px);
}

.menu-item.active {
  background: linear-gradient(135deg, #409eff, #79bbff);
  color: white;
  transform: translateX(6px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

/* 不同图标的颜色 */
.icon-general { background: rgba(64, 158, 255, 0.1); }
.icon-appearance { background: rgba(103, 194, 58, 0.1); }
.icon-security { background: rgba(245, 108, 108, 0.1); }
.icon-logging { background: rgba(230, 162, 60, 0.1); }
.icon-maintenance { background: rgba(144, 147, 153, 0.1); }

.menu-item.active .menu-icon {
  background: rgba(255, 255, 255, 0.2);
}

.menu-label {
  font-weight: 500;
  font-size: 14px;
}

.active-indicator {
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #409eff;
  border-radius: 2px;
}

/* 内容区域 */
.content-area {
  min-height: 600px;
}

.settings-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
  color: #303133;
}

.form-section {
  margin-bottom: 32px;
}

.form-item {
  margin-bottom: 24px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}

.description {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 16px;
  color: #409eff;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit {
  font-size: 14px;
  color: #909399;
  background: #f5f7fa;
  padding: 6px 12px;
  border-radius: 4px;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-text {
  font-family: monospace;
  font-size: 14px;
  color: #909399;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.password-form {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-card__body) {
  padding: 24px;
}

:deep(.el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-button) {
  border-radius: 6px;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: #409eff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    padding: 0 16px;
  }
  
  .sidebar {
    position: static;
  }
  
  .nav-menu {
    display: flex;
    overflow-x: auto;
    gap: 8px;
    padding: 12px;
  }
  
  .menu-item {
    flex-shrink: 0;
    white-space: nowrap;
  }
  
  .page-header {
    padding: 16px 20px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
}
</style>